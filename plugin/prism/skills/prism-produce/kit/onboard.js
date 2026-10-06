#!/usr/bin/env node
// Brand onboarding (D11): drafts a brand profile from a design system into the workspace (.prism/brands/<id>/), reports what is
// mapped and what is not, and packs the finished draft as a bundle a maintainer adds to a release. Never writes to kit/brands.
// Usage:
//   onboard.js start <id> <design-system-dir> [--name N] [--url URL] [--theme T] [--outputs a,b] [--audience A] [--contact C] [--email-sender E] [--force]
//   onboard.js map <id> <role>=<native|-> ... [theme=<id|->]   (- unmaps; an assets/ path is copied into the snapshot from the source)
//   onboard.js report <id> [--json]
//   onboard.js bundle <id> OUT.zip
//   onboard.js update <id> [<design-system-dir>]    (a shipped brand's design system or client rules changed: a draft with what moved)
//   onboard.js component <id> <cid> --use T --markup M [--when T] [--max N] [--rule T ...] [--formats a,b] [--sample FILE] [--from NAME] [--remove]
//   onboard.js palette <id> [--keep]                 (core's proposal for the email palette, or keep it against the current colours)
const fs = require("fs"), path = require("path"), crypto = require("crypto"), { execFileSync } = require("child_process");
const R = require("./resolve.js");
const KIT = __dirname, CORE = JSON.parse(fs.readFileSync(path.join(KIT, "roles.json"), "utf8")).roles;
const STUB = "<!-- onboarding: digest not written yet -->";
const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const die = m => { console.error(`[onboard] ${m}`); process.exit(1); };
const today = () => new Date().toISOString().slice(0, 10);

// ---------- Reading a design system (Claude Design System layout: tokens.json, README.md, design-system.json, fonts/, assets/) ----------
function dsRoot(d) {
  const r = fs.existsSync(path.join(d, "project", "tokens.json")) ? path.join(d, "project") : d;
  if (!fs.existsSync(path.join(r, "tokens.json"))) die(`no tokens.json in ${d}: Prism reads a design system's tokens.json (its own list format)`);
  return r;
}
function readTokens(root) {
  const T = JSON.parse(fs.readFileSync(path.join(root, "tokens.json"), "utf8")), miss = [];
  if (!T.color || !Array.isArray(T.color.themes) || !Array.isArray(T.color.tokens)) miss.push("color.themes and color.tokens");
  if (!T.type || !T.type.families || !Array.isArray(T.type.groups)) miss.push("type.families and type.groups");
  if (miss.length) die(`tokens.json is missing ${miss.join(", ")}`);
  T.type.fonts = T.type.fonts || [];
  return T;
}
// The design system's own components: the folders under components/ (each with its README and preview).
const dsComponents = root => fs.existsSync(path.join(root, "components")) ? fs.readdirSync(path.join(root, "components"), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort() : [];
// Native names by kind, with each token's own usage note, for matching and for the report.
function natives(T, root) {
  const list = fam => ((T[fam] && T[fam].tokens) || []).map(t => ({ name: t.name, usage: t.usage || "", value: t.value }));
  const styles = T.type.groups.flatMap(g => g.styles.map(s => ({ name: s.name, usage: s.usage || "", value: `${s.fontSize || ""} ${s.family || g.family || ""}`.trim() })));
  return {
    color: list("color"), type: styles,
    font: Object.entries(T.type.families).map(([name, value]) => ({ name, value, usage: "" })),
    space: [...list("spacing"), ...list("space")], radius: list("radius"), shadow: list("shadow"),
    asset: walk(path.join(root, "assets")).filter(f => !/\.(js|md|json)$/i.test(f)).map(f => ({ name: path.relative(root, f).split(path.sep).join("/"), usage: "", value: "" })),
  };
}

// ---------- Matching core roles to native names (only the obvious ones; the rest are left for Claude and the person) ----------
const SYN = {
  "color-surface": ["surface", "paper", "page", "background", "bg", "ground", "canvas"], "color-text-strong": ["ink", "fg", "foreground", "text-strong", "heading", "text-primary"],
  "color-text": ["body", "text", "text-body", "copy"], "color-text-muted": ["muted", "text-muted", "secondary", "text-secondary", "subtle"],
  "color-text-faint": ["faint", "text-faint", "tertiary"], "color-text-meta": ["meta", "text-meta"], "color-accent": ["accent", "primary", "brand"],
  "color-accent-strong": ["accent-strong", "accent-hot", "primary-strong"], "color-eyebrow-on-dark": ["eyebrow-on-dark", "dark-muted", "on-dark-muted"],
  "color-rule": ["rule", "hair", "line", "border", "hairline"], "color-rule-soft": ["rule-soft", "hair-soft", "line-soft", "border-soft", "line", "border"],
  "color-link-line": ["link-line", "accent-line", "link-underline"], "color-wash": ["wash", "accent-wash"], "color-wash-2": ["wash-2"],
  "color-tint": ["tint", "accent-tint", "accent-soft"], "color-tint-line": ["tint-line", "accent-line"], "color-band": ["band", "soft"],
  "color-code": ["code", "code-bg"], "color-pre": ["pre", "code-block", "code"], "color-chart-grid": ["grid", "chart-grid", "gridline"], "color-desk": ["desk", "backdrop"],
  "color-dark-surface": ["dark-surface", "dark-card", "dark", "inverse"], "color-dark-deep": ["dark-deep"], "color-dark-high": ["dark-high"],
  "color-dark-glow": ["dark-glow"], "color-dark-glow-2": ["dark-glow-2"], "color-rule-on-dark": ["rule-on-dark", "dark-rule", "dark-line"],
  "color-text-on-photo": ["text-on-photo", "photo-text", "on-photo", "dark-fg"],
  "font-serif": ["serif", "display", "heading", "headline"], "font-sans": ["sans", "body", "text", "base"], "font-mono": ["mono", "code", "monospace"],
  "type-title": ["title", "display", "masthead"], "type-heading-1": ["heading-1", "h1"], "type-heading-2": ["section", "heading-2", "h2"], "type-heading-3": ["heading-3", "h3"],
  "type-cta-heading": ["cta-heading"], "type-quote": ["quote", "pull-quote", "blockquote"], "type-stat": ["stat", "metric", "figure"], "type-card-title": ["card-title"],
  "type-lede": ["lede", "lead", "intro"], "type-body": ["body", "text", "paragraph"], "type-small": ["small", "footnote"], "type-eyebrow": ["eyebrow", "overline", "kicker"],
  "type-eyebrow-on-dark": ["eyebrow-on-dark", "cta-eyebrow", "eyebrow"], "type-label": ["label", "h4"], "type-caption": ["caption"], "type-cite": ["cite", "attribution", "citation"],
  "space-paragraph": ["space", "space-paragraph", "paragraph"], "space-heading-gap": ["space-gap", "heading-gap"], "space-section": ["space-section", "section"],
  "space-page-x": ["page-x", "margin-x", "page-margin"], "space-page-top": ["page-top", "margin-top"],
  "radius-code": ["radius-xs", "radius-code"], "radius-button": ["radius-sm", "radius-button"], "radius-card": ["radius-md", "radius-card", "radius"],
  "radius-figure": ["radius-lg", "radius-figure"], "radius-hero": ["radius-xl", "radius-hero", "radius-lg"],
  "shadow-lift": ["shadow-lift", "shadow"], "shadow-sheet": ["shadow-sheet"], "shadow-screen": ["shadow-screen"],
};
for (let i = 1; i <= 5; i++) SYN[`color-chart-${i}`] = [`series-${i}`, `chart-${i}`, `data-${i}`, `viz-${i}`];
for (const t of ["light", "mist", "deep", "vivid"]) for (let i = 1; i <= 4; i++) SYN[`color-header-${t}-${i}`] = [`header-${t}-${i}`];
// When no name fits, a token's own usage note can: used only when exactly one token's note matches.
const USAGE = { "color-accent": /\bbrand (hue|colou?r)\b|\bprimary brand\b/i, "color-accent-strong": /highlight gradient/i, "color-eyebrow-on-dark": /eyebrow on dark/i,
  "color-text-on-photo": /over (the )?(dark fade of a )?.*photo/i, "color-wash": /\bwash\b/i, "type-eyebrow-on-dark": /eyebrow on (the )?dark/i };
// Asset roles by file name: logos by their light/dark variant, the glyph alone, test photos by tone.
const ASSET = {
  "asset-logo": f => /logo/i.test(f) && !/(light|white|reverse|inverse|on-dark|mono|glyph|mark)/i.test(path.basename(f)),
  "asset-logo-on-dark": f => /logo/i.test(f) && /(light|white|reverse|inverse|on-dark)/i.test(path.basename(f)) && !/mono/i.test(path.basename(f)),
  "asset-mark": f => /(glyph|symbol|logomark|\bmark)/i.test(path.basename(f)) && !/(mono|light|white)/i.test(path.basename(f)),
  "asset-placeholder": f => /(placeholder|sample)/i.test(path.basename(f)) && !/dark/i.test(path.basename(f)),
  "asset-placeholder-dark": f => /(placeholder|sample)/i.test(path.basename(f)) && /dark/i.test(path.basename(f)),
};
// A prefix every native name shares (acme-ink, acme-paper) is ignored when matching.
const prefixOf = names => { const p = names.map(n => (/^([a-z0-9]+-)/i.exec(n) || [])[1]); return p.length > 3 && p.every(x => x && x === p[0]) ? p[0] : ""; };
function match(N) {
  const out = {}, how = {};
  for (const r of CORE) {
    const key = r.role.slice(6), pool = N[r.kind] || [];
    if (r.kind === "asset") {
      const t = ASSET[key], hits = t ? pool.map(a => a.name).filter(t) : [];
      // SVG first (sharp at any size), then the shortest name (the plain variant).
      hits.sort((a, b) => (/\.svg$/i.test(b) - /\.svg$/i.test(a)) || (/landscape/i.test(b) - /landscape/i.test(a)) || a.length - b.length);
      if (hits.length) { out[r.role] = hits[0]; how[r.role] = "file name"; }
      continue;
    }
    if (r.kind === "generator") continue;
    // Each name is matched whole and without a prefix every name shares (acme-ink -> ink, radius-md -> md).
    const pre = prefixOf(pool.map(t => t.name)), byName = new Map([...pool.map(t => [t.name.toLowerCase(), t.name]), ...pool.map(t => [t.name.toLowerCase().slice(pre.length), t.name])]);
    if (byName.has(key.replace(/^[a-z]+-/, ""))) { out[r.role] = byName.get(key.replace(/^[a-z]+-/, "")); how[r.role] = "same name"; continue; }
    const s = (SYN[key] || []).find(n => byName.has(n));
    if (s) { out[r.role] = byName.get(s); how[r.role] = "usual name"; continue; }
    const hits = USAGE[key] ? pool.filter(t => USAGE[key].test(t.usage)) : [];
    if (hits.length === 1) { out[r.role] = hits[0].name; how[r.role] = "usage note"; }
  }
  // Prism draws the display face in the serif slot; a brand with one family uses it for both.
  if (!out["prism-font-serif"] && out["prism-font-sans"]) { out["prism-font-serif"] = out["prism-font-sans"]; how["prism-font-serif"] = "only family"; }
  if (!out["prism-color-text-meta"] && out["prism-color-text-muted"]) { out["prism-color-text-meta"] = out["prism-color-text-muted"]; how["prism-color-text-meta"] = "same as muted"; }
  return { roles: out, how };
}

// The theme builds use: the design system's first, unless its surface is dark there and another theme's is light (print grounds
// are light). The surface is read through aliases ({neutral-0}) and in any CSS colour form; when it can't be read, a theme named
// light (or paper, print, day) beats one named dark. The profile's `theme` records the choice; `map <id> theme=<id>` changes it.
function lumOf(c) {
  let m = /^#([0-9a-f]{3,8})$/i.exec((c || "").trim()), r, g, b;
  if (m) { let h = m[1]; if (h.length <= 4) h = h.split("").map(x => x + x).join(""); [r, g, b] = [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16)); }
  else if ((m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(c || ""))) [r, g, b] = [m[1], m[2], m[3]].map(Number);
  else if ((m = /^oklch\(\s*([\d.]+)(%?)/i.exec(c || ""))) return m[2] ? m[1] / 100 : +m[1];
  else if ((m = /^hsla?\(\s*[\d.]+(?:deg)?[\s,]+[\d.]+%[\s,]+([\d.]+)%/i.exec(c || ""))) return m[1] / 100;
  else return null;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function buildTheme(T, roles) {
  const ids = T.color.themes.map(t => t.id), names = Object.fromEntries(T.color.themes.map(t => [t.id, `${t.id} ${t.name || ""}`]));
  const toks = Object.fromEntries(T.color.tokens.map(t => [t.name, t.value]));
  const valueIn = (name, theme, depth = 0) => { const v = toks[name]; if (v == null || depth > 16) return null;
    const x = typeof v === "string" ? v : (v[theme] ?? v[ids[0]]); const a = /^\{(.+)\}$/.exec(x || ""); return a ? valueIn(a[1], theme, depth + 1) : x; };
  const lum = Object.fromEntries(ids.map(t => [t, roles["prism-color-surface"] ? lumOf(valueIn(roles["prism-color-surface"], t)) : null]));
  if (lum[ids[0]] != null) {
    if (lum[ids[0]] >= 0.5) return ids[0];
    const light = ids.filter(t => lum[t] != null && lum[t] >= 0.5).sort((a, b) => lum[b] - lum[a]);
    if (light.length) return light[0];
  }
  if (/\bdark|night/i.test(names[ids[0]])) { const l = ids.find(t => /light|paper|print|day/i.test(names[t])); if (l) return l; }
  return ids[0];
}

// ---------- Draft folder ----------
const draftDir = id => path.join(R.DRAFTS, id);
const readProf = id => { const f = path.join(draftDir(id), "profile.json"); if (!fs.existsSync(f)) die(`no draft "${id}" in ${R.DRAFTS} (start one with onboard.js start)`); return JSON.parse(fs.readFileSync(f, "utf8")); };
const writeProf = (id, p) => fs.writeFileSync(path.join(draftDir(id), "profile.json"), JSON.stringify(p, null, 1) + "\n");
const pin = id => execFileSync("node", [path.join(KIT, "pin.js"), id], { env: { ...process.env, PRISM_DRAFTS: R.DRAFTS }, stdio: ["ignore", "pipe", "inherit"] });
// Copies what a build needs from the design system into snapshot/: tokens, README, index, fonts, licences and the mapped assets.
function snapshotFrom(dir, root, prof) {
  const snap = path.join(dir, "snapshot");
  fs.rmSync(snap, { recursive: true, force: true });
  const keep = f => /^(tokens\.json|README\.md|design-system\.json)$/.test(f) || /^(fonts|licenses)\//.test(f);
  const files = walk(root).map(f => path.relative(root, f).split(path.sep).join("/")).filter(keep);
  for (const f of new Set([...files, ...assetsUsed(prof)])) copyIn(root, snap, f);
}
const assetsUsed = prof => [...Object.values(prof.roles).filter(v => /^assets\//.test(v)), ...Object.values(prof.generators || {}).map(g => g.script).filter(Boolean),
  ...Object.values((prof.library && prof.library.images) || {}).map(e => e.file).filter(Boolean)];
function copyIn(root, snap, f) {
  const src = path.join(root, f);
  if (!fs.existsSync(src)) die(`${f} is not in the design system`);
  fs.mkdirSync(path.dirname(path.join(snap, f)), { recursive: true });
  fs.copyFileSync(src, path.join(snap, f));
}
// Font names. A stack's CSS keywords (system-ui, ui-monospace, sans-serif) are not fonts anyone can install, and system fonts
// (Arial, Segoe UI, Menlo) are not on Google Fonts: neither goes into the web-font link, and keywords never become Office fonts.
const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|math|emoji|fangsong|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|-apple-system|BlinkMacSystemFont|inherit|initial)$/i;
const SYSTEM = /^(Arial|Helvetica|Helvetica Neue|Segoe UI|Georgia|Times|Times New Roman|Courier|Courier New|Consolas|Menlo|Monaco|SF Mono|SF Pro.*|Verdana|Tahoma|Trebuchet MS|Calibri|Cambria|Candara|Garamond|Palatino.*|Lucida.*|Liberation .*|DejaVu .*)$/i;
const OFFICE_SAFE = { sans: "Arial", serif: "Georgia", mono: "Consolas" };
// Fonts every Office install has; any other family needs its files in the snapshot to be an Office font.
const IN_OFFICE = /^(Arial|Calibri|Cambria|Candara|Consolas|Courier New|Georgia|Segoe UI|Tahoma|Times New Roman|Trebuchet MS|Verdana|Garamond|Palatino Linotype|Lucida Console)$/i;
const families = stack => (stack || "").split(",").map(f => f.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
const realFamily = stack => families(stack).find(f => !GENERIC.test(f)) || null;
// The family a role's stack really asks for, by font key (serif, sans, mono).
const brandFamily = (T, roles, k) => realFamily(T.type.families[roles[`prism-font-${k}`]]);

// Office fonts: the brand's own families, from the snapshot's TrueType or OpenType files (Office cannot install web fonts);
// a stack with no real family takes Office's own safe font for its kind.
function office(T, roles) {
  const fonts = {}, files = {};
  const hasFiles = f => T.type.fonts.some(x => x.family === f && /\.(ttf|otf)$/i.test(x.file));
  for (const k of ["serif", "sans", "mono"]) { const f = brandFamily(T, roles, k); fonts[k] = f && (hasFiles(f) || IN_OFFICE.test(f)) ? f : OFFICE_SAFE[k]; }
  for (const f of T.type.fonts) if (Object.values(fonts).includes(f.family) && /\.(ttf|otf)$/i.test(f.file)) files[`snapshot/${f.file}`] = "";
  return { fonts, files };
}
// Email font stacks: the brand's family, then Office-safe fallbacks; Outlook gets the safe fonts only. Web fonts load from
// Google Fonts, for families that are neither keywords nor system fonts; none means no web-font link.
function emailFonts(T, roles) {
  const st = k => T.type.families[roles[`prism-font-${k}`]] || "", fam = k => brandFamily(T, roles, k);
  const isSerif = s => families(s).some(f => /^serif$/i.test(f)) || /Georgia|Times/i.test(s);
  const q = f => (/\s/.test(f) ? `'${f}'` : f), lead = k => (fam(k) ? `${q(fam(k))},` : "");
  const sansSafe = "'Segoe UI',Helvetica,Arial,sans-serif", serifSafe = "Georgia,'Times New Roman',serif", monoSafe = "Consolas,'Courier New',monospace";
  const web = [...new Set(["sans", "serif", "mono"].map(fam).filter(f => f && !SYSTEM.test(f)))];
  const weights = f => [...new Set(T.type.fonts.filter(x => x.family === f).map(x => parseInt(x.weight) || 400))].sort((a, b) => a - b).join(";") || "400";
  // A family already in the safe fallbacks isn't named twice.
  const stack = (k, safe) => [...new Set(families(lead(k) + safe).map(q))].join(",");
  return {
    sans: stack("sans", sansSafe), serif: stack("serif", isSerif(st("serif")) ? serifSafe : sansSafe), mono: stack("mono", monoSafe),
    msoSans: "Arial,sans-serif", msoSerif: isSerif(st("serif")) ? "Georgia,serif" : "Arial,sans-serif",
    webfonts: web.length ? `https://fonts.googleapis.com/css2?${web.map(f => `family=${f.replace(/ /g, "+")}:wght@${weights(f)}`).join("&")}&display=swap` : null,
  };
}
// Re-derives the Office fonts and email stacks after a font role changes, field by field: a field still holding what was derived
// last time takes the new value; a field edited by hand keeps its edit (and the report says what it would have been).
function refreshFonts(T, prof) {
  const ob = prof._onboarding = prof._onboarding || {}, was = ob.derived_fonts || { office: prof.office && prof.office.fonts, email: prof.m365.email.fonts };
  const now = { office: office(T, prof.roles), email: emailFonts(T, prof.roles) }, kept = [];
  const merge = (cur = {}, before = {}, next = {}, label) => Object.fromEntries(Object.keys({ ...cur, ...next }).map(k => {
    if (cur[k] === undefined || JSON.stringify(cur[k]) === JSON.stringify(before[k])) return [k, next[k]];
    if (JSON.stringify(cur[k]) !== JSON.stringify(next[k])) kept.push(`${label}.${k} (derived would be ${JSON.stringify(next[k])})`);
    return [k, cur[k]];
  }).filter(([, v]) => v !== undefined));
  const fonts = merge(prof.office && prof.office.fonts, was.office, now.office.fonts, "office.fonts");
  // Office font files follow the families finally chosen, edited or not.
  prof.office = { ...(prof.office || {}), fonts };
  prof.office.files = Object.fromEntries(T.type.fonts.filter(f => Object.values(fonts).includes(f.family) && /\.(ttf|otf)$/i.test(f.file)).map(f => [`snapshot/${f.file}`, ""]));
  prof.m365.email.fonts = merge(prof.m365.email.fonts, was.email, now.email, "m365.email.fonts");
  ob.derived_fonts = { office: now.office.fonts, email: now.email };
  ob.kept_fonts = kept;
}
// The email palette: core's proposal from the brand's roles (D8), recomputed while it is still the proposal.
function proposePalette(id, prof) {
  const res = R.load(id);
  if (res.errors.length) return false;
  const c = n => res.roles[n].value[res.themes[0]];
  const { propose } = require("./palette.js"), { CLIENT_RULES } = require("./outlook-sim.js");
  const roles = ["prism-color-accent", "prism-color-text-strong", "prism-color-text", "prism-color-text-muted", "prism-color-tint", "prism-color-rule-soft"];
  const m = prof.m365.email;
  m.palette = propose(c); m.source_roles = Object.fromEntries(roles.map(r => [r, c(r)])); m.client_rules = CLIENT_RULES; m.proposed = true;
  return true;
}

// ---------- Report ----------
// Likely design-system names for a role without its own match, best first: words shared between the role (its name and
// description) and the token (its name and usage note), favouring tokens no role uses yet. Feeds the replacement questions.
const STOP = new Set(["the", "and", "a", "an", "of", "on", "in", "to", "for", "its", "it", "or", "with", "only", "one", "each", "every", "is", "at", "by", "prism", "color", "colour", "type", "space", "radius", "shadow", "asset"]);
const words = s => new Set(String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOP.has(w)));
function candidates(r, pool, used, theme) {
  const want = words(`${r.role} ${r.description}`), dark = /dark|on-photo/.test(r.role);
  return pool.map(t => {
    const have = words(`${t.name} ${t.usage}`), named = words(t.name);
    let score = 0; for (const w of want) { if (named.has(w)) score += 3; else if (have.has(w)) score += 1; }
    if (dark && /dark|inverse|night/i.test(`${t.name} ${t.usage}`)) score += 2;
    if (score && !used.has(t.name)) score += 1;
    const v = t.value && typeof t.value === "object" && !Array.isArray(t.value) ? (t.value[theme] ?? Object.values(t.value)[0]) : t.value;
    return { name: t.name, usage: t.usage, value: typeof v === "string" ? v : "", score };
  }).filter(c => c.score >= 3).sort((a, b) => b.score - a.score).slice(0, 3);
}

function report(id) {
  const prof = readProf(id), dir = draftDir(id), res = R.load(id), from = path.join(dir, fs.existsSync(path.join(dir, "source")) ? "source" : "snapshot");
  const N = natives(readTokens(from), from);
  const how = (prof._onboarding || {}).matched || {};
  const mapped = CORE.filter(r => prof.roles[r.role] != null), unmapped = CORE.filter(r => prof.roles[r.role] == null);
  const used = new Set(Object.values(prof.roles));
  const todo = [];
  if (fs.readFileSync(path.join(dir, prof.digest.file), "utf8").includes(STUB)) todo.push(`write digest.md from snapshot/README.md (the brand rules every agent reads), then run.sh pin ${id}`);
  if (unmapped.some(r => r.required)) todo.push(`map the required roles: ${unmapped.filter(r => r.required).map(r => r.role).join(", ")}`);
  if (!prof.roles["prism-generator-rule"]) todo.push("no rule generator: headings, dividers and threads use core's plain rules (fine unless the brand draws a motif)");
  if (!prof.layers || !Object.keys(prof.layers).length) todo.push("no layers: every component takes core's look in the brand's colours and type (fine to start; restyle or add components when the person asks)");
  for (const k of (prof._onboarding || {}).kept_fonts || []) todo.push(`kept your edit to ${k}; change it by hand if the new font role should win`);
  const terms = (prof.identity && prof.identity.terms) || [];
  if (!terms.length) todo.push("identity.terms is empty: list the words that identify the brand, so core never uses them");
  const pal = prof.m365 && prof.m365.email;
  let checks = [];
  if (pal && pal.palette) { const { check } = require("./palette.js"); checks = check(pal.palette.light); }
  const T = readTokens(path.join(dir, "snapshot")), themes = T.color.themes.map(t => t.id);
  return { id, name: prof.name, dir, source: prof.source, theme: { builds: res.theme || prof.theme || themes[0], all: themes }, outputs: (prof._onboarding || {}).outputs || [], errors: res.errors, mapped: mapped.map(r => ({ role: r.role, native: prof.roles[r.role], how: how[r.role] || "set by hand", value: res.roles && res.roles[r.role] ? res.roles[r.role].value : null, description: r.description })),
    unmapped: unmapped.map(r => ({ role: r.role, required: !!r.required, description: r.description, kind: r.kind, uses: res.roles && res.roles[r.role] ? res.roles[r.role].from : null,
      candidates: candidates(r, N[r.kind] || [], used, res.theme || themes[0]) })), unused: Object.fromEntries(Object.entries(N).map(([k, v]) => [k, v.filter(t => !used.has(t.name)).map(t => ({ name: t.name, usage: t.usage }))])),
    palette: pal ? { reviewed: pal.reviewed && pal.reviewed.onboarding, set: !!pal.palette, proposed: !!pal.proposed, failing: checks.filter(c => !c.ok).map(c => c.msg), webfonts: pal.fonts && pal.fonts.webfonts } : null, office: prof.office || null, terms, todo, gaps: prof._gaps || "",
    components: Object.entries(prof.components || {}).map(([k, c]) => ({ id: k, use: c.use || "", markup: c.markup || "", when: c.when || "", max: c.max || null, rules: c.rules || [], formats: c.formats || [] })) };
}
const short = v => v == null ? "" : typeof v === "string" ? v : v.stack ? v.stack : v.fontSize ? `${v.fontWeight} ${v.fontSize}/${v.lineHeight}` : v.path ? path.basename(v.path) : Object.values(v).join(" / ");
function reportMd(r) {
  const L = [`# ${r.name} (${r.id}): onboarding report`, "", `Draft: ${r.dir}`, `Design system: ${(r.source && r.source.url) || (r.source && r.source.title) || "local folder"}`, ""];
  L.push(`Builds in theme "${r.theme.builds}" of ${r.theme.all.map(t => `"${t}"`).join(", ")}${r.theme.all.length > 1 ? " (change with map <id> theme=<id>)" : ""}.`, "");
  if (r.outputs.length) L.push(`Outputs the brand will use: ${r.outputs.join(", ")}`, "");
  L.push(r.errors.length ? `**Does not build yet:**\n${r.errors.map(e => `- ${e}`).join("\n")}` : "Builds: yes (every required role resolves).", "");
  if (r.todo.length) L.push("## To do", ...r.todo.map(t => `- ${t}`), "");
  L.push(`## Mapped (${r.mapped.length} of ${r.mapped.length + r.unmapped.length})`, "| Role | Design system | Value | Matched by |", "|---|---|---|---|", ...r.mapped.map(m => `| ${m.role} | ${m.native} | ${short(m.value)} | ${m.how} |`), "");
  // One list for every role without its own match: what it uses now, and the design system's likely names for it. Roles with
  // candidates come first: they are the replacement questions for the person.
  if (r.unmapped.length) {
    const now = u => u.required ? "required, unmapped: builds stop" : u.uses ? `from ${u.uses.replace(/^prism-/, "")}` : "unmapped";
    const cand = u => u.candidates.length ? `; candidates: ${u.candidates.map(c => `\`${c.name}\`${c.value ? ` ${c.value}` : ""}${c.usage ? ` (${c.usage.slice(0, 60)})` : ""}`).join(", ")}` : "";
    const list = [...r.unmapped].sort((a, b) => (b.required - a.required) || (b.candidates.length > 0) - (a.candidates.length > 0));
    L.push("## Roles without their own match", "Map a candidate, keep what it takes now, or leave it; ask the person about the ones with candidates.", ...list.map(u => `- ${u.role} (${u.description.replace(/\.$/, "")}): ${now(u)}${cand(u)}`), "");
  }
  if (r.gaps) L.push(`Unmapped on purpose: ${r.gaps}`, "");
  const un = Object.entries(r.unused).filter(([, v]) => v.length);
  if (un.length) L.push("## Design system names no role uses", ...un.map(([k, v]) => `- ${k}: ${v.map(t => t.name + (t.usage ? ` (${t.usage.slice(0, 80)})` : "")).join("; ")}`), "");
  if (r.palette) L.push("## Email palette", r.palette.reviewed ? `Accepted at onboarding (${r.palette.reviewed}).` : !r.palette.set ? "Not proposed yet: it needs every required role." : r.palette.proposed ? "Core's proposal from the brand's colours (recomputed while the mapping changes)." : "Set by hand.", ...(r.palette.failing.length ? r.palette.failing.map(f => `- FAIL ${f}`) : ["- every check passes"]), r.palette.webfonts ? `- web fonts: ${r.palette.webfonts} (check these families are on Google Fonts)` : "- web fonts: none (the brand's families are system fonts or have no web source); emails use the font stacks as they are", "");
  if (r.office) L.push(`Office fonts: ${[...new Set(Object.values(r.office.fonts || {}))].join(", ") || "none"}${Object.keys(r.office.files || {}).length ? "" : " (no TrueType or OpenType files: decks fall back to Office's fonts)"}`);
  L.push(`Identity terms: ${r.terms.join(", ") || "none"}`);
  L.push(`Brand components: ${r.components.length ? "" : "none yet (core's components, and the closing card's full, centred and content-only styles)"}`);
  for (const c of r.components) L.push(`- ${c.id}: \`${c.markup}\` ${c.use}${c.when ? ` When: ${c.when}.` : ""}${c.max ? ` At most ${c.max} per piece.` : ""}${c.rules.length ? ` Rules: ${c.rules.join("; ")}.` : ""}${c.formats.length ? ` In: ${c.formats.join(", ")}.` : ""}`);
  return L.join("\n") + "\n";
}

// Code a bundle ships (layers, ornaments, generator scripts); for an update, only what differs from the shipped version.
function codeList(id, prof, ob) {
  const files = { ...Object.fromEntries(Object.entries(prof.own || {}).filter(([f]) => /\.(js|css)$/.test(f))),
    ...Object.fromEntries(Object.values(prof.generators || {}).map(g => [`snapshot/${g.script}`, prof.snapshot.files[g.script]])) };
  const old = ob.update_of ? JSON.parse(fs.readFileSync(path.join(KIT, "brands", id, "profile.json"), "utf8")) : null;
  const oldHash = f => old && (f.startsWith("snapshot/") ? old.snapshot.files[f.slice(9)] : (old.own || {})[f]);
  const list = Object.entries(files).filter(([f, h]) => !old || oldHash(f) !== h).map(([f]) => `- ${id}/${f}${old ? (oldHash(f) ? " (changed)" : " (new)") : ""}`);
  if (list.length) return list;
  return [old ? `- none changed since version ${ob.update_of}` : "- none (no layers, ornaments or generator)"];
}

// ---------- Commands ----------
const a = process.argv.slice(2), cmd = a[0], opt = k => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : null; };
if (cmd === "start") {
  const id = a[1], src = a[2];
  if (!id || !src) die("usage: onboard.js start <id> <design-system-dir> [--name N] [--url URL] [--outputs a,b] [--force]");
  if (!/^[a-z0-9-]+$/.test(id)) die("a brand id is lowercase letters, digits and hyphens");
  if (fs.existsSync(path.join(KIT, "brands", id)) ) die(`${id} is already a shipped brand: use onboard.js update ${id} <design-system-dir> for a changed design system`);
  const dir = draftDir(id);
  if (fs.existsSync(dir) && !a.includes("--force")) die(`a draft of ${id} already exists in ${dir} (--force starts it again)`);
  fs.rmSync(dir, { recursive: true, force: true });
  const root = dsRoot(src), T = readTokens(root), N = natives(T, root), m = match(N);
  // The design system as read, kept beside the draft so later mappings can copy files from it; never bundled.
  fs.mkdirSync(dir, { recursive: true }); fs.cpSync(root, path.join(dir, "source"), { recursive: true });
  const name = opt("--name") || T.name || id;
  const theme = opt("--theme") || buildTheme(T, m.roles);
  const prof = { schema: 1, id, name, version: 1,
    source: { kind: "claude-design-system", url: opt("--url") || null, title: T.name || name, snapshot_taken: today(), components: dsComponents(root), _note: "Optional live source. Builds always use snapshot/; the live system is only compared against it." },
    ...(theme && theme !== T.color.themes[0].id ? { theme } : {}), roles: m.roles, generators: {}, ornaments: {}, icons: { set: "phosphor", weight: "light" }, own: {}, digest: { file: "digest.md", sha256: "", readme_sha256: "" },
    content: Object.fromEntries([["audience", opt("--audience")], ["contact", opt("--contact")], ["email_sender", opt("--email-sender")]].filter(([, v]) => v)),
    options: {}, office: office(T, m.roles), m365: { email: { fonts: emailFonts(T, m.roles), logo_width: 168 } },
    library: { group: "Photos", images: {} }, identity: { terms: [name] },
    snapshot: { files: {}, blobs: {} },
    _onboarding: { started: today(), source: "source/", matched: m.how, derived_fonts: { office: office(T, m.roles).fonts, email: emailFonts(T, m.roles) }, outputs: (opt("--outputs") || "").split(",").map(s => s.trim()).filter(Boolean) } };
  snapshotFrom(dir, root, prof);
  fs.writeFileSync(path.join(dir, "digest.md"), `${STUB}\n# ${name} brand rules\n\nWrite the rules every agent needs from snapshot/README.md: voice, claims, visual do's and don'ts.\n`);
  writeProf(id, prof); pin(id);
  const p2 = readProf(id); if (proposePalette(id, p2)) writeProf(id, p2);
  process.stdout.write(reportMd(report(id)));
} else if (cmd === "map") {
  const id = a[1], prof = readProf(id), dir = draftDir(id), how = ((prof._onboarding = prof._onboarding || {}).matched = prof._onboarding.matched || {});
  const known = new Set(CORE.map(r => r.role));
  for (const pair of a.slice(2)) {
    const i = pair.indexOf("="); if (i < 1) die(`expected role=native, got ${pair}`);
    if (pair.slice(0, i) === "theme") { const t = pair.slice(i + 1); if (t === "-") delete prof.theme; else prof.theme = t; continue; }
    const role = pair.slice(0, i).startsWith("prism-") ? pair.slice(0, i) : "prism-" + pair.slice(0, i), v = pair.slice(i + 1);
    if (!known.has(role)) die(`no core role ${role} (see roles.json)`);
    if (v === "-") { delete prof.roles[role]; delete how[role]; continue; }
    if (/^assets\//.test(v) && !fs.existsSync(path.join(dir, "snapshot", v))) copyIn(path.join(dir, "source"), path.join(dir, "snapshot"), v);
    prof.roles[role] = v; how[role] = "set by hand";
  }
  // A changed font role re-derives the Office fonts and email stacks; other edits leave them as they are.
  if (a.slice(2).some(x => /^(prism-)?font-/.test(x))) refreshFonts(readTokens(path.join(dir, "snapshot")), prof);
  writeProf(id, prof); pin(id);
  const p2 = readProf(id); if (!p2.m365.email.palette || p2.m365.email.proposed) { if (proposePalette(id, p2)) writeProf(id, p2); }
  process.stdout.write(reportMd(report(id)));
} else if (cmd === "report") {
  const r = report(a[1] || die("usage: onboard.js report <id> [--json]"));
  process.stdout.write(a.includes("--json") ? JSON.stringify(r, null, 1) + "\n" : reportMd(r));
} else if (cmd === "bundle") {
  const id = a[1], out = a[2] && path.resolve(a[2]);
  if (!id || !out) die("usage: onboard.js bundle <id> OUT.zip");
  pin(id);
  const r = report(id), prof = readProf(id), dir = draftDir(id), stop = [];
  if (r.errors.length) stop.push(...r.errors);
  if (r.todo.some(t => t.startsWith("write digest"))) stop.push("digest.md is still the stub");
  if (!r.terms.length) stop.push("identity.terms is empty");
  if (prof.default) stop.push("a draft is never the default brand: remove \"default\" (the maintainer sets it when merging, if wanted)");
  if (stop.length) die(`not ready to bundle:\n  ${stop.join("\n  ")}`);
  // The person's "done" accepts a proposed palette; a palette reviewed before keeps its record, unless its colours moved since.
  const m = prof.m365.email, res = R.load(id), { CLIENT_RULES } = require("./outlook-sim.js");
  const stale = Object.entries(m.source_roles || {}).filter(([r, v]) => res.roles[r] && res.roles[r].value[res.themes[0]].toUpperCase() !== v.toUpperCase()).map(([r]) => r);
  if (!m.proposed && m.reviewed && (stale.length || m.client_rules !== CLIENT_RULES))
    die(`the email palette was reviewed against other colours or client rules (${[...stale, ...(m.client_rules !== CLIENT_RULES ? ["client rules"] : [])].join(", ")}): onboard.js palette ${id} proposes a new one, onboard.js palette ${id} --keep keeps this one`);
  if (m.proposed || !m.reviewed) m.reviewed = { onboarding: today(), note: "Accepted at onboarding; merging this bundle into a release is the approval." };
  delete m.proposed;
  // Drop snapshot files nothing maps (assets tried and replaced along the way), then pin the result.
  const need = new Set(assetsUsed(prof));
  for (const f of walk(path.join(dir, "snapshot")).map(p => path.relative(path.join(dir, "snapshot"), p).split(path.sep).join("/")))
    if (/^assets\//.test(f) && !need.has(f)) fs.rmSync(path.join(dir, "snapshot", f));
  writeProf(id, prof); pin(id);
  // The report is taken while the draft still records how each role was matched; the shipped profile drops that record.
  const final = report(id), pinned = readProf(id), ob = pinned._onboarding || {}, byHow = {};
  for (const m of final.mapped) byHow[m.how] = (byHow[m.how] || 0) + 1;
  delete pinned._onboarding; writeProf(id, pinned);
  const notes = [reportMd(final).replace(/^# .*\n/, `# ${prof.name} (${id}): brand bundle\n`).replace(/^Draft: .*\n/m, "").replace("## To do", "## Notes"),
    `## Onboarding`, `Started ${ob.started || "?"}, bundled ${today()}. Roles matched by ${Object.entries(byHow).map(([k, v]) => `${k}: ${v}`).join(", ")}.`, "",
    ...(ob.update_of ? [`## Changes since shipped version ${ob.update_of}`, ...(ob.changes.length ? ob.changes.map(c => `- ${c}`) : ["- none in the design system"]), "", `Merge with --replace: python3 tools/add-brand.py <bundle> --replace`, ""] : []),
    "## Review before merging", "Code that ships to every user, read it line by line:", ...codeList(id, pinned, ob), "",
    "## Merge", `1. Unzip into plugin/prism/skills/prism-produce/kit/brands/ (or run python3 tools/add-brand.py ${path.basename(out)}).`,
    `2. node tools/pin-profile.js ${id}`, "3. node tests/brands.test.js, node tests/resolve.test.js, python3 tests/core-brand-free.test.py", `4. bash run.sh swatch ${id} out/${id}-swatch.pdf and look at it`, "5. Ship it with the next build (python3 chatgpt/convert.py <version>).", ""].join("\n");
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "prism-bundle-"));
  fs.cpSync(dir, path.join(tmp, id), { recursive: true, filter: s => !s.startsWith(path.join(dir, "source")) });
  fs.writeFileSync(path.join(tmp, `ONBOARDING-${id}.md`), notes);
  fs.rmSync(out, { force: true });
  execFileSync("python3", ["-c", "import os,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)\nfor r,_,fs in os.walk(sys.argv[2]):\n  for f in sorted(fs): p=os.path.join(r,f); z.write(p,os.path.relpath(p,sys.argv[2]))\nz.close()", out, tmp]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`[onboard] ${prof.name}: bundle ${out} (${final.mapped.length} roles mapped, ${final.unmapped.length} unmapped). Hand it to the maintainer; it ships with the next release.`);
} else if (cmd === "update") {
  // A shipped brand whose design system (or core's email client rules) changed: a draft copy with the new snapshot and the same
  // mapping, and a list of what moved, so only the changes are reviewed. Without a design system it re-checks the email palette.
  const id = a[1], src = a[2] && !a[2].startsWith("--") ? a[2] : null, shipped = path.join(KIT, "brands", id || "");
  if (!id || !fs.existsSync(path.join(shipped, "profile.json"))) die("usage: onboard.js update <shipped brand> [<design-system-dir>] [--force]");
  const dir = draftDir(id);
  if (fs.existsSync(dir) && !a.includes("--force")) die(`a draft of ${id} already exists in ${dir} (--force replaces it)`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(shipped, dir, { recursive: true });
  const prof = readProf(id), oldSnap = path.join(shipped, "snapshot"), changes = [];
  delete prof.default; prof.version = (prof.version || 1) + 1;
  if (src) {
    const root = dsRoot(src), T = readTokens(root);
    fs.cpSync(root, path.join(dir, "source"), { recursive: true });
    const flat = (T0, r0) => { const o = {}; const N = natives(T0, r0); for (const [k, v] of Object.entries(N)) if (k !== "asset") for (const t of v) o[`${k}:${t.name}`] = JSON.stringify(t.value); return o; };
    const was = flat(readTokens(oldSnap), oldSnap), now = flat(T, root);
    const byNative = {}; for (const [r, n] of Object.entries(prof.roles)) (byNative[n] = byNative[n] || []).push(r);
    const kindOf = { color: "color", type: "type", font: "font", space: "space", radius: "radius", shadow: "shadow" };
    for (const k of new Set([...Object.keys(was), ...Object.keys(now)])) {
      if (was[k] === now[k]) continue;
      const [kind, name] = k.split(/:(.*)/), roles = (byNative[name] || []).filter(r => CORE.find(c => c.role === r && c.kind === kindOf[kind]));
      const what = !(k in now) ? "removed" : !(k in was) ? "added" : `${was[k]} -> ${now[k]}`;
      changes.push(`${kind} ${name}: ${what}${roles.length ? ` (used by ${roles.join(", ")})` : " (no role uses it)"}`);
    }
    // Files the profile pins: the README behind the digest, fonts and every mapped asset.
    for (const f of Object.keys(prof.snapshot.files)) {
      if (f === "tokens.json" || f === "design-system.json") continue;
      const n = path.join(root, f);
      if (!fs.existsSync(n)) changes.push(`${f}: removed from the design system${Object.values(prof.roles).includes(f) ? " (a role maps it: map another file or unmap it)" : ""}`);
      else if (sha(n) !== prof.snapshot.files[f]) changes.push(`${f}: changed${f === "README.md" ? " (read the digest against it)" : ""}`);
    }
    for (const f of walk(path.join(root, "fonts")).map(p => path.relative(root, p).split(path.sep).join("/"))) if (!prof.snapshot.files[f]) changes.push(`${f}: new font file`);
    const keepFiles = assetsUsed(prof).filter(f => fs.existsSync(path.join(root, f)));
    snapshotFrom(dir, root, { ...prof, roles: Object.fromEntries(Object.entries(prof.roles).filter(([, v]) => !/^assets\//.test(v) || keepFiles.includes(v))), generators: Object.fromEntries(Object.entries(prof.generators || {}).filter(([, g]) => keepFiles.includes(g.script))) });
    // Components the design system added or dropped since this release: each new one is an interview (when, how often, rules).
    const nowComps = dsComponents(root), had = prof.source && prof.source.components;
    if (!had) { if (nowComps.length) changes.push(`design-system components (this release never recorded them; ask which are new to Prism): ${nowComps.join(", ")}`); }
    else {
      for (const c of nowComps.filter(c => !had.includes(c))) changes.push(`new design-system component: ${c} (components/${c}/README.md): interview and add it (prism-onboard, "A new component")`);
      for (const c of had.filter(c => !nowComps.includes(c))) changes.push(`design-system component removed: ${c}${Object.keys(prof.components || {}).length ? " (check the brand's components that came from it)" : ""}`);
    }
    prof.source = { ...prof.source, snapshot_taken: today(), components: nowComps };
  }
  prof._onboarding = { started: today(), update_of: prof.version - 1, source: src ? "source/" : null, matched: Object.fromEntries(Object.keys(prof.roles).map(r => [r, `kept from version ${prof.version - 1}`])), changes };
  writeProf(id, prof); pin(id);
  // The email palette was approved against these colours and client rules: say which moved, never change it silently.
  const after = R.load(id), m = prof.m365 && prof.m365.email, { CLIENT_RULES } = require("./outlook-sim.js");
  if (m && m.palette) {
    for (const [r, v] of Object.entries(m.source_roles || {})) { const now = after.roles[r] && after.roles[r].value[after.themes[0]]; if (now && now.toUpperCase() !== v.toUpperCase()) changes.push(`email palette: ${r} was ${v}, now ${now} (onboard.js palette ${id} proposes a new one)`); }
    if (m.client_rules !== CLIENT_RULES) changes.push(`email palette: client rules changed (${m.client_rules} -> ${CLIENT_RULES}); check it with run.sh palette ${id}`);
  }
  const p2 = readProf(id); p2._onboarding.changes = changes; writeProf(id, p2);
  console.log(`# ${prof.name}: what changed since the shipped version\n\n${changes.length ? changes.map(c => `- ${c}`).join("\n") : "- nothing: the design system matches this release"}\n`);
  process.stdout.write(reportMd(report(id)));
} else if (cmd === "component") {
  // Records one of the brand's own components from the interview: what it is for, when, how often, its rules, where it goes.
  const id = a[1], cid = a[2];
  if (!id || !cid || !/^[a-z0-9-]+$/.test(cid)) die("usage: onboard.js component <id> <component-id> [--use T] [--when T] [--max N] [--rule T ...] [--formats a,b] [--markup M] [--sample FILE] [--from NAME] [--remove]");
  const prof = readProf(id), comps = prof.components = prof.components || {};
  if (a.includes("--remove")) delete comps[cid];
  else {
    const FORMATS = ["sheet", "brochure", "deck", "social", "email", "html-email", "carousel", "blog"], c = comps[cid] = comps[cid] || {};
    const rules = a.flatMap((x, i) => x === "--rule" ? [a[i + 1]] : []);
    if (opt("--use")) c.use = opt("--use");
    if (opt("--when")) c.when = opt("--when");
    if (opt("--max")) { const n = parseInt(opt("--max")); if (!(n > 0)) die("--max is how many a piece may have, a whole number"); c.max = n; }
    if (rules.length) c.rules = rules;
    if (opt("--formats")) { c.formats = opt("--formats").split(",").map(s => s.trim()); const bad = c.formats.filter(f => !FORMATS.includes(f)); if (bad.length) die(`unknown format ${bad.join(", ")} (${FORMATS.join(", ")})`); }
    if (opt("--markup")) c.markup = opt("--markup");
    if (opt("--sample")) c.sample = fs.readFileSync(opt("--sample"), "utf8").trim();
    if (opt("--from")) c.from = opt("--from");
    if (!c.markup || !c.use) die(`component ${cid} needs --markup (how a format file writes it) and --use (what it is for)`);
  }
  writeProf(id, prof);
  process.stdout.write(reportMd(report(id)));
} else if (cmd === "palette") {
  // Replaces the email palette with core's proposal from the brand's current colours (accepted again by bundling),
  // or with --keep, keeps the palette and records the current colours and client rules as the ones it was checked against.
  const id = a[1], prof = readProf(id), m = prof.m365.email;
  if (a.includes("--keep")) {
    const res = R.load(id); if (res.errors.length) die(`${id} does not build yet`);
    for (const r of Object.keys(m.source_roles || {})) if (res.roles[r]) m.source_roles[r] = res.roles[r].value[res.themes[0]];
    m.client_rules = require("./outlook-sim.js").CLIENT_RULES;
    m.reviewed = { ...(m.reviewed || {}), onboarding: today(), note: `${(m.reviewed && m.reviewed.note) ? m.reviewed.note + " " : ""}Kept at onboarding ${today()} against the colours and client rules above.` };
  } else { if (!proposePalette(id, prof)) die(`${id} does not build yet, so there is no palette to propose`); delete m.reviewed; }
  writeProf(id, prof);
  process.stdout.write(reportMd(report(id)));
} else {
  die("usage: onboard.js start|map|report|bundle|update|palette ... (see the top of onboard.js)");
}
