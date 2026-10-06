#!/usr/bin/env node
// Resolves core prism- roles to a brand's values through its profile (brands/<id>/profile.json).
// Usage: resolve.js <brand|default> [--out DIR] [--live DIR] [--get ROLE [--theme dark]]
// Builds always use the bundled snapshot; --live only compares a fetched design system against it.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const KIT = __dirname;
// Draft brands from onboarding live in the workspace, beside .prism-kit, until a release ships them (PRISM_DRAFTS overrides).
const DRAFTS = process.env.PRISM_DRAFTS || path.join(path.dirname(KIT), ".prism", "brands");
const hasProfile = (d, b) => fs.existsSync(path.join(d, b, "profile.json"));
// Where a brand lives: a workspace draft wins over the shipped brand of the same id, so a re-run can be previewed.
function brandDir(id) {
  if (fs.existsSync(DRAFTS) && hasProfile(DRAFTS, id)) return { dir: path.join(DRAFTS, id), draft: true };
  return { dir: path.join(KIT, "brands", id), draft: false };
}
// Every brand this kit can build in: [{id, dir, draft, shipped}], sorted by id.
function brandList() {
  const ids = new Set(), list = d => (fs.existsSync(d) ? fs.readdirSync(d).filter(b => hasProfile(d, b)) : []);
  const shipped = new Set(list(path.join(KIT, "brands")));
  for (const b of [...shipped, ...list(DRAFTS)]) ids.add(b);
  return [...ids].sort().map(id => ({ id, ...brandDir(id), shipped: shipped.has(id) }));
}
const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

function load(id, opts = {}) {
  const { dir, draft } = brandDir(id), snap = path.join(dir, "snapshot");
  if (!fs.existsSync(path.join(dir, "profile.json"))) throw new Error(`no brand profile "${id}" in ${path.join(KIT, "brands")} or ${DRAFTS}`);
  const prof = JSON.parse(fs.readFileSync(path.join(dir, "profile.json"), "utf8"));
  const core = JSON.parse(fs.readFileSync(path.join(KIT, "roles.json"), "utf8")).roles;
  const errors = [], warnings = [];
  if (draft) warnings.push(`draft: ${id} is built from ${dir}, not from a release; onboarding is not finished until the bundle ships`);

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
  // Builds use the profile's `theme` (else the design system's first); the others stay available by id. `first` stays the
  // design system's own first theme: a single-value token belongs to it.
  const dsThemes = T.color.themes.map(t => t.id), first = dsThemes[0];
  if (prof.theme != null && !dsThemes.includes(prof.theme)) errors.push(`profile theme "${prof.theme}" is not a theme of the design system (${dsThemes.join(", ")})`);
  const themes = dsThemes.includes(prof.theme) ? [prof.theme, ...dsThemes.filter(t => t !== prof.theme)] : dsThemes;
  const colors = Object.fromEntries(T.color.tokens.map(t => [t.name, typeof t.value === "string" ? { [first]: t.value } : t.value]));
  const color = (name, theme, depth = 0) => {
    const v = colors[name]; if (!v || depth > 16) return null;
    // A token missing in a theme takes the build theme's value, then the design system's first, then any it has.
    const x = v[theme] ?? v[themes[0]] ?? v[first] ?? Object.values(v)[0]; const m = /^\{(.+)\}$/.exec(x || "");
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
    if (native == null) { if (r.required) errors.push(`required role unmapped: ${r.role}`); continue; }
    let value = null;
    if (r.kind === "color") { value = Object.fromEntries(themes.map(t => [t, color(native, t)])); if (!value[themes[0]]) value = null; }
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
  // An unmapped optional role takes its fallback role's value (a chain ends at a required role) or core's neutral default,
  // so builders never meet a missing role. Roles with neither stay unmapped: only brand code or markup that names them reads them.
  for (let changed = true; changed;) {
    changed = false;
    for (const r of core) {
      if (out[r.role] || prof.roles[r.role] != null) continue;
      if (r.fallback && out[r.fallback]) { out[r.role] = { kind: r.kind, native: null, from: r.fallback, value: JSON.parse(JSON.stringify(out[r.fallback].value)) }; changed = true; }
      else if (r.default != null) { out[r.role] = { kind: r.kind, native: null, from: "core default", value: r.kind === "color" ? Object.fromEntries(themes.map(t => [t, r.default])) : r.default }; changed = true; }
    }
  }
  for (const r of core) if (!out[r.role] && prof.roles[r.role] == null && !r.required) warnings.push(`optional role unmapped: ${r.role}`);
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
    // Components the design system added since this release (a testimonial block, say): each one is for onboarding to add.
    const had = prof.source && prof.source.components, cdir = path.join(L, "components");
    if (had && fs.existsSync(cdir)) {
      const now = fs.readdirSync(cdir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
      for (const c of now.filter(c => !had.includes(c))) warnings.push(`design system changed since this release: new component ${c}`);
      for (const c of had.filter(c => !now.includes(c))) warnings.push(`design system changed since this release: component ${c} removed`);
    }
  }
  // Every colour token in the design system, aliases resolved per theme, for the brand's own layers (--brand-<name>).
  const native = Object.fromEntries(Object.keys(colors).map(n => [n, Object.fromEntries(themes.map(t => [t, color(n, t)]))]));
  return { components: prof.components || {}, brand: prof.id, name: prof.name, draft, themes, theme: themes[0], roles: out, native, options: prof.options || {}, layers: prof.layers || {}, ornamentsFile: prof.ornaments_module ? path.join(dir, prof.ornaments_module) : null, dir, ornaments: prof.ornaments, icons: prof.icons, office: prof.office ? { ...prof.office, paths: Object.keys(prof.office.files || {}).map(f => path.join(dir, f)) } : null, content: prof.content || {}, m365: prof.m365 || null,
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

// The brand a piece uses when it names none: the one shipped profile marked "default": true (or the only brand shipped).
// Drafts never count: a piece is only built in a draft brand when it names it.
function defaultBrand() {
  const dir = path.join(KIT, "brands"), ids = fs.readdirSync(dir).filter(b => hasProfile(dir, b));
  const marked = ids.filter(b => JSON.parse(fs.readFileSync(path.join(dir, b, "profile.json"), "utf8")).default === true);
  if (marked.length === 1) return marked[0];
  if (!marked.length && ids.length === 1) return ids[0];
  throw new Error(`[brand] ${marked.length ? "more than one brand is" : "no brand is"} marked "default": true in kit/brands; name one with brand: in the front matter`);
}

module.exports = { load, css, defaultBrand, brandDir, brandList, DRAFTS };

if (require.main === module) {
  const a = process.argv.slice(2), id = a[0] === "default" ? defaultBrand() : a[0], opt = k => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : null; };
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
  const unmapped = res.warnings.filter(w => w.startsWith("optional")).length, drift = res.warnings.filter(w => w.startsWith("design system changed")).length;
  console.log(`[brand] ${res.name}${res.draft ? " (draft)" : ""}: ${Object.keys(res.roles).length} roles resolved${unmapped ? `, ${unmapped} optional unmapped` : ""}${drift ? `, ${drift} drift warning(s)` : ""} -> ${out}`);
}
