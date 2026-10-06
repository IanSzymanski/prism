#!/usr/bin/env node
// Lists a brand's image library: reusable photos from its design system that any piece can use as ![Caption](brand:<id>).
// Usage: library.js <brand> [--live DIR]   (--live: also lists photos added to the design system since this release)
const fs = require("fs"), path = require("path");
const { load } = require("./resolve.js");
const a = process.argv.slice(2), id = a[0], live = a.includes("--live") ? a[a.indexOf("--live") + 1] : null;
if (!id) { console.error("usage: library.js <brand> [--live DIR]"); process.exit(2); }
const res = load(id);
if (res.errors.length) { for (const e of res.errors) console.error(`[brand] ${e}`); process.exit(1); }
const rows = Object.entries(res.library);
console.log(`${res.name} image library: ${rows.length} image${rows.length === 1 ? "" : "s"}${res.libraryGroup ? ` (design system group "${res.libraryGroup}")` : ""}`);
if (rows.length) {
  console.log("| Source | Shows | People | Orientation | Focus | Tags |\n|---|---|---|---|---|---|");
  for (const [n, e] of rows) console.log(`| brand:${n} | ${e.shows || ""} | ${e.people || "no"} | ${e.orientation || ""} | ${e.focus || "centre"} | ${(e.tags || []).join(", ")} |`);
}
// Photos in the live design system's library group that this release has not pinned: copy them into the piece's images/ to use them.
if (live && res.libraryGroup) {
  const L = fs.existsSync(path.join(live, "project")) ? path.join(live, "project") : live;
  const idx = fs.existsSync(path.join(L, "design-system.json")) ? JSON.parse(fs.readFileSync(path.join(L, "design-system.json"), "utf8")) : {};
  const pinned = new Set(Object.values(res.library).map(e => path.basename(e.file)));
  const extra = Object.keys(((idx.assetGroups || {})[res.libraryGroup] || {}).files || {}).filter(f => !pinned.has(f));
  for (const f of extra) console.log(`live only: ${path.join(L, "assets", res.libraryGroup, f)} (not in this release; copy into images/ and run run.sh images to use it)`);
}
