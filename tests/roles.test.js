// Optional roles are optional (D15) and builds pick the profile's theme (D17).
// A brand with only the required roles resolves every role core reads; a profile `theme` changes the build theme.
// Usage: node tests/roles.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const KIT = path.join(__dirname, "..", "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-roles-")), DRAFTS = path.join(TMP, "drafts");
process.env.PRISM_DRAFTS = DRAFTS;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const roles = JSON.parse(fs.readFileSync(path.join(KIT, "roles.json"), "utf8")).roles, byName = Object.fromEntries(roles.map(r => [r.role, r]));

// 1. Every fallback chain is the same kind, never loops, and ends at a required role or a core default.
for (const r of roles.filter(r => r.fallback)) {
  const seen = new Set([r.role]); let c = byName[r.fallback], good = true;
  while (c && !c.required && c.default == null) { if (seen.has(c.role) || !c.fallback) { good = false; break; } seen.add(c.role); c = byName[c.fallback]; }
  ok(good && c && c.kind === r.kind, `${r.role}: fallback chain ends at a required role or a default, same kind`);
}
ok(!roles.some(r => r.required && (r.fallback || r.default != null)), "required roles have no fallback");

// 2. A brand with only the required roles: every role with a fallback or default resolves, and nothing core reads is missing.
const run = (...a) => spawnSync("node", [path.join(KIT, "onboard.js"), ...a], { env: process.env, encoding: "utf8" });
ok(run("start", "minimal", path.join(KIT, "brands", "prism", "snapshot")).status === 0, "draft a brand");
const opt = roles.filter(r => !r.required).map(r => `${r.role}=-`);
ok(run("map", "minimal", ...opt).status === 0, "unmap every optional role");
const pf = path.join(DRAFTS, "minimal", "profile.json"), prof = JSON.parse(fs.readFileSync(pf, "utf8"));
delete prof.m365.email.palette; fs.writeFileSync(pf, JSON.stringify(prof, null, 1));
ok(Object.keys(prof.roles).length === roles.filter(r => r.required).length, "only the required roles are mapped");
const { load } = require(path.join(KIT, "resolve.js")), res = load("minimal");
ok(!res.errors.length, `required-only brand resolves: ${res.errors.join("; ")}`);
for (const r of roles.filter(r => r.fallback || r.default != null)) ok(res.roles[r.role] && res.roles[r.role].native === null && res.roles[r.role].from, `${r.role} derived`);
ok(res.roles["prism-color-tint"].value[res.themes[0]] === res.roles["prism-color-surface"].value[res.themes[0]], "tint falls back through band to surface");
ok(res.roles["prism-shadow-lift"].value === "none" && res.roles["prism-shadow-lift"].from === "core default", "a shadow defaults to none");
ok(!res.roles["prism-color-chart-2"], "chart colours 2-5 are never made up");
const B = require(path.join(KIT, "brand.js"))(null, "minimal"), env = B.env();
for (const k of ["TEXT_STRONG", "TEXT", "RULE", "SURFACE", "ACCENT", "ACCENT_STRONG", "CHART_1"]) ok(env["PRISM_COLOR_" + k], `charts get PRISM_COLOR_${k}`);
let P; try { P = require(path.join(KIT, "palette.js")).forBrand(B); } catch (e) { P = null; }
ok(P && P.light && P.light.tint, "email palette is proposed without a tint role");
ok(B.has("prism-asset-logo") && !B.has("prism-asset-logo-on-dark"), "B.has tells mapped assets from missing ones");

// 3. Shipped brands: a mapped role is never replaced by a fallback.
for (const b of ["case-amplify", "prism"]) {
  const p = JSON.parse(fs.readFileSync(path.join(KIT, "brands", b, "profile.json"), "utf8")), r = load(b);
  ok(Object.keys(p.roles).every(k => !r.roles[k] || r.roles[k].native === p.roles[k]), `${b}: mapped roles keep their own values`);
}

// 4. The build theme: profile `theme` puts that theme first everywhere; an unknown theme stops the build.
const theme = t => { const q = JSON.parse(fs.readFileSync(pf, "utf8")); if (t) q.theme = t; else delete q.theme; fs.writeFileSync(pf, JSON.stringify(q, null, 1)); };
delete require.cache[require.resolve(path.join(KIT, "resolve.js"))];
const R2 = require(path.join(KIT, "resolve.js"));
theme("dark"); let d = R2.load("minimal");
ok(!d.errors.length && d.themes[0] === "dark" && d.theme === "dark", "profile theme dark builds in dark");
ok(R2.css(d).includes(`--prism-color-surface:${d.roles["prism-color-surface"].value.dark};`), "the build theme is :root in the stylesheet");
ok(R2.css(d).includes(`--prism-color-surface-light:${d.roles["prism-color-surface"].value.light};`), "other themes stay available by id");
theme("sepia"); ok(R2.load("minimal").errors.some(e => /not a theme of the design system/.test(e)), "an unknown theme stops the build");
theme(null); ok(R2.load("minimal").themes[0] === "light", "no theme: the design system's first");

// 5. Onboarding picks a light theme when the design system lists its dark theme first.
const ds = path.join(TMP, "dark-first"); fs.cpSync(path.join(KIT, "brands", "prism", "snapshot"), ds, { recursive: true });
const T = JSON.parse(fs.readFileSync(path.join(ds, "tokens.json"), "utf8")); T.color.themes.reverse(); fs.writeFileSync(path.join(ds, "tokens.json"), JSON.stringify(T));
let o = run("start", "darkfirst", ds);
ok(o.status === 0 && JSON.parse(fs.readFileSync(path.join(DRAFTS, "darkfirst", "profile.json"), "utf8")).theme === "light", "onboarding sets theme light for a dark-first design system");
ok(/Builds in theme "light" of "dark", "light"/.test(o.stdout), "the report names the build theme");
ok(run("map", "darkfirst", "theme=dark").status === 0 && JSON.parse(fs.readFileSync(path.join(DRAFTS, "darkfirst", "profile.json"), "utf8")).theme === "dark", "map theme= changes it");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
