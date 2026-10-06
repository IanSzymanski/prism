// Re-pins a brand profile after its snapshot or digest changes: file hashes, blob ids from the index, digest and README hashes.
// Usage: node tools/pin-profile.js <brand>
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const dir = path.join(__dirname, "..", "plugin", "prism", "skills", "prism-produce", "kit", "brands", process.argv[2]);
const snap = path.join(dir, "snapshot"), sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const prof = JSON.parse(fs.readFileSync(path.join(dir, "profile.json"), "utf8"));
const idx = JSON.parse(fs.readFileSync(path.join(snap, "design-system.json"), "utf8"));
prof.snapshot.files = Object.fromEntries(walk(snap).sort().map(p => [path.relative(snap, p), sha(p)]));
prof.snapshot.blobs = Object.fromEntries(Object.entries(idx.assetGroups || {}).flatMap(([g, v]) => Object.entries(v.files || {}).map(([f, r]) => [`assets/${g}/${f}`, r.blob])));
if (prof.office && fs.existsSync(path.join(dir, "office"))) prof.office.files = Object.fromEntries(walk(path.join(dir, "office")).sort().map(p => [path.relative(dir, p), sha(p)]));
// Brand-owned scripts beside the profile (generator previews), pinned like the snapshot.
// Every brand-owned file beside the profile (ornaments, layers, own assets, digest excluded), pinned like the snapshot.
const ownFiles = [...fs.readdirSync(dir).filter(f => f.endsWith(".js")), ...["layers", "own"].filter(d => fs.existsSync(path.join(dir, d))).flatMap(d => walk(path.join(dir, d)).map(p => path.relative(dir, p)))];
prof.own = Object.fromEntries(ownFiles.sort().map(f => [f, sha(path.join(dir, f))]));
prof.digest.sha256 = sha(path.join(dir, prof.digest.file)); prof.digest.readme_sha256 = prof.snapshot.files["README.md"];
fs.writeFileSync(path.join(dir, "profile.json"), JSON.stringify(prof, null, 1) + "\n");
console.log(`pinned ${Object.keys(prof.snapshot.files).length} files, ${Object.keys(prof.snapshot.blobs).length} blobs`);
