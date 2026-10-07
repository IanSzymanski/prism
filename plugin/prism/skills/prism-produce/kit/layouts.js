#!/usr/bin/env node
// Alternate layouts: a different page structure for the same content (a photo, a figure or a rail leads instead of the
// title band), not a colour or size change. Core's are in layouts.json; a brand's profile `layouts` (by format) adds its
// own, replaces a core one by id (its look in the brand's layer under body.layout-<id>), or switches one off with null.
// A brand never ties with core: the brand's entry wins. With no `layout:` a sheet is the standard layout.
// Usage: layouts.js [--brand B] [--format sheet] [--json]
const fs = require("fs"), path = require("path");
const { defaultBrand, brandDir } = require("./resolve.js");
const NEEDS = ["image", "stat", "stat-label", "rail"];

function load(brand, format = "sheet") {
  const core = JSON.parse(fs.readFileSync(path.join(__dirname, "layouts.json"), "utf8"))[format] || {};
  const all = { standard: { name: "Standard", use: "The title band, then the story in one column.", when: "Anything without a clear photo, figure or rail to lead with.", needs: [], from: "core" } };
  for (const [k, v] of Object.entries(core)) all[k] = { ...v, from: "core" };
  if (brand) {
    const pf = path.join(brandDir(brand).dir, "profile.json");
    if (!fs.existsSync(pf)) throw new Error(`no brand "${brand}"`);
    const own = ((JSON.parse(fs.readFileSync(pf, "utf8")).layouts || {})[format]) || {};
    for (const [k, v] of Object.entries(own)) {
      if (k === "standard") throw new Error(`[layouts] ${brand}: "standard" is every sheet's base layout; restyle it in the brand's layer instead`);
      if (v === null) { delete all[k]; continue; }
      const bad = (v.needs || []).filter(n => !NEEDS.includes(n));
      if (!v.name || bad.length) throw new Error(`[layouts] ${brand}.${k}: ${!v.name ? "no name" : `needs ${bad.join(", ")} (known: ${NEEDS.join(", ")})`}`);
      all[k] = { ...v, needs: v.needs || [], from: brand };
    }
  }
  return all;
}

// What a format file is missing for its layout: front matter keys, or a ::: rail block.
function missing(layout, md) {
  const fm = (/^---\n([\s\S]*?)\n---/.exec(md) || [, ""])[1];
  return (layout.needs || []).filter(n => n === "rail" ? !/^:{3,}\s*(\{[^}]*\.rail\b[^}]*\}|rail\b)/m.test(md) : !new RegExp(`^${n}:\\s*\\S`, "m").test(fm));
}

module.exports = { load, missing };
if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  let all; try { all = load(opt("--brand") || defaultBrand(), opt("--format") || "sheet"); } catch (e) { console.error(e.message); process.exit(2); }
  if (a.includes("--json")) { console.log(JSON.stringify(all, null, 1)); process.exit(0); }
  for (const [k, v] of Object.entries(all)) console.log(`${k}: ${v.name}${v.from !== "core" ? ` (${v.from})` : ""}${v.needs.length ? ` · needs ${v.needs.join(", ")}` : ""}\n  ${v.use}\n  when: ${v.when || "-"}`);
}
