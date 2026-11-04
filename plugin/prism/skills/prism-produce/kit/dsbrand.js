#!/usr/bin/env node
// Brands that live in their design systems (D19). A brand's Prism files sit in its design system at project/prism/ (profile.json,
// digest.md, layers/, ornaments.js, office/, own/, web/, packages.json); the design system's own tokens.json, fonts/ and assets/ are
// the source, so there is no snapshot. Organization sharing lets everyone use the brand; only the design system's editors and
// owners can change it.
//
// pack:    a bundled brand (kit/brands/<id>, or a draft) as the project/prism/ folder to publish into its design system, checked
//          against the Design System type's limits. --with-design-system also writes the design-system files from the snapshot,
//          for a test copy or a new design system.
// install: a design system read from claude.ai (every project/ path, then `ds assets` and `ds place` for its uploads) becomes the
//          workspace's copy of the brand, in .prism/brands/<id>/, where builds read it. It replaces the bundled brand of the same
//          id. --default makes it the brand a piece uses when it names none.
// remove:  drops the workspace copy (and the workspace default, if it was this brand).
// plan, seen: which design systems a session looks at, and what each listing showed (see below).
// default, status: the workspace's default brand; what is installed, bundled and seen.
// Usage: dsbrand.js pack <brand> <out> [--with-design-system]
//        dsbrand.js install <folder> [--url URL] [--version V] [--title T] [--default] [--replace]
//        dsbrand.js remove <brand>
//        dsbrand.js plan [--default URL] [--all] <design system url>...
//        dsbrand.js seen <design system url> <version> yes|no
//        dsbrand.js want <folder> [--fresh]   (after reading project/prism/profile.json: the other paths to read; --fresh first)
//        dsbrand.js default <brand> | --clear
//        dsbrand.js status [--json]
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const R = require("./resolve.js");
const a = process.argv.slice(2), cmd = a[0], opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
const pos = a.filter((x, i) => !x.startsWith("--") && !["--url", "--version", "--title"].includes(a[i - 1]));
const die = (m, code = 1) => { console.error(`[ds] ${m}`); process.exit(code); };
const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const rel = (from, p) => path.relative(from, p).split(path.sep).join("/");
const VERSION = fs.readFileSync(path.join(__dirname, "VERSION"), "utf8").trim();

// The Design System type's rules for files it has no place for (artifact-type/reference/format.md): kept, shown nowhere, at most
// 512 KB each; no dot-folders or toolchain files; any .md outside components/ becomes a section of the brand book. Prism keeps one
// on purpose, digest.md, shown as the Prism section (Ian, Nov 4).
const MAX = 512 * 1024, REFUSED = /(^|\/)(\.[^/]*|node_modules|package\.json|package-lock\.json|bun\.lockb?|yarn\.lock|pnpm-lock\.yaml|bunfig\.toml|tsconfig\.json|deno\.json|CLAUDE\.md|AGENTS\.md)(\/|$)/;
function checkFolder(prismDir) {
  const problems = [];
  for (const p of walk(prismDir)) {
    const f = rel(prismDir, p);
    if (REFUSED.test(f)) problems.push(`${f}: the design system refuses dot-files and toolchain files`);
    if (fs.statSync(p).size > MAX) problems.push(`${f}: ${Math.round(fs.statSync(p).size / 1024)} KB; a file the design system has no place for is at most 512 KB`);
    if (/\.mdx?$/i.test(f) && f !== "digest.md") problems.push(`${f}: a Markdown file here would become a section of the brand book; only digest.md is, on purpose`);
  }
  return problems;
}

// What this workspace knows about design systems: brands read from them (.prism/brands/<id>/.prism-install.json), and every design
// system a session has looked at (.prism/brands/.seen.json: url -> {version, prism, id, at}).
const SEEN = path.join(R.DRAFTS, ".seen.json");
const readSeen = () => { try { return JSON.parse(fs.readFileSync(SEEN, "utf8")); } catch { return {}; } };
function record(url, v) { const s = readSeen(); s[url] = { ...v, at: new Date().toISOString() }; fs.mkdirSync(R.DRAFTS, { recursive: true }); fs.writeFileSync(SEEN, JSON.stringify(s, null, 1) + "\n"); }
const installs = () => R.brandList().filter(b => b.layout === "design-system").map(b => ({ id: b.id, ...(R.installRecord(b.id) || {}) }));

// The digest is the Prism section of the brand book: the design system titles a section by its first # heading.
function asSection(text) {
  if (/^# Prism\s*$/m.test(text.split("\n").find(l => /^# /.test(l)) || "")) return text;
  const lines = text.split("\n"), i = lines.findIndex(l => /^# /.test(l));
  if (i < 0) return `# Prism\n\n${text}`;
  lines.splice(i, 1, "# Prism", "", `*${lines[i].slice(2).trim()}*`);
  return lines.join("\n");
}

if (cmd === "pack") {
  const [, id, out] = pos;
  if (!id || !out) die("usage: dsbrand.js pack <brand> <out> [--with-design-system]", 2);
  const b = R.brandDir(id);
  if (!fs.existsSync(path.join(b.dir, "profile.json"))) die(`no brand "${id}"`);
  const res = R.load(id);
  if (res.errors.length) die(`${id} does not build, so it can't be packed:\n  ${res.errors.join("\n  ")}`);
  const project = path.join(out, "project"), prism = path.join(project, "prism");
  if (fs.existsSync(prism)) die(`${prism} already exists; pack into an empty folder`);
  fs.mkdirSync(prism, { recursive: true });
  // The brand's own files, as they are: everything beside the profile but the snapshot (the design system holds it), an onboarding
  // draft's source/, and the tutorial, which stays in the plugin (Ian, Nov 4).
  const skip = new Set(["profile.json", "snapshot", "tutorial", "source"]);   // source/: an onboarding draft's copy of the design system
  for (const e of fs.readdirSync(b.dir, { withFileTypes: true })) if (!skip.has(e.name) && !e.name.startsWith(".")) fs.cpSync(path.join(b.dir, e.name), path.join(prism, e.name), { recursive: true });
  const prof = JSON.parse(fs.readFileSync(path.join(b.dir, "profile.json"), "utf8"));
  const digest = path.join(prism, prof.digest.file);
  fs.writeFileSync(digest, asSection(fs.readFileSync(digest, "utf8")));
  // The brand's packages move into its Prism folder, so everything Prism owns is in one place.
  if (b.layout === "kit" && fs.existsSync(path.join(b.snap, "packages.json"))) fs.copyFileSync(path.join(b.snap, "packages.json"), path.join(prism, "packages.json"));
  delete prof.default;   // the default brand is the person's or the organization's default design system now
  prof.prism = VERSION;  // the Prism that packed it; a newer schema than a kit reads is refused (resolve.js)
  prof.source = { ...prof.source, _note: "Builds read this design system: its tokens, fonts and assets, and this folder. snapshot.files pins what the brand was checked against." };
  prof.digest.sha256 = sha(digest);
  fs.writeFileSync(path.join(prism, "profile.json"), JSON.stringify(prof, null, 1) + "\n");
  if (a.includes("--with-design-system")) for (const p of walk(b.snap)) {
    const f = rel(b.snap, p);
    if (f.startsWith("prism/") || f.startsWith(".")) continue;
    fs.mkdirSync(path.dirname(path.join(project, f)), { recursive: true });
    fs.copyFileSync(p, path.join(project, f));
  }
  const problems = checkFolder(prism);
  const files = walk(prism).map(p => rel(project, p)).sort();
  console.log(`[ds] packed ${id} into ${prism}: ${files.length} files, ${Math.round(files.reduce((s, f) => s + fs.statSync(path.join(project, f)).size, 0) / 1024)} KB${a.includes("--with-design-system") ? ", with the design system's files" : ""}`);
  for (const f of files) console.log(`  project/${f}`);
  if (problems.length) die(`the design system would not keep this folder as it is:\n  ${problems.join("\n  ")}`);
  process.exit(0);
}

if (cmd === "install") {
  const [, folder] = pos;
  if (!folder) die("usage: dsbrand.js install <folder> [--url URL] [--version V] [--title T] [--default] [--replace]", 2);
  const root = fs.existsSync(path.join(folder, "project")) ? path.join(folder, "project") : folder;
  const pf = path.join(root, "prism", "profile.json");
  if (!fs.existsSync(pf)) die(`no prism/profile.json in ${root}: this design system is not a Prism brand (yet). Its editors add one with /prism-onboard`);
  const prof = JSON.parse(fs.readFileSync(pf, "utf8")), id = prof.id;
  if (!/^[a-z0-9-]+$/.test(id || "")) die(`prism/profile.json has id "${id}"; an id is lowercase letters, digits and hyphens`);
  const target = path.join(R.DRAFTS, id);
  if (fs.existsSync(path.join(target, "profile.json")) && !a.includes("--replace"))
    die(`an onboarding draft of ${id} is in ${target}; finish it or remove it first (or pass --replace to drop it)`);
  // The copy is staged and checked first: a design system that doesn't build never replaces a copy (or a bundled brand) that does.
  const stage = fs.mkdtempSync(path.join(require("os").tmpdir(), "prism-install-")), staged = path.join(stage, "brands", id);
  // Everything the design system serves, as it lays it out, but what a clean-up moved aside and dot-files.
  for (const p of walk(root)) {
    const f = rel(root, p);
    if (f.startsWith("archived/") || f.split("/").some(s => s.startsWith("."))) continue;
    fs.mkdirSync(path.dirname(path.join(staged, f)), { recursive: true });
    fs.copyFileSync(p, path.join(staged, f));
  }
  fs.writeFileSync(path.join(staged, ".prism-install.json"), JSON.stringify({ url: opt("--url"), version: opt("--version"), title: opt("--title") || (prof.source && prof.source.title) || prof.name, installed: new Date().toISOString() }, null, 1) + "\n");
  const check = require("child_process").spawnSync("node", [path.join(__dirname, "resolve.js"), id, "--out", path.join(stage, "check")], { env: { ...process.env, PRISM_DRAFTS: path.join(stage, "brands") }, encoding: "utf8" });
  if (check.status !== 0) {
    const errs = (check.stderr || "").split("\n").filter(l => /^\[brand\]/.test(l) && !/cannot build/.test(l));
    for (const e of errs) console.error(e);
    fs.rmSync(stage, { recursive: true, force: true });
    const missing = errs.some(e => /file missing: assets\//.test(e));
    die(`${id} from this design system does not build, so it was not installed${fs.existsSync(target) || fs.existsSync(path.join(__dirname, "brands", id)) ? "; the copy builds use is unchanged" : ""}${missing ? ". Its images are uploads: run.sh ds assets <folder>, read them, run.sh ds place <folder>, then install again" : ""}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(staged, target, { recursive: true });
  fs.rmSync(stage, { recursive: true, force: true });
  if (a.includes("--default")) fs.writeFileSync(R.DEFAULT_FILE, id + "\n");
  const res = R.load(id);
  for (const w of res.warnings.filter(w => !w.startsWith("optional"))) console.warn(`[brand] ${w}`);
  if (opt("--url")) record(opt("--url"), { version: opt("--version"), prism: true, id });
  console.log(`[ds] ${res.name} (${id}) builds from its design system${opt("--version") ? `, version ${opt("--version")}` : ""}: ${Object.keys(res.roles).length} roles${a.includes("--default") ? "; it is this workspace's default brand" : ""} -> ${target}`);
  process.exit(0);
}

// Which design systems a session looks at. Each look costs a call, so a session looks only at the ones that can matter: those
// installed here (a new version to bring in), the person's or organization's default, the ones the bundled brands came from, ones
// it has never seen, and ones not looked at for a week. One seen without a Prism folder this week is skipped until --all (the
// person asked for a brand this workspace doesn't have).
if (cmd === "plan") {
  const urls = pos.slice(1), dflt = opt("--default"), seen = readSeen(), installed = installs();
  if (!urls.length) die("usage: dsbrand.js plan [--default URL] [--all] <design system url>...", 2);
  // The design systems the bundled brands came from: when its editors publish a Prism folder there, sessions pick it up at once.
  const bundled = {};
  for (const b of fs.readdirSync(path.join(__dirname, "brands"))) { try { const u = JSON.parse(fs.readFileSync(path.join(__dirname, "brands", b, "profile.json"), "utf8")).source.url; if (u) bundled[u] = b; } catch { } }
  const WEEK = 7 * 24 * 3600 * 1000;
  for (const u of urls) {
    const inst = installed.find(x => x.url === u), s = seen[u];
    const why = inst ? `installed here as ${inst.id}` : u === dflt ? "the default design system" : bundled[u] ? `the design system of the bundled ${bundled[u]}` : !s ? "not seen yet" : s.prism ? "has a Prism folder"
      : Date.now() - Date.parse(s.at || 0) > WEEK ? "not seen for a week" : a.includes("--all") ? "asked for every design system" : null;
    console.log(why ? `check ${u} (${why})` : `skip ${u} (no Prism folder when seen ${(s.at || "").slice(0, 10)})`);
  }
  process.exit(0);
}

// What a design system's file listing showed: its version, and whether project/prism/profile.json is in it. Says what to do next:
// current <id> (this version is installed: nothing to read), read (a Prism brand, new or changed: read and install it), none
// (not a Prism brand), or gone <id> (installed here, but its Prism folder has been taken out: remove the copy).
if (cmd === "seen") {
  const [, url, version, has] = pos;
  if (!url || !version || !["yes", "no"].includes(has)) die("usage: dsbrand.js seen <design system url> <version> yes|no", 2);
  const inst = installs().find(x => x.url === url);
  record(url, { version, prism: has === "yes", id: inst ? inst.id : undefined });
  if (has === "no") console.log(inst ? `gone ${inst.id}` : "none");
  else console.log(inst && inst.version === version ? `current ${inst.id}` : "read");
  process.exit(0);
}

// The rest of a brand to read, once its profile and tokens are in the folder: everything the profile pins (its Prism files, the
// design system's files it was checked against) and the font files the tokens name, as project/ paths, one per line, without the
// uploads (ds assets lists the ones the brand uses) or what the folder already has.
if (cmd === "want") {
  const [, folder] = pos;
  if (!folder) die("usage: dsbrand.js want <folder>", 2);
  const root = fs.existsSync(path.join(folder, "project")) ? path.join(folder, "project") : folder;
  const pf = path.join(root, "prism", "profile.json");
  if (!fs.existsSync(pf)) die(`no prism/profile.json in ${root}: read project/prism/profile.json and project/tokens.json first`);
  // The read tool saves every read of a design system into the same folder, so files from another version can still be there and
  // would be taken for this one's. --fresh (the first pass for a new version) keeps only the profile just read.
  if (a.includes("--fresh")) {
    for (const p of walk(root)) if (rel(root, p) !== "prism/profile.json") fs.rmSync(p);
    if (root !== folder) for (const e of fs.readdirSync(folder)) if (/^[0-9a-f]{32}(\.\w+)?$/.test(e)) fs.rmSync(path.join(folder, e));
  }
  const prof = JSON.parse(fs.readFileSync(pf, "utf8")), blobs = (prof.snapshot && prof.snapshot.blobs) || {};
  const want = new Set([`prism/${prof.digest.file}`, "prism/packages.json", ...Object.keys(prof.own || {}).map(f => `prism/${f}`)]);
  for (const f of Object.keys((prof.office && prof.office.files) || {})) want.add(f.startsWith("snapshot/") ? f.slice(9) : `prism/${f}`);
  for (const f of Object.keys((prof.snapshot && prof.snapshot.files) || {})) want.add(f);
  try { for (const f of JSON.parse(fs.readFileSync(path.join(root, "tokens.json"), "utf8")).type.fonts || []) if (f.file) want.add(f.file.includes("/") ? f.file : `fonts/${f.file}`); } catch { }
  // The first pass records what it asked for, so the second prints only what the tokens added (a path the design system doesn't
  // have, such as an optional packages.json, is asked for once).
  const asked = path.join(folder, ".prism-want.json"); let before = [];
  if (a.includes("--fresh")) fs.rmSync(asked, { force: true }); else try { before = JSON.parse(fs.readFileSync(asked, "utf8")); } catch { }
  const list = [...want].sort().filter(f => !blobs[f] && !fs.existsSync(path.join(root, f))).map(f => `project/${f}`);
  for (const f of list.filter(f => !before.includes(f))) console.log(f);
  fs.writeFileSync(asked, JSON.stringify([...new Set([...before, ...list])]));
  process.exit(0);
}

if (cmd === "default") {
  const [, id] = pos;
  if (a.includes("--clear")) { fs.rmSync(R.DEFAULT_FILE, { force: true }); console.log(`[ds] no workspace default; the default is ${R.defaultBrand()}`); process.exit(0); }
  if (!id) die("usage: dsbrand.js default <brand> | --clear", 2);
  const b = R.brandDir(id);
  if (!fs.existsSync(path.join(b.dir, "profile.json"))) die(`no brand "${id}" (run.sh brands lists them)`);
  if (b.draft) die(`${id} is an onboarding draft; a draft is never the default`);
  fs.mkdirSync(R.DRAFTS, { recursive: true });
  fs.writeFileSync(R.DEFAULT_FILE, id + "\n");
  console.log(`[ds] ${id} is this workspace's default brand`);
  process.exit(0);
}

if (cmd === "status") {
  const out = { default: (() => { try { return R.defaultBrand(); } catch (e) { return null; } })(), from_design_systems: installs(), bundled: fs.readdirSync(path.join(__dirname, "brands")).filter(b => fs.existsSync(path.join(__dirname, "brands", b, "profile.json"))), seen: readSeen() };
  if (a.includes("--json")) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
  console.log(`default: ${out.default || "none"}`);
  for (const i of out.from_design_systems) console.log(`${i.id}: from ${i.url || "a design system"}${i.version ? `, version ${i.version}` : ""}${i.installed ? `, read ${i.installed.slice(0, 10)}` : ""}`);
  console.log(`bundled with the plugin: ${out.bundled.join(", ") || "none"}`);
  const s = Object.entries(out.seen); if (s.length) console.log(`design systems seen: ${s.length} (${s.filter(([, v]) => v.prism).length} with a Prism folder)`);
  process.exit(0);
}

if (cmd === "remove") {
  const [, id] = pos;
  if (!id) die("usage: dsbrand.js remove <brand>", 2);
  const b = R.brandDir(id);
  if (b.layout !== "design-system") die(`${id} is not a brand read from a design system in this workspace`);
  fs.rmSync(path.dirname(b.dir), { recursive: true, force: true });
  try { if (fs.readFileSync(R.DEFAULT_FILE, "utf8").trim() === id) fs.rmSync(R.DEFAULT_FILE); } catch { }
  console.log(`[ds] removed the workspace copy of ${id}`);
  process.exit(0);
}
die("usage: dsbrand.js pack | install | remove | plan | seen | default | status (see the top of dsbrand.js)", 2);
