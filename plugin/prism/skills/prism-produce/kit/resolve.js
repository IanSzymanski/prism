#!/usr/bin/env node
// Resolves core prism- roles to a brand's values through its profile (brands/<id>/profile.json).
// Usage: resolve.js <brand> [--out DIR] [--live DIR] [--get ROLE [--theme dark]]
// Builds always use the bundled snapshot; --live only compares a fetched design system against it.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const KIT = __dirname;
const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

function load(id, opts = {}) {
  const dir = path.join(KIT, "brands", id), snap = path.join(dir, "snapshot");
  if (!fs.existsSync(path.join(dir, "profile.json"))) throw new Error(`no brand profile "${id}" in ${path.join(KIT, "brands")}`);
  const prof = JSON.parse(fs.readFileSync(path.join(dir, "profile.json"), "utf8"));
  const core = JSON.parse(fs.readFileSync(path.join(KIT, "roles.json"), "utf8")).roles;
  const errors = [], warnings = [];

  // 1. The snapshot must be complete and unchanged, or the brand would be approximated.
  for (const [f, h] of Object.entries(prof.snapshot.files)) {
    const p = path.join(snap, f);
    if (!fs.existsSync(p)) errors.push(`snapshot file missing: ${f}`);
    else if (sha(p) !== h) errors.push(`snapshot file changed: ${f}`);
  }
  if (sha(path.join(dir, prof.digest.file)) !== prof.digest.sha256) errors.push(`digest changed: ${prof.digest.file}`);
  for (const [f, h] of Object.entries(prof.own || {})) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) errors.push(`brand file missing: ${f}`); else if (sha(p) !== h) errors.push(`brand file changed: ${f}`);
  }
  for (const [f, h] of Object.entries((prof.office && prof.office.files) || {})) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) errors.push(`office font missing: ${f}`); else if (sha(p) !== h) errors.push(`office font changed: ${f}`);
  }
  if (errors.length) return { errors, warnings };

  // 2. Read the design system's tokens in its own format.
  const T = JSON.parse(fs.readFileSync(path.join(snap, "tokens.json"), "utf8"));
  const themes = T.color.themes.map(t => t.id), first = themes[0];
  const colors = Object.fromEntries(T.color.tokens.map(t => [t.name, typeof t.value === "string" ? { [first]: t.value } : t.value]));
  const color = (name, theme, depth = 0) => {
    const v = colors[name]; if (!v || depth > 16) return null;
    const x = v[theme] ?? v[first]; const m = /^\{(.+)\}$/.exec(x || "");
    return m ? color(m[1], theme, depth + 1) : x;
  };
  const lists = {};
  for (const fam of Object.keys(T)) if (T[fam] && Array.isArray(T[fam].tokens) && fam !== "color") for (const t of T[fam].tokens) lists[t.name] = t.value;
  const styles = {};
  for (const g of T.type.groups) for (const s of g.styles) styles[s.name] = { family: s.family || g.family, ...s };
  const firstFamily = stack => stack.split(",")[0].trim().replace(/^["']|["']$/g, "");

  // 3. Each core role, through the profile, to a value.
  const out = {};
  for (const r of core) {
    const native = prof.roles[r.role];
    if (native == null) { (r.required ? errors : warnings).push(`${r.required ? "required" : "optional"} role unmapped: ${r.role}`); continue; }
    let value = null;
    if (r.kind === "color") { value = Object.fromEntries(themes.map(t => [t, color(native, t)])); if (!value[first]) value = null; }
    else if (r.kind === "font") {
      const stack = T.type.families[native];
      if (stack) value = { stack, files: T.type.fonts.filter(f => f.family === firstFamily(stack)).map(f => ({ ...f, path: path.join(snap, f.file) })) };
    }
    else if (r.kind === "type") { const s = styles[native]; if (s) value = { ...s, stack: T.type.families[s.family] }; }
    else if (["space", "radius", "shadow"].includes(r.kind)) value = lists[native] ?? null;
    else if (r.kind === "asset") { const own = native.startsWith("own:"), p = own ? path.join(dir, native.slice(4)) : path.join(snap, native); if (fs.existsSync(p)) value = { path: p, blob: own ? null : prof.snapshot.blobs[native] || null, own }; }
    else if (r.kind === "generator") {
      const g = prof.generators[native];
      if (g) value = { ...g, script: path.join(snap, g.script), stroke: { ...g.stroke, value: g.stroke && out[g.stroke.color] ? out[g.stroke.color].value : null } };
    }
    if (value == null) { errors.push(`role ${r.role} maps to "${native}", which the design system does not define`); continue; }
    out[r.role] = { kind: r.kind, native, value };
  }
  // The brand's image library: reusable photos uploaded to the design system (profile `library`), pinned in the snapshot.
  const library = {};
  for (const [lid, e] of Object.entries((prof.library && prof.library.images) || {})) {
    if (!/^[a-z0-9-]+$/.test(lid)) { errors.push(`library image id "${lid}" must be lowercase letters, digits and hyphens`); continue; }
    const p = path.join(snap, e.file || "");
    if (!e.file || !fs.existsSync(p) || !prof.snapshot.files[e.file]) { errors.push(`library image ${lid}: ${e.file} is not in the pinned snapshot`); continue; }
    library[lid] = { ...e, path: p, blob: prof.snapshot.blobs[e.file] || null };
  }
  // A generator's stroke may name a role resolved after it.
  for (const v of Object.values(out)) if (v.kind === "generator" && v.value.stroke && !v.value.stroke.value) v.value.stroke.value = out[v.value.stroke.color]?.value ?? null;

  // 4. Optional live comparison: warn on drift, never block.
  if (opts.live) {
    const L = fs.existsSync(path.join(opts.live, "project")) ? path.join(opts.live, "project") : opts.live;
    const idxp = path.join(L, "design-system.json");
    const live = fs.existsSync(idxp) ? JSON.parse(fs.readFileSync(idxp, "utf8")) : null;
    const liveBlobs = live ? Object.fromEntries(Object.entries(live.assetGroups || {}).flatMap(([g, v]) => Object.entries(v.files || {}).map(([f, r]) => [`assets/${g}/${f}`, r.blob]))) : {};
    const blobs = prof.snapshot.blobs;
    for (const [f, h] of Object.entries(prof.snapshot.files)) {
      if (f === "design-system.json") continue;
      if (blobs[f]) { if (liveBlobs[f] !== blobs[f]) warnings.push(`design system changed since this release: ${f} (${liveBlobs[f] ? "replaced" : "removed"})`); continue; }
      const p = path.join(L, f);
      if (!fs.existsSync(p)) warnings.push(`design system changed since this release: ${f} (removed)`);
      else if (sha(p) !== h) warnings.push(`design system changed since this release: ${f}`);
    }
  }
  // Every colour token in the design system, aliases resolved per theme, for the brand's own layers (--brand-<name>).
  const native = Object.fromEntries(Object.keys(colors).map(n => [n, Object.fromEntries(themes.map(t => [t, color(n, t)]))]));
  return { brand: prof.id, name: prof.name, themes, roles: out, native, options: prof.options || {}, layers: prof.layers || {}, ornamentsFile: prof.ornaments_module ? path.join(dir, prof.ornaments_module) : null, dir, ornaments: prof.ornaments, icons: prof.icons, office: prof.office ? { ...prof.office, paths: Object.keys(prof.office.files || {}).map(f => path.join(dir, f)) } : null, content: prof.content || {}, m365: prof.m365 || null,
           library, libraryGroup: (prof.library && prof.library.group) || null, digest: path.join(dir, prof.digest.file), errors, warnings };
}

// CSS for page builders: --prism-* custom properties per theme, a class per type role, @font-face per font file.
// A px length that is really a third of a pixel (every pt size: 16pt = 21.333...px) is written as an exact fraction,
// so layouts that multiply it (30em measures, line heights) land on the same pixel as the brand's pt values.
const exact = v => String(v).replace(/(-?\d+\.\d+)px/g, (m, n) => { const x = parseFloat(n), t = Math.round(x * 3);
  return Math.abs(x * 3 - t) < 0.003 && t % 3 !== 0 ? `calc(${t}px / 3)` : m; });
function css(res) {
  const [first, ...rest] = res.themes, R = Object.entries(res.roles), v = n => `--${n}`;
  const lines = [`/* ${res.name} through its Prism profile. Generated by resolve.js; do not edit. */`, ":root{"];
  for (const [n, r] of R) {
    if (r.kind === "color") { lines.push(`  ${v(n)}:${r.value[first]};`); for (const t of rest) lines.push(`  ${v(n)}-${t}:${r.value[t]};`); }
    else if (r.kind === "asset") lines.push(`  ${v(n)}:url("file://${r.value.path}");`);
    else if (r.kind === "font") lines.push(`  ${v(n)}:${r.value.stack};`);
    else if (["space", "radius", "shadow"].includes(r.kind)) lines.push(`  ${v(n)}:${r.kind === "shadow" ? r.value : exact(r.value)};`);
  }
  lines.push("}");
  for (const t of rest) {
    lines.push(`[data-theme="${t}"]{`);
    for (const [n, r] of R) if (r.kind === "color" && r.value[t] !== r.value[first]) lines.push(`  ${v(n)}:${r.value[t]};`);
    lines.push("}");
  }
  // Type roles as variables core stylesheets use: --prism-type-body (font shorthand), and -family, -size, -lh, -weight, -ls.
  lines.push(":root{");
  for (const [n, r] of R) if (r.kind === "type") {
    const s = r.value;
    const size = exact(s.fontSize);
    lines.push(`  ${v(n)}:${s.fontWeight} ${size}/${s.lineHeight} ${s.stack};${v(n)}-family:${s.stack};${v(n)}-size:${size};${v(n)}-lh:${s.lineHeight};${v(n)}-weight:${s.fontWeight};${v(n)}-ls:${s.letterSpacing || "normal"};`);
  }
  // The brand's own colour tokens, for its layers only (core never uses --brand-*).
  for (const [n, val] of Object.entries(res.native || {})) { lines.push(`  --brand-${n}:${val[first]};`); for (const t of rest) lines.push(`  --brand-${n}-${t}:${val[t]};`); }
  lines.push("}");
  for (const [n, r] of R) if (r.kind === "type") {
    const s = r.value, ls = s.letterSpacing ? `;letter-spacing:${s.letterSpacing}` : "";
    lines.push(`.${n}{font:${s.fontWeight} ${s.fontSize}/${s.lineHeight} ${s.stack}${ls}}`);
  }
  // Each file covers the weights nearest it (400, 500, 600 -> 100-449, 450-549, 550-900), so every requested weight finds its cut.
  const seen = new Set();
  for (const [, r] of R) if (r.kind === "font") {
    const files = r.value.files.filter(f => !seen.has(f.path) && seen.add(f.path)).sort((a, b) => parseInt(a.weight) - parseInt(b.weight));
    files.forEach((f, i) => {
      const w = parseInt(f.weight), lo = i ? Math.floor((parseInt(files[i - 1].weight) + w) / 2) : 100, hi = i < files.length - 1 ? Math.floor((w + parseInt(files[i + 1].weight)) / 2) - 1 : 900;
      const fmt = /\.woff2$/.test(f.path) ? "woff2" : /\.woff$/.test(f.path) ? "woff" : /\.otf$/.test(f.path) ? "opentype" : "truetype";
      lines.push(`@font-face{font-family:"${f.family}";src:url("file://${f.path}") format("${fmt}");font-weight:${String(f.weight).includes(" ") ? f.weight : `${lo} ${hi}`};font-style:${f.style || "normal"}}`);
    });
  }
  return lines.join("\n") + "\n";
}

module.exports = { load, css };

if (require.main === module) {
  const a = process.argv.slice(2), id = a[0], opt = k => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : null; };
  if (!id) { console.error("usage: resolve.js <brand> [--out DIR] [--live DIR] [--get ROLE [--theme T]]"); process.exit(2); }
  const res = load(id, { live: opt("--live") });
  for (const w of res.warnings.filter(w => !w.startsWith("optional"))) console.warn(`[brand] ${w}`);
  if (res.errors.length) { for (const e of res.errors) console.error(`[brand] ${e}`); console.error(`[brand] ${id}: cannot build; never approximate the brand`); process.exit(1); }
  if (opt("--get")) {
    const r = res.roles[opt("--get")]; if (!r) { console.error(`[brand] unknown or unmapped role ${opt("--get")}`); process.exit(1); }
    const t = opt("--theme"); console.log(typeof r.value === "object" ? JSON.stringify(t && r.kind === "color" ? r.value[t] : r.value) : r.value);
    process.exit(0);
  }
  const out = opt("--out") || path.join(".prism", "brand", id);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "resolved.json"), JSON.stringify(res, null, 1));
  fs.writeFileSync(path.join(out, "prism.css"), css(res));
  const unmapped = res.warnings.filter(w => w.startsWith("optional")).length;
  console.log(`[brand] ${res.name}: ${Object.keys(res.roles).length} roles resolved${unmapped ? `, ${unmapped} optional unmapped` : ""}${res.warnings.length - unmapped ? `, ${res.warnings.length - unmapped} drift warning(s)` : ""} -> ${out}`);
}
