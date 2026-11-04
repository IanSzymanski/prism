#!/usr/bin/env node
// Re-pins a brand profile after its snapshot or digest changes: file hashes, blob ids from the index, digest and README hashes.
// Works on shipped brands, onboarding drafts and brands read from their design systems (a workspace copy of the same id wins).
// Usage: pin.js <brand>
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { brandDir, brandFile } = require("./resolve.js");
const id = process.argv[2];
if (!id) { console.error("usage: pin.js <brand>"); process.exit(2); }
const where = brandDir(id), { dir, snap, draft, layout } = where;
const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const rel = (from, p) => path.relative(from, p).split(path.sep).join("/");
const prof = JSON.parse(fs.readFileSync(path.join(dir, "profile.json"), "utf8"));
const idx = fs.existsSync(path.join(snap, "design-system.json")) ? JSON.parse(fs.readFileSync(path.join(snap, "design-system.json"), "utf8")) : {};

// A snapshot holds only what the brand uses, so all of it is pinned. A design system holds much more (components, other pages,
// the Prism folder itself), so only what the brand reads is: what was pinned before, the tokens, README and index, the font files
// the tokens list, every mapped asset, generator and motif, and the brand's packages.
function used() {
  const T = JSON.parse(fs.readFileSync(path.join(snap, "tokens.json"), "utf8"));
  const want = new Set([...Object.keys(prof.snapshot.files || {}), "README.md", "tokens.json", "design-system.json", "packages.json"]);
  for (const f of (T.type && T.type.fonts) || []) if (f.file) want.add(f.file.includes("/") ? f.file : `fonts/${f.file}`);
  for (const v of Object.values(prof.roles || {})) if (typeof v === "string" && /^assets\//.test(v)) want.add(v);
  for (const g of Object.values(prof.generators || {})) want.add(g.script);
  for (const m of (prof.motion && prof.motion.motifs) || []) if (m.file && m.file.startsWith("snapshot/")) want.add(m.file.slice(9));
  return [...want].filter(f => fs.existsSync(path.join(snap, f))).sort();
}
const files = layout === "design-system" ? used() : walk(snap).map(p => rel(snap, p)).sort();
prof.snapshot.files = Object.fromEntries(files.map(f => [f, sha(path.join(snap, f))]));
prof.snapshot.blobs = Object.fromEntries(Object.entries(idx.assetGroups || {}).flatMap(([g, v]) => Object.entries(v.files || {}).map(([f, r]) => [`assets/${g}/${f}`, r.blob])));
if (prof.office && fs.existsSync(path.join(dir, "office"))) prof.office.files = Object.fromEntries(walk(path.join(dir, "office")).sort().map(p => [rel(dir, p), sha(p)]));
// Office fonts taken straight from the snapshot (no office/ folder) keep their names and take fresh hashes.
else if (prof.office && prof.office.files) prof.office.files = Object.fromEntries(Object.keys(prof.office.files).filter(f => fs.existsSync(brandFile(where, f))).map(f => [f, sha(brandFile(where, f))]));
// Every brand-owned file beside the profile (ornaments, layers, own assets, site kit, brand layouts; digest excluded), pinned
// like the snapshot. A brand layout (layouts/<format>/<id>.json and its CSS) is data: for a brand read from its design system a
// changed one builds and warns (resolve.js).
const ownFiles = [...fs.readdirSync(dir).filter(f => f.endsWith(".js")), ...["layers", "own", "web", "layouts"].filter(d => fs.existsSync(path.join(dir, d))).flatMap(d => walk(path.join(dir, d)).map(p => rel(dir, p)))];
prof.own = Object.fromEntries(ownFiles.sort().map(f => [f, sha(path.join(dir, f))]));
prof.digest.sha256 = sha(path.join(dir, prof.digest.file)); prof.digest.readme_sha256 = prof.snapshot.files["README.md"];
fs.writeFileSync(path.join(dir, "profile.json"), JSON.stringify(prof, null, 1) + "\n");
console.log(`pinned ${id}${draft ? " (draft)" : layout === "design-system" ? " (from its design system)" : ""}: ${Object.keys(prof.snapshot.files).length} files, ${Object.keys(prof.snapshot.blobs).length} blobs`);
