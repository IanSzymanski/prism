#!/usr/bin/env node
// Re-pins a brand profile after its snapshot or digest changes: file hashes, blob ids from the index, digest and README hashes.
// Works on shipped brands and on onboarding drafts (a draft of the same id wins). Usage: pin.js <brand>
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { brandDir } = require("./resolve.js");
const id = process.argv[2];
if (!id) { console.error("usage: pin.js <brand>"); process.exit(2); }
const { dir, draft } = brandDir(id);
const snap = path.join(dir, "snapshot"), sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const prof = JSON.parse(fs.readFileSync(path.join(dir, "profile.json"), "utf8"));
const idx = fs.existsSync(path.join(snap, "design-system.json")) ? JSON.parse(fs.readFileSync(path.join(snap, "design-system.json"), "utf8")) : {};
prof.snapshot.files = Object.fromEntries(walk(snap).sort().map(p => [path.relative(snap, p), sha(p)]));
prof.snapshot.blobs = Object.fromEntries(Object.entries(idx.assetGroups || {}).flatMap(([g, v]) => Object.entries(v.files || {}).map(([f, r]) => [`assets/${g}/${f}`, r.blob])));
if (prof.office && fs.existsSync(path.join(dir, "office"))) prof.office.files = Object.fromEntries(walk(path.join(dir, "office")).sort().map(p => [path.relative(dir, p), sha(p)]));
// Office fonts taken straight from the snapshot (no office/ folder) keep their names and take fresh hashes.
else if (prof.office && prof.office.files) prof.office.files = Object.fromEntries(Object.keys(prof.office.files).filter(f => fs.existsSync(path.join(dir, f))).map(f => [f, sha(path.join(dir, f))]));
// Every brand-owned file beside the profile (ornaments, layers, own assets; digest excluded), pinned like the snapshot.
const ownFiles = [...fs.readdirSync(dir).filter(f => f.endsWith(".js")), ...["layers", "own"].filter(d => fs.existsSync(path.join(dir, d))).flatMap(d => walk(path.join(dir, d)).map(p => path.relative(dir, p)))];
prof.own = Object.fromEntries(ownFiles.sort().map(f => [f, sha(path.join(dir, f))]));
prof.digest.sha256 = sha(path.join(dir, prof.digest.file)); prof.digest.readme_sha256 = prof.snapshot.files["README.md"];
fs.writeFileSync(path.join(dir, "profile.json"), JSON.stringify(prof, null, 1) + "\n");
console.log(`pinned ${id}${draft ? " (draft)" : ""}: ${Object.keys(prof.snapshot.files).length} files, ${Object.keys(prof.snapshot.blobs).length} blobs`);
