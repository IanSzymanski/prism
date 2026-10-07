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

// 6. Bugs from onboarding tests (Oct 6): a dark-first design system whose surface is an alias and whose tokens are light-only;
// CSS keywords and system fonts in the stacks; hand edits to fonts surviving a font-role change; candidates for unmatched roles.
const sq = path.join(TMP, "squid"); fs.cpSync(path.join(KIT, "brands", "prism", "snapshot"), sq, { recursive: true });
const Q = JSON.parse(fs.readFileSync(path.join(sq, "tokens.json"), "utf8")); Q.color.themes.reverse();
const surf = Q.color.tokens.find(t => t.name === "surface"); Q.color.tokens.push({ name: "paper-base", value: surf.value }); surf.value = { light: "{paper-base}", dark: "{paper-base}" };
Q.color.tokens = Q.color.tokens.filter(t => t.name !== "series-5");
Q.type.families.sans = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif'; Q.type.families.mono = "ui-monospace, Menlo, monospace";
fs.writeFileSync(path.join(sq, "tokens.json"), JSON.stringify(Q));
o = run("start", "squid", sq);
const sp = () => JSON.parse(fs.readFileSync(path.join(DRAFTS, "squid", "profile.json"), "utf8"));
ok(o.status === 0 && sp().theme === "light", "dark-first design system with an alias surface builds in light");
ok(/Builds: yes/.test(o.stdout), `tokens defined only for light resolve when dark is listed first: ${o.stdout.split("\n").filter(l => /^- role/.test(l)).join("; ")}`);
let q = sp();
ok(!Object.values(q.office.fonts).some(f => /^(system-ui|ui-monospace|-apple-system|sans-serif|monospace)$/i.test(f)), `Office fonts are real fonts: ${JSON.stringify(q.office.fonts)}`);
ok(q.office.fonts.mono === "Consolas", "a Mac-only mono (Menlo) gives way to Office's Consolas");
ok(!/Arial|system-ui|ui-monospace|Menlo|Segoe/.test(q.m365.email.fonts.webfonts || ""), `web-font link asks Google only for web fonts: ${q.m365.email.fonts.webfonts}`);
ok(q.m365.email.fonts.sans.split(",").length === new Set(q.m365.email.fonts.sans.split(",")).size, "no family twice in a stack");
q.m365.email.fonts.sans = "'Inter',Arial,sans-serif"; q.office.fonts.mono = "Courier New"; fs.writeFileSync(path.join(DRAFTS, "squid", "profile.json"), JSON.stringify(q, null, 1));
o = run("map", "squid", "font-sans=display"); q = sp();
ok(q.m365.email.fonts.sans === "'Inter',Arial,sans-serif" && q.office.fonts.mono === "Courier New", "hand edits to fonts survive a font-role change");
ok(q.office.fonts.sans === "Bricolage Grotesque", "fields not edited by hand follow the new font role");
ok(/kept your edit to m365\.email\.fonts\.sans/.test(o.stdout), "the report says which edits were kept");
const allSystem = JSON.parse(JSON.stringify(Q)); allSystem.type.families = { sans: "system-ui, Arial, sans-serif", serif: "Georgia, serif", mono: "ui-monospace, monospace" };
const sys = path.join(TMP, "sys"); fs.cpSync(sq, sys, { recursive: true }); fs.writeFileSync(path.join(sys, "tokens.json"), JSON.stringify(allSystem));
run("start", "sysfonts", sys); const sf = JSON.parse(fs.readFileSync(path.join(DRAFTS, "sysfonts", "profile.json"), "utf8"));
ok(sf.m365.email.fonts.webfonts === null, "system fonts only: no web-font link");
ok(/web fonts: none/.test(run("report", "sysfonts").stdout), "the report says there is no web-font link");
o = run("map", "squid", "space-heading-gap=-");
const rep = JSON.parse(run("report", "squid", "--json").stdout), gap = rep.unmapped.find(u => u.role === "prism-space-heading-gap");
ok(gap && gap.candidates[0] && gap.candidates[0].name === "space-sm", `candidates name the design system's own match: ${JSON.stringify(gap && gap.candidates.map(c => c.name))}`);
ok(/## Roles without their own match/.test(run("report", "squid").stdout), "the report lists roles without a match once, with candidates");

// 7. Fill first: a brand with no layers gets core's default sheet layer (the closing card on its dark ground); header roles fall back.
delete require.cache[require.resolve(path.join(KIT, "brand.js"))];
const Bq = require(path.join(KIT, "brand.js"))(null, "squid"), lay = Bq.layer("sheet");
ok(lay && /cta-card\{background:/.test(fs.readFileSync(lay, "utf8")), "a brand without layers gets core's default closing card");
ok(require(path.join(KIT, "brand.js"))(null, "case-amplify").layer("sheet").includes("brand-"), "a brand's own layer wins over core's default");
ok(Bq.res.roles["prism-color-header-deep-1"] && Bq.res.roles["prism-color-header-vivid-4"], "blog header colours fall back to the brand's own");

// 8. Brand components: listed for formatters and drawn on the swatch.
q = sp(); q.components = { "closing-band": { use: "A quieter close.", markup: "::: {.cta-card .band}", formats: ["sheet"], sample: "::: {.cta-card .band}\n## Close\n:::" } };
fs.writeFileSync(path.join(DRAFTS, "squid", "profile.json"), JSON.stringify(q, null, 1));
const listed = JSON.parse(spawnSync("node", [path.join(KIT, "brands.js"), "--json"], { env: process.env, encoding: "utf8" }).stdout).find(b => b.id === "squid");
ok(listed && listed.components["closing-band"] && listed.components["closing-band"].markup === "::: {.cta-card .band}", "brands --json lists the brand's components");
ok(/- closing-band: `::: {.cta-card .band}`/.test(run("report", "squid").stdout), "the report lists the brand's components");

// 9. D14: roles only a brand's own code read are the brand's (own-<kind>-<name>), not core's.
const MOVED = ["prism-color-wash-2", "prism-color-dark-high", "prism-color-dark-glow", "prism-color-dark-glow-2", "prism-asset-rule-opener-start", "prism-asset-rule-opener-end", "prism-asset-rule-opener-start-on-dark", "prism-asset-rule-stop"];
ok(MOVED.every(m => !byName[m]), "brand-only roles are out of roles.json");
for (const b of ["case-amplify", "prism"]) {
  const p = JSON.parse(fs.readFileSync(path.join(KIT, "brands", b, "profile.json"), "utf8")), r = R2.load(b);
  ok(!Object.keys(p.roles).some(k => MOVED.includes(k)), `${b} names no moved role as core`);
  ok(Object.keys(p.roles).filter(k => k.startsWith("own-")).every(k => r.roles[k] && r.roles[k].native === p.roles[k]), `${b}'s own roles resolve`);
}
const caRes = R2.load("case-amplify");
ok(R2.css(caRes).includes("--own-asset-rule-stop:url(") && R2.css(caRes).includes("--own-color-dark-glow:"), "own roles become CSS variables for the brand's layers");
const stale = JSON.parse(fs.readFileSync(path.join(DRAFTS, "squid", "profile.json"), "utf8")); stale.roles["prism-color-dark-glow"] = "accent";
fs.writeFileSync(path.join(DRAFTS, "squid", "profile.json"), JSON.stringify(stale, null, 1));
ok(R2.load("squid").errors.some(e => /prism-color-dark-glow, which is not a core role/.test(e)), "a profile naming a role core doesn't have is an error, not skipped");
delete stale.roles["prism-color-dark-glow"]; fs.writeFileSync(path.join(DRAFTS, "squid", "profile.json"), JSON.stringify(stale, null, 1));
ok(run("map", "squid", "own-color-glow=accent").status === 0 && R2.load("squid").roles["own-color-glow"], "onboard map takes an own role");
ok(run("map", "squid", "own-poster-x=accent").status !== 0, "an own role needs a real kind");

// 10. D15: dark grounds a design system doesn't name come from its own dark theme when it has one.
const mres = R2.load("minimal"), dk = mres.themes.find(t => t !== mres.themes[0]);
ok(mres.roles["prism-color-dark-surface"].from === `prism-color-surface in the ${dk} theme` && mres.roles["prism-color-dark-surface"].value[mres.themes[0]] === mres.roles["prism-color-surface"].value[dk], "the dark card is the design system's own dark surface");
ok(mres.roles["prism-color-text-on-photo"].value[mres.themes[0]] === mres.roles["prism-color-text-strong"].value[dk], "text on dark is its own dark-theme text");
const one = path.join(TMP, "one"); fs.cpSync(path.join(KIT, "brands", "prism", "snapshot"), one, { recursive: true });
const OT = JSON.parse(fs.readFileSync(path.join(one, "tokens.json"), "utf8")); OT.color.themes = OT.color.themes.slice(0, 1); fs.writeFileSync(path.join(one, "tokens.json"), JSON.stringify(OT));
run("start", "onetheme", one); const op = JSON.parse(fs.readFileSync(path.join(DRAFTS, "onetheme", "profile.json"), "utf8"));
for (const k of Object.keys(op.roles)) if (/dark|on-photo/.test(k)) delete op.roles[k]; fs.writeFileSync(path.join(DRAFTS, "onetheme", "profile.json"), JSON.stringify(op, null, 1));
ok(R2.load("onetheme").roles["prism-color-dark-surface"].from === "prism-color-text-strong", "with no dark theme the dark card falls back to the text colour");

// 11. D16: a short report by default, the full one on request; no outputs question.
const short = run("report", "squid").stdout, long = run("report", "squid", "--full").stdout;
ok(short.split("\n").length < long.split("\n").length && /matched by the same name; the rest, to check:/.test(short), "the report is short by default, full with --full");
ok(!/\*\*Outputs\*\*/.test(fs.readFileSync(path.join(KIT, "..", "..", "prism-onboard", "SKILL.md"), "utf8")), "onboarding no longer asks about outputs");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
