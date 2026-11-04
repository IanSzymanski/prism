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
// Usage: dsbrand.js pack <brand> <out> [--with-design-system]
//        dsbrand.js install <folder> [--url URL] [--version V] [--title T] [--default] [--replace]
//        dsbrand.js remove <brand>
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
  // The brand's own files, as they are: everything beside the profile but the snapshot (the design system holds it) and the
  // tutorial, which stays in the plugin (Ian, Nov 4).
  const skip = new Set(["profile.json", "snapshot", "tutorial"]);
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
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  // Everything the design system serves, as it lays it out, but what a clean-up moved aside and dot-files.
  for (const p of walk(root)) {
    const f = rel(root, p);
    if (f.startsWith("archived/") || f.split("/").some(s => s.startsWith("."))) continue;
    fs.mkdirSync(path.dirname(path.join(target, f)), { recursive: true });
    fs.copyFileSync(p, path.join(target, f));
  }
  fs.writeFileSync(path.join(target, ".prism-install.json"), JSON.stringify({ url: opt("--url"), version: opt("--version"), title: opt("--title") || (prof.source && prof.source.title) || prof.name, installed: new Date().toISOString() }, null, 1) + "\n");
  if (a.includes("--default")) fs.writeFileSync(R.DEFAULT_FILE, id + "\n");
  const res = R.load(id);
  for (const w of res.warnings.filter(w => !w.startsWith("optional"))) console.warn(`[brand] ${w}`);
  if (res.errors.length) {
    for (const e of res.errors) console.error(`[brand] ${e}`);
    const missing = res.errors.some(e => /file missing: assets\//.test(e));
    die(`${id} was read into ${target} but does not build${missing ? "; its images are uploads: run.sh ds assets <folder>, read them, run.sh ds place <folder>, then install again" : ""}`);
  }
  console.log(`[ds] ${res.name} (${id}) builds from its design system${opt("--version") ? `, version ${opt("--version")}` : ""}: ${Object.keys(res.roles).length} roles${a.includes("--default") ? "; it is this workspace's default brand" : ""} -> ${target}`);
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
die("usage: dsbrand.js pack <brand> <out> [--with-design-system] | install <folder> [...] | remove <brand>", 2);
