#!/usr/bin/env node
// Lists the brands this kit can build in: id, name, which one is the default, and the defaults each brand sets.
// Usage: brands.js [--json]
const fs = require("fs"), path = require("path");
const { defaultBrand } = require("./resolve.js");
const dir = path.join(__dirname, "brands");
const ids = fs.readdirSync(dir).filter(b => fs.existsSync(path.join(dir, b, "profile.json"))).sort();
let dflt = null; try { dflt = defaultBrand(); } catch (e) { console.error(e.message); }
const rows = ids.map(id => { const p = JSON.parse(fs.readFileSync(path.join(dir, id, "profile.json"), "utf8")), c = p.content || {};
  return { id, name: p.name, default: id === dflt, audience: c.audience || null, contact: c.contact || null, email_sender: c.email_sender || null, design_system: (p.source || {}).url || null }; });
if (process.argv.includes("--json")) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
for (const r of rows) console.log(`${r.id}${r.default ? " (default)" : ""}: ${r.name}${r.audience ? ` · audience: ${r.audience}` : ""}${r.email_sender ? ` · email: ${r.email_sender}` : ""}`);
