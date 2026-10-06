// Proves the Case Amplify profile resolves to exactly the values the 0.13.1 kit hardcodes, and that the resolver fails safe.
// Usage: node tests/resolve.test.js [LIVE_DIR]   (LIVE_DIR: a design system fetched with Artifact read)
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const KIT = path.join(__dirname, "..", "plugin", "prism", "skills", "prism-produce", "kit");
const { load } = require(path.join(KIT, "resolve.js"));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const eq = (a, b, m) => ok(String(a).toUpperCase() === String(b).toUpperCase(), `${m}: got ${a}, kit has ${b}`);
const res = load("case-amplify"), R = res.roles, L = n => R[n].value.light, D = n => R[n].value.dark;
ok(!res.errors.length, "no errors: " + res.errors.join("; "));
const REF = path.join(__dirname, "reference-0.13.1"), read = f => fs.readFileSync(path.join(REF, f), "utf8");

// Sheet :root variables
const root = Object.fromEntries([...read("ca-sheet.css").matchAll(/--([a-z0-9-]+):(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2]]));
for (const [v, role] of Object.entries({ paper: "surface", ink: "text-strong", body: "text", hair: "rule", "hair-soft": "rule-soft", grape: "accent", lilac: "eyebrow-on-dark" }))
  eq(L("prism-color-" + role), root[v], `sheet --${v}`);
// Literal hex in sheet, social and deck rules
for (const [hex, role, th] of [["#6B6B71", "text-muted"], ["#8A8A90", "text-faint"], ["#CC96E8", "link-line"], ["#F0E1F4", "wash"], ["#EFE3F3", "wash-2"], ["#FAF5F6", "tint"], ["#E6CCF0", "tint-line"], ["#F3ECF6", "band"], ["#F8F1F6", "code"], ["#F6F6EF", "pre"], ["#E3E3DB", "chart-grid"], ["#E9E8DF", "desk"], ["#1D0D3A", "dark-surface"], ["#130828", "dark-deep"], ["#33136A", "dark-high"],
  ["#C77DFF", "accent", "dark"], ["#C9C5CA", "text", "dark"], ["#9C94A4", "text-muted", "dark"], ["#776E86", "link-line", "dark"], ["#FFFFF8", "text-strong", "dark"]]) {
  ok(/#[0-9A-F]{6}/i.test(hex) && (read("ca-sheet.css") + read("ca-social.css") + read("build-deck.js")).toUpperCase().includes(hex), `kit still uses ${hex}`);
  eq(th ? D("prism-color-" + role) : L("prism-color-" + role), hex, `${role}${th ? " (dark)" : ""}`);
}
// Values added after D10, each traced to the 0.13.1 rule that used it
ok(read("ca-sheet.css").includes(".ca-meta{font:500 8pt/1.4 var(--mono);letter-spacing:.06em;color:#75757A"), "kit meta colour"); eq(L("prism-color-text-meta"), "#75757A", "text-meta");
ok(read("ca-social.css").includes(".post.story.photo-full p{color:#E4E0E6}"), "kit photo text"); eq(L("prism-color-text-on-photo"), "#E4E0E6", "text-on-photo");
ok(read("ca-brochure.css").includes("border-bottom:.8pt solid #3B2A5E"), "kit dark rule"); eq(L("prism-color-rule-on-dark"), "#3B2A5E", "rule-on-dark");
ok(read("build-deck.js").includes("rgb(112 28 184 / .85)") && read("build-deck.js").includes("rgb(58 31 135 / .85)"), "kit deck glows");
eq(L("prism-color-dark-glow"), "#701CB8", "dark-glow (112 28 184)"); eq(L("prism-color-dark-glow-2"), "#3A1F87", "dark-glow-2 (58 31 135)");
ok(read("ca-blog.css").includes("box-shadow:0 50px 110px -40px rgb(8 6 17 / .6),0 6px 16px rgb(8 6 17 / .2)"), "kit screen shadow");
eq(R["prism-shadow-screen"].value.replace(/\s/g, ""), "0 50px 110px -40px rgba(8, 6, 17, 0.6), 0 6px 16px rgba(8, 6, 17, 0.2)".replace(/\s/g, ""), "shadow-screen");
eq(R["prism-shadow-sheet"].value.replace(/\s/g, ""), "0 18px 44px -22px rgba(8,6,17,.35)".replace(/\s/g, "").replace(".35", "0.35"), "shadow-sheet");
const officeFonts = /const F = (\{[^}]*\})/.exec(read("build-deck.js"))[1];
ok(JSON.stringify(res.office.fonts) === JSON.stringify(eval("(" + officeFonts + ")")), "Office font names match the 0.13.1 deck");
// Charts (Lua and deck share one series)
const lua = read("ca-charts.lua"), q = re => re.exec(lua).slice(1);
const [INK, BODY, HAIR, PAPER] = q(/INK, BODY, HAIR, PAPER = "(#\w+)", "(#\w+)", "(#\w+)", "(#\w+)"/);
eq(L("prism-color-text-strong"), INK, "charts INK"); eq(L("prism-color-text"), BODY, "charts BODY"); eq(L("prism-color-rule"), HAIR, "charts HAIR"); eq(L("prism-color-surface"), PAPER, "charts PAPER");
const [HOT, DEEP] = q(/HOT, DEEP = "(#\w+)", "(#\w+)"/); eq(L("prism-color-accent-strong"), HOT, "charts HOT"); eq(L("prism-color-accent"), DEEP, "charts DEEP");
const series = [.../SERIES = \{ (.*?) \}/.exec(lua)[1].matchAll(/#\w+/g)].map(m => m[0]);
series.forEach((h, i) => eq(L(`prism-color-chart-${i + 1}`), h, `chart series ${i + 1}`));
const deckSeries = JSON.parse(/const SERIES = (\[.*?\]);/.exec(read("build-deck.js"))[1]);
deckSeries.forEach((h, i) => eq(L(`prism-color-chart-${i + 1}`), "#" + h, `deck series ${i + 1}`));
// Blog header gradients
for (const m of read("build-blog.js").matchAll(/(light|mist|deep|vivid): \{ stops: \["(#\w+)", "(#\w+)", "(#\w+)"\], deep: "(#\w+)"/g))
  m.slice(2).forEach((h, i) => eq(L(`prism-color-header-${m[1]}-${i + 1}`), h, `blog ${m[1]} ${i + 1}`));
// Email layer
const em = JSON.parse(read("email-brand.json"));
eq(L("prism-color-rule"), em.divider.light, "email divider light"); eq(D("prism-color-rule"), em.divider.dark, "email divider dark");
eq(L("prism-color-accent"), em.light.button, "email button"); eq(R["prism-radius-button"].value, em.radius + "px", "email radius");
const same = (a, b) => fs.readFileSync(a).equals(fs.readFileSync(b));
const SHA = { "ca-logo.png": "f02a0e32bcf958ae86b19e09071dc689e62e966a13d777724d2df4e67acbd30d", "ca-logo-light.png": "828887548fb013db91bfc1ed85bd275af049d3087b482c18911802b461feb411", "cta-card.png": "389977e5cf449f7bb2aa917507c7dda67bfe143e10f2c104fa353beff208a27e" };
const hash = p => require("crypto").createHash("sha256").update(fs.readFileSync(p)).digest("hex");
ok(hash(R["prism-asset-logo"].value.path) === SHA["ca-logo.png"], "logo bytes match 0.13.1");
ok(hash(R["prism-asset-logo-on-dark"].value.path) === SHA["ca-logo-light.png"], "dark logo bytes match 0.13.1");
ok(hash(R["prism-asset-dark-surface"].value.path) === SHA["cta-card.png"], "dark card image matches 0.13.1");
// Fonts: every print font the 0.13.1 sheet loaded is the same file
const FONTS = {"Inter-SemiBold.ttf": "9b4bdd99bab0d17216dca6f4ee02c11a3df58902ff9e585dc381cc945cb55725", "Inter-Regular.ttf": "c3a57eb0f716b30e51712843d753141827aa1d9266531c4f7357ec352d22f80f", "Inter-Medium.ttf": "93e4e46a15d3c4de8bc1b34a5b8c71ae5b6de61a2da7c9baff0125e7da69a6b2", "Literata-Regular.ttf": "208e04c5e8a4b86de2aa67d46bbc6f0188048f4dcda422f88a4be2ec59d40b10", "Literata-SemiBold.ttf": "45fbb4d0c37b32002c0bbd652c9be16a00ac19bced980b7e95bb44ae794ea6aa", "IBMPlexMono-Medium.ttf": "13573e85cb64c9cad0742e979b14bf6e9111fa3d9e70598b12c9ddd862a7d4fd", "Literata-Medium.ttf": "d3919555b65a01a982f94d86185d9283a69a50196c840a194014b0e4cd1945f0"};
for (const m of read("ca-sheet.css").matchAll(/src:url\("fonts\/print\/([\w-]+\.ttf)"\)/g)) {
  const f = ["prism-font-serif", "prism-font-sans", "prism-font-mono"].flatMap(r => R[r].value.files).find(x => path.basename(x.path) === m[1]);
  ok(f && hash(f.path) === FONTS[m[1]], `font ${m[1]} matches 0.13.1`);
}
eq(R["prism-font-serif"].value.stack.split(",")[0], "Literata", "serif family");
// Wave rules: pre-rendered SVGs identical to the sheet's data URIs; generator parameters match every builder call
const css = read("ca-sheet.css");
for (const [k, role] of [["opener-end", "rule-opener-end"], ["opener-start", "rule-opener-start"], ["stop", "rule-stop"], ["opener-start-dark", "rule-opener-start-on-dark"]]) {
  const svg = decodeURIComponent(new RegExp(`--ca-wave-${k}:url\\("data:image/svg\\+xml,(.*?)"\\)`).exec(css)[1]);
  ok(fs.readFileSync(R["prism-asset-" + role].value.path, "utf8") === svg, `wave svg ${k}`);
}
const g = R["prism-generator-rule"].value, p = g.params.default;
ok(fs.readFileSync(g.script, "utf8") === read("wave-core.js"), "wave-core.js identical");
for (const f of ["build-deck.js", "build-social.js"]) ok(read(f).includes(`wavelength: ${p.wavelength} * s, amplitude: ${p.amplitude} * s, focus: ${p.focus} * s, edge: ${p.edge} * s`), `${f} wave params`);
const e = g.params["email-divider"]; ok(read("build-email.js").includes(`wavelength: ${e.wavelength}, amplitude: ${e.amplitude}, focus: ${e.focus}, edge: ${e.edge}`), "email divider params");
eq(g.stroke.value.light, "#C1C1B8", "wave stroke");

// D8: the email palette moved into the profile unchanged, and core's checks and proposer behave.
const m = res.m365.email;
ok(JSON.stringify(m.palette.light) === JSON.stringify(em.light) && JSON.stringify(m.palette.dark) === JSON.stringify(em.dark), "email palette equals 0.13.1 email-brand.json");
ok(JSON.stringify(m.fonts) === JSON.stringify(em.fonts) && m.logo_width === em.logo.width, "email fonts and logo width equal 0.13.1");
const PAL = require(path.join(KIT, "palette.js")), BR = require(path.join(KIT, "brand.js"))(null, "case-amplify");
const fp = PAL.forBrand(BR); ok(fp.reviewed && !fp.why.length, "Case Amplify palette counts as reviewed");
const failing = PAL.check(fp.light).filter(r => !r.ok).map(r => r.id).sort();
ok(failing.length === 0, "Case Amplify palette passes every check for how core uses it: " + failing);
const prop = PAL.propose(BR.color); ok(PAL.check(prop.light).filter(r => /-card$|surface|button|drift/.test(r.id)).every(r => r.ok), "proposed palette passes every card, surface, button and drift check");
const changed = { ...BR, color: (n, t) => n === "prism-color-accent" ? "#7A10C0" : BR.color(n, t) };
const fc = PAL.forBrand(changed); ok(!fc.reviewed && fc.why.some(w => w.includes("prism-color-accent changed")), "a changed source colour marks the palette unreviewed");
const oldRules = { ...BR, res: { ...BR.res, m365: { email: { ...m, client_rules: "outlook-2025-01" } } } };
ok(!PAL.forBrand(oldRules).reviewed, "newer client rules mark the palette unreviewed");
ok(res.office.paths.length === 5 && res.office.paths.every(f => fs.existsSync(f)), "Office fonts are in the brand");

// Fail-safe: a tampered snapshot or a missing required role stops the build; drift only warns.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kit-"));
fs.cpSync(KIT, tmp, { recursive: true, filter: s => !/node_modules|cache/.test(s) });
const run = (args) => { try { execFileSync("node", [path.join(tmp, "resolve.js"), ...args], { cwd: tmp, stdio: "pipe" }); return 0; } catch (x) { return x.status; } };
const tok = path.join(tmp, "brands/case-amplify/snapshot/tokens.json"), orig = fs.readFileSync(tok);
fs.writeFileSync(tok, orig.toString().replace("#8D16D4", "#8D16D5")); ok(run(["case-amplify", "--out", tmp + "/o"]) === 1, "tampered tokens.json blocks the build"); fs.writeFileSync(tok, orig);
const pp = path.join(tmp, "brands/case-amplify/profile.json"), po = fs.readFileSync(pp), pj = JSON.parse(po);
delete pj.roles["prism-color-accent"]; fs.writeFileSync(pp, JSON.stringify(pj)); ok(run(["case-amplify", "--out", tmp + "/o"]) === 1, "unmapped required role blocks the build"); fs.writeFileSync(pp, po);
const of = path.join(tmp, "brands/case-amplify/office/CAInter-Regular.ttf"), oo = fs.readFileSync(of);
fs.writeFileSync(of, Buffer.concat([oo, Buffer.from([0])])); ok(run(["case-amplify", "--out", tmp + "/o"]) === 1, "a changed Office font blocks the build"); fs.writeFileSync(of, oo);
const live = path.join(tmp, "live/project"); fs.cpSync(path.join(tmp, "brands/case-amplify/snapshot"), live, { recursive: true });
fs.writeFileSync(path.join(live, "README.md"), "changed"); const li = JSON.parse(fs.readFileSync(path.join(live, "design-system.json"))); li.assetGroups.Logos.files["ca-logo.png"].blob = "0".repeat(32); fs.writeFileSync(path.join(live, "design-system.json"), JSON.stringify(li));
const w = load.call(null, "case-amplify", { live: path.dirname(live) }); // same kit, real snapshot
ok(w.warnings.some(x => x.includes("README.md")) && w.warnings.some(x => x.includes("ca-logo.png (replaced)")) && !w.errors.length, "drift warns without blocking");
ok(run(["case-amplify", "--out", tmp + "/o", "--live", path.dirname(live)]) === 0, "drift exits 0");
if (process.argv[2]) { const r = load("case-amplify", { live: process.argv[2] }); ok(!r.errors.length, "live load"); console.log("live design system:", r.warnings.filter(x => !x.startsWith("optional")).join("; ") || "matches the snapshot"); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
