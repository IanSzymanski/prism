#!/usr/bin/env node
// Lists the brands this kit can build in: id, name, which one is the default, and the defaults each brand sets.
// Usage: brands.js [--json]   (--json also gives each brand's folder and digest path, drafts included)
const fs = require("fs"), path = require("path");
// Drafts (workspace brands from onboarding) are listed too, marked draft; they are never the default.
const { defaultBrand, brandList } = require("./resolve.js");
let dflt = null; try { dflt = defaultBrand(); } catch (e) { console.error(e.message); }
const { installRecord } = require("./resolve.js");
const rows = brandList().map(({ id, dir, draft, shipped, layout }) => { const p = JSON.parse(fs.readFileSync(path.join(dir, "profile.json"), "utf8")), c = p.content || {};
  // A brand read from its design system (D19) says which design system and version it came from.
  const from = layout === "design-system" ? installRecord(id) || {} : null;
  return { id, name: p.name, default: id === dflt, draft, dir, from_design_system: from && { url: from.url || null, version: from.version || null, installed: from.installed || null }, digest: path.join(dir, (p.digest || {}).file || "digest.md"), replaces_shipped: draft && shipped, audience: c.audience || null, contact: c.contact || null, email_sender: c.email_sender || null, design_system: (p.source || {}).url || null,
    // The brand's own components: markup formatters may use where it fits, with what each is for, when, how often and its rules.
    components: Object.fromEntries(Object.entries(p.components || {}).map(([k, c]) => [k, { use: c.use || "", markup: c.markup || "", when: c.when || "", max: c.max || null, rules: c.rules || [], formats: c.formats || [], like: c.like || null }])) }; });
if (process.argv.includes("--json")) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
for (const r of rows) console.log(`${r.id}${r.default ? " (default)" : ""}${r.draft ? (r.replaces_shipped ? " (draft, replaces the shipped brand here)" : " (draft)") : ""}${r.from_design_system ? ` (from its design system${r.from_design_system.version ? `, version ${r.from_design_system.version}` : ""})` : ""}: ${r.name}${r.audience ? ` · audience: ${r.audience}` : ""}${r.email_sender ? ` · email: ${r.email_sender}` : ""}`);
