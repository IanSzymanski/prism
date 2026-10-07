#!/usr/bin/env node
// Packages: a named set of outputs laid out from one approved content.md (a case study package: two posts, a story,
// a blog post, a deck, a one-pager, the full PDF and an email). Core packages are in packages.json; a brand profile's
// `packages` adds its own or replaces one by id (null removes it). Each output is its own format file, formats/<id>.md.
// Usage: packages.js [list] [--brand B] [--json]
//        packages.js show <id> [--brand B] [--json]
//        packages.js use <project> <id> [--brand B] [--drop a,b] [--add id:format] [--set output.key=value]...
//        packages.js check <project> [--built]      (format files, post and story counts; --built adds PDF page counts)
//        packages.js claims <project> [--json]      (every output's numbers against content.md, and which outputs carry each claim)
//        packages.js zip <project> [OUT.zip]        (every built file of every output in one zip, one folder per output)
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { defaultBrand, brandDir } = require("./resolve.js");
const { tagFor } = require("./naming.js");
const { numbers } = require("./check-numbers.js");

const KIT = __dirname;
const FORMATS = ["sheet", "brochure", "deck", "social", "email", "html-email", "carousel", "blog"];
// Which counts each format can take; folder builds write into out/<output id>/.
const COUNTS = { posts: ["social", "email"], stories: ["social"], pages: ["sheet", "brochure"], min_pages: ["sheet", "brochure"], max_pages: ["sheet", "brochure"] };
const FOLDER = new Set(["social", "email", "carousel", "blog", "html-email"]);
const EXT = { sheet: ".pdf", brochure: ".pdf", deck: ".pptx" };

const die = m => { console.error(m); process.exit(2); };
const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); return i >= 0 ? (args.splice(i, 1), true) : false; };
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const opts = k => { const out = []; let i; while ((i = args.indexOf(k)) >= 0) out.push(args.splice(i, 2)[1]); return out; };

function validate(id, p) {
  const e = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) e.push(`package id "${id}" must be kebab-case`);
  if (!p.name) e.push(`${id}: no name`);
  if (!Array.isArray(p.outputs) || !p.outputs.length) { e.push(`${id}: no outputs`); return e; }
  const seen = new Set();
  for (const o of p.outputs) {
    if (!o.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(o.id)) e.push(`${id}: output id "${o.id}" must be kebab-case`);
    if (seen.has(o.id)) e.push(`${id}: output "${o.id}" appears twice`); seen.add(o.id);
    if (!FORMATS.includes(o.format)) e.push(`${id}.${o.id}: format "${o.format}" is not one of ${FORMATS.join(", ")}`);
    for (const k of Object.keys(COUNTS)) if (o[k] != null) {
      if (!COUNTS[k].includes(o.format)) e.push(`${id}.${o.id}: ${k} doesn't apply to ${o.format}`);
      if (!Number.isInteger(o[k]) || o[k] < (k === "posts" || k === "stories" ? 0 : 1)) e.push(`${id}.${o.id}: ${k} must be a whole number`);
    }
    if (o.format === "social" && !(o.posts || o.stories)) e.push(`${id}.${o.id}: a social output needs posts or stories`);
    if (o.pages != null && (o.min_pages != null || o.max_pages != null)) e.push(`${id}.${o.id}: pages, or min_pages/max_pages, not both`);
  }
  return e;
}

// Core packages, then the brand's: added, replaced by id, or removed with null.
function load(brand) {
  const core = JSON.parse(fs.readFileSync(path.join(KIT, "packages.json"), "utf8")).packages;
  const all = Object.fromEntries(Object.entries(core).map(([k, v]) => [k, { ...v, from: "core" }]));
  if (brand) {
    const pf = path.join(brandDir(brand).dir, "profile.json"); if (!fs.existsSync(pf)) die(`no brand "${brand}"`);
    const prof = JSON.parse(fs.readFileSync(pf, "utf8"));
    for (const [k, v] of Object.entries(prof.packages || {})) { if (v === null) delete all[k]; else all[k] = { ...v, from: brand }; }
  }
  const errs = Object.entries(all).flatMap(([k, v]) => validate(k, v));
  if (errs.length) die(errs.map(x => "[packages] " + x).join("\n"));
  return all;
}

const front = md => { const m = /^---\n([\s\S]*?)\n---/.exec(md); return m ? m[1] : ""; };
const fmKey = (md, k) => { const m = new RegExp(`^${k}:\\s*(.+)$`, "m").exec(front(md)); return m ? m[1].trim().replace(/^["']|["']$/g, "") : null; };
function project(p) {
  const proj = path.resolve(p || ""); if (!fs.existsSync(path.join(proj, "content.md"))) die(`no content.md in ${proj}`);
  return proj;
}
const brandOf = proj => opt("--brand") || (proj && fmKey(fs.readFileSync(path.join(proj, "content.md"), "utf8"), "brand")) || defaultBrand();
function piecePackage(proj) {
  const f = path.join(proj, "package.json");
  if (!fs.existsSync(f)) die(`no package.json in ${proj}: run packages.js use ${path.basename(proj)} <package>`);
  return JSON.parse(fs.readFileSync(f, "utf8"));
}
const counts = o => [o.posts != null && `${o.posts} post${o.posts === 1 ? "" : "s"}`, o.stories != null && `${o.stories} stor${o.stories === 1 ? "y" : "ies"}`,
  o.pages != null && `${o.pages} page${o.pages === 1 ? "" : "s"}`, o.min_pages != null && `${o.min_pages}+ pages`, o.max_pages != null && `at most ${o.max_pages} pages`].filter(Boolean).join(", ");
const line = o => `${o.id} (${o.format}${counts(o) ? ", " + counts(o) : ""})`;

// Social posts and stories in a format file, by their :::: fences (carousel panels are not counted).
function socialCounts(md) {
  let posts = 0, stories = 0;
  for (const m of md.matchAll(/^:{3,}\s*\{([^}]*)\}/gm)) {
    const cls = m[1].split(/\s+/);
    if (!cls.includes(".post") || insideCarousel(md, m.index)) continue;
    if (cls.includes(".story")) stories++; else posts++;
  }
  return { posts, stories };
}
function insideCarousel(md, at) {
  let depth = [];
  for (const m of md.slice(0, at).matchAll(/^(:{3,})\s*(\{[^}]*\}|\S+)?\s*$/gm)) {
    if (m[2]) depth.push({ fence: m[1].length, carousel: /\.carousel\b/.test(m[2]) });
    else { const i = depth.map(d => d.fence).lastIndexOf(m[1].length); if (i >= 0) depth.splice(i); }
  }
  return depth.some(d => d.carousel);
}
const pdfPages = f => (fs.readFileSync(f, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;

// The files an output's build wrote: out/<tag>.<ext> for PDFs and decks, everything tagged in out/<id>/ for folder builds.
function built(proj, o) {
  const fmt = path.join(proj, "formats", o.id + ".md"), out = path.join(proj, "out");
  // Blog and email builds name files from their front matter too (a blog post's slug), so the tag is worked out the same way.
  const md = fs.existsSync(fmt) ? fs.readFileSync(fmt, "utf8") : "", meta = {};
  if (o.format === "blog" || o.format === "html-email") for (const k of ["slug", "output", "version", "title"]) { const v = fmKey(md, k); if (v) meta[k] = v; }
  const tag = tagFor(fmt, meta);
  if (!FOLDER.has(o.format)) { const f = path.join(out, tag + EXT[o.format]); return fs.existsSync(f) ? [f] : []; }
  const dir = path.join(out, o.id), files = [];
  const walk = d => { for (const n of fs.existsSync(d) ? fs.readdirSync(d).sort() : []) { const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) { if (n !== "_guides") walk(p); } else if (n.startsWith(tag)) files.push(p); } };
  walk(dir);
  return files;
}

const cmd = ["list", "show", "use", "check", "claims", "zip"].includes(args[0]) ? args.shift() : "list";
const json = flag("--json");

if (cmd === "list") {
  const all = load(opt("--brand") || defaultBrand());
  if (json) { console.log(JSON.stringify(all, null, 1)); process.exit(0); }
  for (const [k, p] of Object.entries(all)) console.log(`${k}: ${p.name}${p.from !== "core" ? ` (${p.from})` : ""} · ${p.outputs.map(line).join(", ")}\n  ${p.use || ""}`);
}

else if (cmd === "show") {
  const id = args[0] || die("usage: packages.js show <id>"), all = load(opt("--brand") || defaultBrand()), p = all[id];
  if (!p) die(`no package "${id}"; packages: ${Object.keys(all).join(", ")}`);
  if (json) { console.log(JSON.stringify({ id, ...p }, null, 1)); process.exit(0); }
  console.log(`${id}: ${p.name}\n${p.use || ""}\npiece: ${p.piece || "-"} · length: ${p.length || "-"}`);
  for (const o of p.outputs) console.log(`- ${line(o)}: ${o.brief || ""}`);
}

else if (cmd === "use") {
  const drop = opts("--drop").flatMap(x => x.split(",")), add = opts("--add"), sets = opts("--set");
  const proj = project(args[0]), id = args[1] || die("usage: packages.js use <project> <id>"), brand = brandOf(proj), all = load(brand), base = all[id];
  if (!base) die(`no package "${id}"; packages: ${Object.keys(all).join(", ")}`);
  const outputs = base.outputs.map(o => ({ ...o })), changes = [];
  for (const d of drop) { const i = outputs.findIndex(o => o.id === d); if (i < 0) die(`no output "${d}" in ${id}`); outputs.splice(i, 1); changes.push(`dropped ${d}`); }
  for (const a of add) { const [oid, format = oid] = a.split(":"); outputs.push({ id: oid, format }); changes.push(`added ${oid} (${format})`); }
  for (const s of sets) {
    const m = /^([\w-]+)\.(\w+)=(.*)$/.exec(s) || die(`--set wants output.key=value, got ${s}`), o = outputs.find(x => x.id === m[1]) || die(`no output "${m[1]}" in ${id}`);
    const v = /^\d+$/.test(m[3]) ? parseInt(m[3], 10) : m[3] === "" ? undefined : m[3];
    if (m[2] === "pages") { delete o.min_pages; delete o.max_pages; } if (/_pages$/.test(m[2])) delete o.pages;
    if (v === undefined) delete o[m[2]]; else o[m[2]] = v; changes.push(`${m[1]}.${m[2]} = ${m[3] || "(removed)"}`);
  }
  const errs = validate(id, { ...base, outputs }); if (errs.length) die(errs.map(x => "[packages] " + x).join("\n"));
  const rec = { package: id, name: base.name, brand, from: base.from, piece: base.piece || null, length: base.length || null, outputs, changes };
  fs.writeFileSync(path.join(proj, "package.json"), JSON.stringify(rec, null, 1) + "\n");
  console.log(`package.json written: ${base.name}${changes.length ? ` (${changes.join("; ")})` : ""}`);
  for (const o of outputs) console.log(`- ${line(o)}`);
  console.log(`content.md front matter:\npackage: ${id}\nexports: [${outputs.map(o => o.id).join(", ")}]`);
}

else if (cmd === "check") {
  const withBuilt = flag("--built"), proj = project(args[0]), pkg = piecePackage(proj), problems = [];
  for (const o of pkg.outputs) {
    const f = path.join(proj, "formats", o.id + ".md");
    if (!fs.existsSync(f)) { problems.push(`${o.id}: formats/${o.id}.md is missing`); continue; }
    const md = fs.readFileSync(f, "utf8"), layout = fmKey(md, "layout");
    if (o.format === "html-email" && layout !== "email") problems.push(`${o.id}: an html-email format file needs layout: email`);
    if (o.format === "brochure" && layout !== "brochure") problems.push(`${o.id}: a brochure format file needs layout: brochure`);
    if (o.format === "sheet" && layout) problems.push(`${o.id}: a sheet has no layout: (found ${layout})`);
    if (o.format === "deck" && !/^:{3,}\s*\{[^}]*\.slide\b/m.test(md)) problems.push(`${o.id}: no slides`);
    if (COUNTS.posts.includes(o.format)) {
      const c = socialCounts(md), want = { posts: o.posts || 0, stories: o.stories || 0 };
      for (const k of ["posts", "stories"]) if (c[k] !== want[k]) problems.push(`${o.id}: ${c[k]} ${k}, the package asks for ${want[k]}`);
    }
    if (withBuilt) {
      const files = built(proj, o);
      if (!files.length) { problems.push(`${o.id}: not built yet`); continue; }
      if (EXT[o.format] === ".pdf") { const n = pdfPages(files[0]);
        if (o.pages != null && n !== o.pages) problems.push(`${o.id}: ${n} pages, the package asks for ${o.pages}`);
        if (o.min_pages != null && n < o.min_pages) problems.push(`${o.id}: ${n} page${n === 1 ? "" : "s"}, the package asks for at least ${o.min_pages}`);
        if (o.max_pages != null && n > o.max_pages) problems.push(`${o.id}: ${n} pages, the package asks for at most ${o.max_pages}`); }
    }
  }
  for (const p of problems) console.log("[package] " + p);
  console.log(problems.length ? `CHECK: ${problems.length} problem(s) in ${pkg.name}` : `OK: ${pkg.name}, ${pkg.outputs.length} outputs match the package${withBuilt ? " and are built" : ""}`);
  process.exit(problems.length ? 1 : 0);
}

else if (cmd === "claims") {
  // Every output may carry only approved claims: a number in one output that content.md doesn't have is a claim the
  // others don't make. The table says which outputs carry each claims.md row (by its numbers), so a change to one claim
  // can be followed into every output that states it.
  const proj = project(args[0]), pkg = piecePackage(proj), content = fs.readFileSync(path.join(proj, "content.md"), "utf8");
  const known = numbers(content), outs = {}, strays = {};
  for (const o of pkg.outputs) {
    const f = path.join(proj, "formats", o.id + ".md"); if (!fs.existsSync(f)) continue;
    outs[o.id] = numbers(fs.readFileSync(f, "utf8"));
    const s = [...outs[o.id]].filter(n => !known.has(n)); if (s.length) strays[o.id] = s;
  }
  const cf = path.join(proj, "claims.md"), rows = [];
  if (fs.existsSync(cf)) for (const l of fs.readFileSync(cf, "utf8").split("\n")) {
    const c = l.split("|").map(x => x.trim()); if (c.length < 5 || !/^\d+$/.test(c[1])) continue;
    const nums = [...numbers(c[2])];
    rows.push({ n: +c[1], claim: c[2], status: c[4] || "", numbers: nums, in: nums.length ? Object.keys(outs).filter(k => nums.every(x => outs[k].has(x))) : null });
  }
  if (json) { console.log(JSON.stringify({ strays, claims: rows }, null, 1)); process.exit(Object.keys(strays).length ? 1 : 0); }
  for (const [k, s] of Object.entries(strays)) console.log(`[claims] ${k}: ${s.join(", ")} not in content.md: a claim only this output makes`);
  for (const r of rows) console.log(`${r.n}. ${r.claim.slice(0, 70)}${r.claim.length > 70 ? "…" : ""}  ->  ${r.in === null ? "no number: read each output" : r.in.length ? r.in.join(", ") : "in no output"}`);
  const n = Object.keys(strays).length;
  console.log(n ? `CHECK: ${n} output(s) claim what content.md doesn't` : `OK: every output's numbers are in content.md`);
  process.exit(n ? 1 : 0);
}

else if (cmd === "zip") {
  const proj = project(args[0]), pkg = piecePackage(proj);
  const tag = tagFor(path.join(proj, "formats", pkg.package + ".md"), { output: pkg.package });
  const out = path.resolve(args[1] || path.join(proj, "out", tag + ".zip")), entries = [], missing = [];
  const manifest = [`${pkg.name}: ${path.basename(proj)}, content v${fmKey(fs.readFileSync(path.join(proj, "content.md"), "utf8"), "version") || "?"}`, ""];
  for (const o of pkg.outputs) {
    const files = built(proj, o); if (!files.length) { missing.push(o.id); continue; }
    manifest.push(`${o.id}/ (${o.format})`);
    for (const f of files) { const rel = FOLDER.has(o.format) ? path.relative(path.join(proj, "out", o.id), f) : path.basename(f); entries.push([f, `${o.id}/${rel}`]); manifest.push(`  ${rel}`); }
  }
  if (missing.length) die(`[package] not built yet: ${missing.join(", ")}. Build and verify every output before zipping.`);
  // The Office font pack, when a deck came with one.
  for (const n of fs.readdirSync(path.join(proj, "out"))) if (/-fonts\.zip$/.test(n)) { entries.push([path.join(proj, "out", n), n]); manifest.push("", `${n}: fonts to install before presenting the deck`); }
  const tmp = path.join(proj, "out", ".package-manifest.txt"); fs.writeFileSync(tmp, manifest.join("\n") + "\n"); entries.push([tmp, "CONTENTS.txt"]);
  execFileSync("python3", ["-c", "import json,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)\nfor s,a in json.load(sys.stdin): z.write(s,a)\nz.close()", out], { input: JSON.stringify(entries) });
  fs.rmSync(tmp);
  console.log(`wrote ${out} (${entries.length - 1} files, ${pkg.outputs.length} outputs)`);
}
