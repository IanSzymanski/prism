#!/usr/bin/env node
// Lists a brand's image library: reusable photos from its design system that any piece can use as ![Caption](brand:<id>).
// The photos are never bundled with Prism: a release pins each one's upload id, and a piece fetches only the photos it uses.
// Usage: library.js <brand> [--live DIR] [--json]   (--live: also lists photos added to the design system since this release)
//        library.js <brand> --need FILE|DIR ...      (the upload ids to read for the photos these files use and lack)
//        library.js <brand> --take DIR               (keeps the photos a read saved, by upload id, for every build)
const fs = require("fs"), path = require("path");
const { load, brandDir, libraryFile } = require("./resolve.js");
const a = process.argv.slice(2), id = a[0], opt = k => a.includes(k) ? a[a.indexOf(k) + 1] : null;
if (!id || id.startsWith("--")) { console.error("usage: library.js <brand> [--live DIR] [--json] | --need FILE|DIR ... | --take DIR"); process.exit(2); }
const res = load(id);
if (res.errors.length) { for (const e of res.errors) console.error(`[brand] ${e}`); process.exit(1); }
const rows = Object.entries(res.library);
const dsRoot = d => fs.existsSync(path.join(d, "project")) ? path.join(d, "project") : d;
const walk = d => fs.statSync(d).isDirectory() ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => walk(path.join(d, e.name))) : [d];

if (a.includes("--need")) {
  // Every brand:<id> image in the given Markdown files (format files, content.md), then the ones not fetched yet.
  const files = a.slice(a.indexOf("--need") + 1).filter(f => !f.startsWith("--")).flatMap(f => fs.existsSync(f) ? walk(f) : []).filter(f => f.endsWith(".md"));
  const used = new Set(files.flatMap(f => [...fs.readFileSync(f, "utf8").matchAll(/\]\(brand:([\w-]+)/g)].map(m => m[1])));
  const unknown = [...used].filter(u => !res.library[u]);
  if (unknown.length) { console.error(`[library] ${id} has no library image ${unknown.map(u => `"${u}"`).join(", ")} (run.sh library ${id})`); process.exit(1); }
  const need = [...used].filter(u => !res.library[u].path);
  if (!need.length) { console.log(used.size ? `All ${used.size} library photo${used.size === 1 ? "" : "s"} these files use are fetched.` : "These files use no library photos."); process.exit(0); }
  const url = (JSON.parse(fs.readFileSync(path.join(brandDir(id).dir, "profile.json"), "utf8")).source || {}).url;
  console.log(`Fetch ${need.length} library photo${need.length === 1 ? "" : "s"} from ${res.name}'s design system${url ? ` (${url})` : ""} in one read, with these upload ids as paths:`);
  for (const u of need) console.log(res.library[u].blob);
  console.log(`Then: run.sh library ${id} --take <the folder the read saved them to>`);
  process.exit(0);
}

if (a.includes("--take")) {
  // A read by upload id is the photo this release pinned: it is kept as fetched. A photo saved by its design-system path
  // (assets/<group>/<file>) is kept only when the index read with it still names the pinned upload.
  const dir = opt("--take") || "", L = dsRoot(dir);
  if (!fs.existsSync(dir)) { console.error(`[library] no folder ${dir}`); process.exit(1); }
  const byId = {};
  for (const p of walk(dir)) { const m = /^([0-9a-f]{32})(\.\w+)?$/.exec(path.basename(p)); if (m) byId[m[1]] = p; }
  const idx = fs.existsSync(path.join(L, "design-system.json")) ? JSON.parse(fs.readFileSync(path.join(L, "design-system.json"), "utf8")) : null;
  const live = f => { const m = /^assets\/([^/]+)\/(.+)$/.exec(f); return m && ((idx.assetGroups || {})[m[1]] || { files: {} }).files[m[2]]; };
  const refused = [];
  let took = 0;
  for (const [n, e] of rows) {
    let src = byId[e.blob];
    if (!src && fs.existsSync(path.join(L, e.file))) {
      const r = idx && live(e.file);
      if (!idx) { refused.push(`brand:${n}: ${e.file} came without design-system.json, so it cannot be checked against the pinned upload; read it by its upload id (${e.blob})`); continue; }
      if (!r || r.blob !== e.blob) { refused.push(`brand:${n}: ${e.file} was ${r ? "replaced" : "removed"} in the design system since this release; it is not used until the brand is updated`); continue; }
      src = path.join(L, e.file);
    }
    if (!src) continue;
    if (!fs.statSync(src).size) { refused.push(`brand:${n}: ${path.basename(src)} is empty; read it again`); continue; }
    const dest = libraryFile(id, e.blob, e.file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`brand:${n}: fetched`); took++;
  }
  for (const r of refused) console.error(`[library] ${r}`);
  if (!took && !refused.length) console.log(`No library photos of ${res.name} in ${dir}.`);
  process.exit(refused.length ? 1 : 0);
}

if (a.includes("--json")) { console.log(JSON.stringify(Object.fromEntries(rows.map(([n, e]) => [n, { ...e, fetched: !!e.path }])), null, 1)); process.exit(0); }

console.log(`${res.name} image library: ${rows.length} image${rows.length === 1 ? "" : "s"}${res.libraryGroup ? ` (design system group "${res.libraryGroup}")` : ""}`);
if (rows.length) {
  console.log("| Source | Shows | People | Orientation | Focus | Tags |\n|---|---|---|---|---|---|");
  for (const [n, e] of rows) console.log(`| brand:${n} | ${e.shows || ""} | ${e.people || "not recorded"} | ${e.orientation || ""} | ${e.focus || "centre"} | ${(e.tags || []).join(", ")} |`);
}
// Photos in the live design system's library group that this release has not pinned: copy them into the piece's images/ to use them.
const live = opt("--live");
if (live && res.libraryGroup) {
  const L = dsRoot(live);
  const idx = fs.existsSync(path.join(L, "design-system.json")) ? JSON.parse(fs.readFileSync(path.join(L, "design-system.json"), "utf8")) : {};
  const pinned = new Set(Object.values(res.library).map(e => path.basename(e.file)));
  const extra = Object.entries(((idx.assetGroups || {})[res.libraryGroup] || {}).files || {}).filter(([f]) => !pinned.has(f));
  for (const [f, r] of extra) console.log(`live only: assets/${res.libraryGroup}/${f} (not in this release; read upload ${r.blob} from the design system, then run.sh images on it to use it in this piece)`);
}
