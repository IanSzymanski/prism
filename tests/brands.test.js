// Proves core is brand-independent and every brand in kit/brands is complete.
// Usage: node tests/brands.test.js
const fs = require("fs"), path = require("path");
const KIT = path.join(__dirname, "..", "plugin", "prism", "skills", "prism-produce", "kit");
const brands = fs.readdirSync(path.join(KIT, "brands")).filter(b => fs.existsSync(path.join(KIT, "brands", b, "profile.json")));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (["brands", "vendor", "cache", "node_modules", "mods", "fonts"].includes(e.name) ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const coreFiles = walk(KIT).filter(f => /\.(js|css|lua|py|html|sh)$/.test(f));

// 1. Core holds no brand's colours, motif names or font names.
const words = new Set(["prism-kit"]);
for (const b of brands) {
  const T = JSON.parse(fs.readFileSync(path.join(KIT, "brands", b, "snapshot", "tokens.json"), "utf8"));
  const hex = new Set(T.color.tokens.flatMap(t => Object.values(typeof t.value === "string" ? { l: t.value } : t.value)).filter(v => /^#[0-9a-f]{6}$/i.test(v) && !/^#(ffffff|000000)$/i.test(v)).map(v => v.toUpperCase()));
  const fams = Object.values(T.type.families).map(s => s.split(",")[0].trim().replace(/["']/g, "")).filter(f => !/^(ui-|-apple|system|Georgia|Arial|Helvetica|Segoe|Consolas|Menlo|monospace|sans-serif|serif)/i.test(f));
  for (const f of coreFiles) {
    const s = fs.readFileSync(f, "utf8"), up = s.toUpperCase(), rel = path.relative(KIT, f);
    for (const v of hex) ok(!up.includes(v), `${rel} contains ${b}'s colour ${v}`);
    for (const fam of fams) ok(!s.includes(fam), `${rel} names ${b}'s font ${fam}`);
  }
}
for (const f of coreFiles) { const s = fs.readFileSync(f, "utf8"); for (const w of ["wave", "grape", "spectrum", "Case Amplify", "caseamplify"]) ok(!new RegExp(`\\b${w}\\b`, "i").test(s.replace(/prism-kit/g, "")), `${path.relative(KIT, f)} mentions "${w}"`); }

// 2. Every brand resolves, and its layers, ornaments and pinned files are present and work.
for (const b of brands) {
  const { load } = require(path.join(KIT, "resolve.js")), res = load(b);
  ok(!res.errors.length, `${b} resolves: ${res.errors.join("; ")}`);
  for (const [k, f] of Object.entries(res.layers)) ok(fs.existsSync(path.join(KIT, "brands", b, f)), `${b} layer ${k}`);
  const B = require(path.join(KIT, "brand.js"))(null, b), O = B.ornaments;
  const ctx = { thread: { W: 1080 * 3, H: 1350, panels: [0, 1, 2].map(i => ({ n: i + 1, left: i * 1080, width: 1080, burst: 0.5, dark: i === 2 })), darkLeft: 2160 },
    divider: { width: 552, theme: "light" }, deckRule: { width: 1136, n: 3 }, deckGrounds: {}, preview: {},
    headerArt: { W: 1600, H: 900, meta: { type: "insights" }, pick: a => a[0], between: (a, b) => (a + b) / 2 } };
  for (const [fn, c] of Object.entries(ctx)) if (O[fn]) { const r = O[fn](c, B); ok(r && (typeof r === "string" ? r.includes("<svg") : Object.keys(r).length), `${b} ornaments.${fn} draws`); }
  if (O.preview) ok(O.preview({}, B).every(x => x.svg && x.label && x.place), `${b} preview names a place for each ornament`);
  ok(["light", "regular"].includes(B.icons.weight) && fs.existsSync(B.icons.paths), `${b} icon weight ${B.icons.weight} is vendored`);
  if (res.office) ok((res.office.paths || []).every(p => fs.existsSync(p)), `${b} Office fonts present`);
}

// 3. Prism differs from Case Amplify where it should: its own choices, not the other brand's slots refilled.
const P = require(path.join(KIT, "brand.js"))(null, "prism"), C = require(path.join(KIT, "brand.js"))(null, "case-amplify");
ok(P.option("images.fade", false) === false && C.option("images.fade", false) === true, "photo fade is Case Amplify's, not Prism's");
ok(P.option("charts.bars") === "flat" && C.option("charts.bars") === "gradient", "chart bars follow the brand");
ok(P.icons.weight === "regular" && C.icons.weight === "light", "icon weight follows the brand");
ok(!P.res.roles["prism-asset-dark-surface"] && !!C.res.roles["prism-asset-dark-surface"], "the dark-card image is Case Amplify's only");
ok(/Templates\/sample-landscape/.test(P.asset("prism-asset-placeholder")), "Prism's placeholders are its own test images");
ok(fs.readFileSync(path.join(KIT, "brands", "prism", "layers", "sheet.css"), "utf8").includes("data-n"), "Prism's sections are numbered by hue");
console.log(`${pass} passed, ${fail} failed (${brands.length} brands, ${coreFiles.length} core files)`); process.exit(fail ? 1 : 0);
