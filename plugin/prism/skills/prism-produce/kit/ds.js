#!/usr/bin/env node
// Reading a Claude Design System in as few Artifact calls as possible. Its text files (index, tokens, README, fonts, components)
// are published files under project/; its images are uploads in its asset store, named by the index and read by their ids.
// A read saves an upload as <id>.<ext> beside the published files; `place` moves each to project/assets/<group>/<file>.
// Usage: ds.js assets <folder> [--brand <id> | --skip <group>] [--all]   (the upload ids to read in one call; never the photo library)
//        ds.js place <folder>                                          (puts the uploads the read saved where the index names them)
const fs = require("fs"), path = require("path");
const a = process.argv.slice(2), cmd = a[0], dir = a[1], opt = k => a.includes(k) ? a[a.indexOf(k) + 1] : null;
const die = m => { console.error(`[ds] ${m}`); process.exit(1); };
if (!["assets", "place"].includes(cmd) || !dir) die("usage: ds.js assets <folder> [--brand <id> | --skip <group>] [--all] | ds.js place <folder>");
const root = fs.existsSync(path.join(dir, "project")) ? path.join(dir, "project") : dir, idxp = path.join(root, "design-system.json");
if (!fs.existsSync(idxp)) die(`no design-system.json in ${root}: read the design system's project/ files first`);
const idx = JSON.parse(fs.readFileSync(idxp, "utf8"));
const uploads = Object.entries(idx.assetGroups || {}).flatMap(([g, v]) => Object.entries(v.files || {}).map(([f, r]) => ({ group: g, file: `assets/${g}/${f}`, blob: r.blob, size: r.size }))).filter(u => /^[0-9a-f]{32}$/.test(u.blob || ""));

if (cmd === "assets") {
  // The photo library stays in the design system: pieces fetch the photos they use (library.js --need).
  let skip = opt("--skip");
  if (!skip && opt("--brand")) skip = (require("./resolve.js").load(opt("--brand")).libraryGroup) || null;
  if (!skip && !a.includes("--all")) skip = "Photos";
  const want = uploads.filter(u => a.includes("--all") || u.group !== skip), left = uploads.length - want.length;
  console.log(`Read these ${want.length} uploads (${Math.round(want.reduce((s, u) => s + (u.size || 0), 0) / 1024)} KB) in one call, as paths${left ? `; the ${left} in "${skip}" stay in the design system` : ""}:`);
  for (const u of want) console.log(u.blob);
  process.exit(0);
}

// place: every <id>.<ext> the read saved (anywhere in the folder) goes to the file the index names; the rest is reported.
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const byId = {};
for (const p of walk(dir)) { const m = /^([0-9a-f]{32})(\.[\w]+)?$/.exec(path.basename(p)); if (m) byId[m[1]] = p; }
let placed = 0;
for (const u of uploads) {
  const src = byId[u.blob];
  if (!src) continue;
  const dest = path.join(root, u.file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  placed++;
}
const missing = uploads.filter(u => !fs.existsSync(path.join(root, u.file)));
console.log(`[ds] placed ${placed} upload${placed === 1 ? "" : "s"} under ${path.join(root, "assets")}${missing.length ? `; not read: ${missing.length} (${[...new Set(missing.map(u => u.group))].join(", ")})` : ""}`);
