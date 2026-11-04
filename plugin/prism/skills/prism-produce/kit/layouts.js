#!/usr/bin/env node
// Page layouts: another arrangement of a format's parts (a photo, a figure or a rail leads instead of the title band), not
// another colour or size. Prism default layouts (layouts.json, by format) are core: every brand can use them. Brand layouts are
// a brand's own, as many as it needs, stored with the brand: <brand dir>/layouts/<format>/<id>.json, and optionally the CSS it
// names beside it. A brand layout is an arrangement plus scoped CSS, never new structure: its base (a default layout; standard
// when it names none, or the default it replaces) gives the structure, its `front` values are front matter defaults under the
// file's own, and its CSS loads after the brand's layer, only for that layout. One with a default's id replaces the default;
// the profile's `layouts: {<format>: {<id>: null}}` switches a default off for the brand. A brand never defines standard.
// `format:` picks the output's shape (brochure, 5x7, email, web); `layout:` names a page layout. `layout: brochure|5x7|email|web`
// is the old spelling of `format:` and keeps working.
// Usage: layouts.js [--brand B] [--format sheet] [--json]
const fs = require("fs"), path = require("path");
const { defaultBrand, brandDir } = require("./resolve.js");
// Format names `layout:` used to carry: never a layout id.
const FORMATS = ["brochure", "5x7", "email", "web"];
// What a layout can need from the format file: a front matter key, or a ::: rail block.
const NEEDS = ["image", "stat", "stat-label", "rail"];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/, KEYS = ["name", "use", "when", "needs", "base", "front", "css"];
// Front matter a brand layout can't default: they decide which brand, format and layout the file is.
const FIXED = ["brand", "format", "layout"];
const err = m => new Error(`[layouts] ${m}`);

// A file's front matter as {key: value} (one-line values, quotes and trailing comments dropped).
function front(text) {
  const m = /^﻿?---\n([\s\S]*?)\n---/.exec(String(text || "").replace(/\r\n/g, "\n")), o = {};
  for (const l of (m ? m[1] : "").split("\n")) { const k = /^([\w-]+):\s*(.*?)\s*$/.exec(l); if (k && k[2]) o[k[1]] = k[2].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, ""); }
  return o;
}

// The output's format and its page layout from front matter: `format:` first, then `layout:` when it names a format (the old
// spelling). Throws when the two name different formats.
function pick(fm) {
  const clean = v => v == null ? null : String(v).trim().replace(/^["']|["']$/g, "") || null;
  const f = clean(fm.format), l = clean(fm.layout);
  if (f && l && FORMATS.includes(l) && l !== f) throw err(`format: ${f} and layout: ${l} disagree (layout: ${l} is the old spelling of format: ${l}); keep one`);
  return { format: f || (FORMATS.includes(l) ? l : null), layout: l && !FORMATS.includes(l) ? l : null };
}

// The Prism default layouts for a format, standard first.
function defaults(format = "sheet") {
  const core = JSON.parse(fs.readFileSync(path.join(__dirname, "layouts.json"), "utf8"))[format] || {};
  const all = { standard: { name: "Standard", use: format === "sheet" ? "The title band, then the story in one column." : `The ${format} as it is.`,
    when: "Nothing else clearly leads the piece.", needs: [], base: "standard", front: {}, css: null, from: "core" } };
  for (const [k, v] of Object.entries(core)) all[k] = { name: v.name, use: v.use, when: v.when || "", needs: v.needs || [], base: k, front: {}, css: null, from: "core" };
  return all;
}

// A brand's own layouts for a format, from layouts/<format>/*.json beside its profile, checked.
function brandLayouts(brand, format, core) {
  const dir = brandDir(brand).dir, d = path.join(dir, "layouts", format), out = {};
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d).filter(f => f.endsWith(".json")).sort()) {
    const id = f.slice(0, -5), rel = `layouts/${format}/${f}`, at = `${brand}: ${rel}`;
    if (!ID.test(id)) throw err(`${at}: a layout id is lowercase letters, digits and hyphens`);
    if (FORMATS.includes(id)) throw err(`${at}: ${id} is a format (format: ${id}), so it can't be a layout id`);
    if (id === "standard") throw err(`${at}: a brand doesn't define standard; restyle it in the brand's layer`);
    let v; try { v = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); } catch (e) { throw err(`${at} is not valid JSON (${e.message})`); }
    if (!v || typeof v !== "object" || Array.isArray(v)) throw err(`${at}: a layout is a JSON object`);
    const extra = Object.keys(v).filter(k => !KEYS.includes(k));
    if (extra.length) throw err(`${at}: ${extra.join(", ")} not known (a layout has ${KEYS.join(", ")})`);
    for (const k of ["name", "use"]) if (typeof v[k] !== "string" || !v[k].trim()) throw err(`${at}: no ${k}`);
    const needs = v.needs == null ? [] : v.needs;
    if (!Array.isArray(needs) || needs.some(n => !NEEDS.includes(n))) throw err(`${at}: needs is a list of ${NEEDS.join(", ")}`);
    // Replacing a default keeps that default's structure unless it names another base.
    const base = v.base == null ? (core[id] ? id : "standard") : v.base;
    if (!core[base]) throw err(`${at}: base ${base} is not a Prism default layout (${Object.keys(core).join(", ")})`);
    const fr = v.front == null ? {} : v.front;
    if (typeof fr !== "object" || Array.isArray(fr)) throw err(`${at}: front is an object of front matter defaults ("hero": "x-small")`);
    for (const [k, x] of Object.entries(fr)) {
      if (!/^[\w-]+$/.test(k) || !["string", "number", "boolean"].includes(typeof x)) throw err(`${at}: front.${k} must be one plain value`);
      if (FIXED.includes(k)) throw err(`${at}: front.${k}: a layout can't set ${k}`);
    }
    let css = null;
    if (v.css != null) {
      if (typeof v.css !== "string" || !/^[\w.-]+\.css$/.test(v.css)) throw err(`${at}: css names a .css file beside it ("${id}.css")`);
      if (!fs.existsSync(path.join(d, v.css))) throw err(`${at}: css ${v.css} is not in layouts/${format}/`);
      css = `layouts/${format}/${v.css}`;
    }
    out[id] = { name: v.name, use: v.use, when: v.when || "", needs: [...new Set([...core[base].needs, ...needs])], base, front: fr, css,
      cssFile: css ? path.join(dir, css) : null, file: rel, from: brand };
  }
  return out;
}

// Every layout a brand has for a format: its own first (one with a default's id replaces it), then the Prism defaults it
// hasn't switched off, standard last (what a piece takes when nothing else fits).
function load(brand, format = "sheet") {
  const core = defaults(format);
  if (!brand) return core;
  const pf = path.join(brandDir(brand).dir, "profile.json");
  if (!fs.existsSync(pf)) throw err(`no brand "${brand}"`);
  const prof = JSON.parse(fs.readFileSync(pf, "utf8")), own = brandLayouts(brand, format, core), all = { ...own };
  for (const [k, v] of Object.entries(core)) if (!all[k] && k !== "standard") all[k] = v;
  all.standard = core.standard;
  for (const [k, v] of Object.entries(((prof.layouts || {})[format]) || {})) {
    if (k === "standard") throw err(`${brand}: profile layouts.${format}.standard: standard can't be switched off; restyle it in the brand's layer`);
    if (v !== null) throw err(`${brand}: profile layouts.${format}.${k}: only null goes here (it switches a Prism default layout off); a brand layout is layouts/${format}/${k}.json`);
    if (!all[k]) throw err(`${brand}: profile layouts.${format}.${k} switches off a layout that doesn't exist`);
    delete all[k];
  }
  return all;
}

// What a format file lacks for its layout: front matter keys (the layout's own front defaults count), or a ::: rail block.
function missing(layout, fm, md) {
  const body = String(md || "").replace(/\r\n/g, "\n").replace(/^﻿?---\n[\s\S]*?\n---\n?/, "");
  return (layout.needs || []).filter(n => n === "rail" ? !/^:{3,}\s*(\{[^}]*\.rail\b[^}]*\}|rail\b)/m.test(body) : fm[n] == null || !String(fm[n]).trim());
}
const needText = n => n === "rail" ? "a ::: rail block" : `${n}: in the front matter`;

module.exports = { load, defaults, missing, needText, pick, front, FORMATS, NEEDS };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const format = opt("--format") || "sheet";
  let brand, all; try { brand = opt("--brand") || defaultBrand(); all = load(brand, format); } catch (e) { console.error(e.message); process.exit(2); }
  const own = (() => { try { return JSON.parse(fs.readFileSync(path.join(brandDir(brand).dir, "profile.json"), "utf8")).own || {}; } catch { return {}; } })();
  for (const [k, v] of Object.entries(all)) for (const f of [v.file, v.css].filter(Boolean)) if (!own[f]) console.error(`[layouts] ${brand}: ${f} is not pinned yet (run.sh pin ${brand})`);
  const rows = Object.entries(all).map(([id, v]) => ({ id, name: v.name, from: v.from, base: v.base, needs: v.needs, use: v.use, when: v.when, ...(v.from !== "core" ? { front: v.front, css: v.css } : {}) }));
  if (a.includes("--json")) { console.log(JSON.stringify(Object.fromEntries(rows.map(({ id, ...r }) => [id, r])), null, 1)); process.exit(0); }
  console.log(`${format} layouts for ${brand}: the brand's own first, then the Prism default layouts, standard last`);
  for (const r of rows) console.log(`${r.id}: ${r.name} (${r.from === "core" ? "Prism default" : r.from})${r.base !== r.id ? ` · base ${r.base}` : ""}${r.needs.length ? ` · needs ${r.needs.join(", ")}` : ""}\n  ${r.use}\n  when: ${r.when || "-"}`);
}
