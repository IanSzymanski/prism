// Draft brands (D11): a workspace brand from onboarding builds like a shipped one, says it is a draft, and is never the default.
// Usage: node tests/drafts.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { execFileSync } = require("child_process");
const KIT = path.join(__dirname, "..", "plugin", "prism", "skills", "prism-produce", "kit");
const DRAFTS = fs.mkdtempSync(path.join(os.tmpdir(), "prism-drafts-"));
process.env.PRISM_DRAFTS = DRAFTS;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const env = { ...process.env, PRISM_DRAFTS: DRAFTS };
const node = (...a) => execFileSync("node", a, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

// A new brand as a draft (a copy of a shipped one under a new id, marked default to prove drafts never take the default).
const src = path.join(KIT, "brands", "prism");
fs.cpSync(src, path.join(DRAFTS, "harbor-point"), { recursive: true });
const pf = path.join(DRAFTS, "harbor-point", "profile.json"), prof = JSON.parse(fs.readFileSync(pf, "utf8"));
prof.id = "harbor-point"; prof.name = "Harbor Point"; prof.default = true; fs.writeFileSync(pf, JSON.stringify(prof, null, 1));

const { load, defaultBrand, brandList, brandDir } = require(path.join(KIT, "resolve.js"));
const shippedDefault = JSON.parse(node(path.join(KIT, "brands.js"), "--json").trim()).find(r => r.default && !r.draft);
ok(shippedDefault, "a shipped brand stays the default");
ok(defaultBrand() === shippedDefault.id, "defaultBrand ignores a draft marked default");
const res = load("harbor-point");
ok(!res.errors.length, `draft resolves: ${res.errors.join("; ")}`);
ok(res.draft === true, "draft is flagged");
ok(res.warnings.some(w => w.startsWith("draft:")), "draft warns");
ok(res.dir === path.join(DRAFTS, "harbor-point"), "draft dir");
const list = brandList();
ok(list.find(b => b.id === "harbor-point" && b.draft && !b.shipped), "brandList marks the draft");
ok(list.filter(b => !b.draft).length === fs.readdirSync(path.join(KIT, "brands")).filter(b => fs.existsSync(path.join(KIT, "brands", b, "profile.json"))).length, "brandList keeps every shipped brand");
const listed = node(path.join(KIT, "brands.js"));
ok(/harbor-point \(draft\): Harbor Point/.test(listed), "brands.js lists the draft");

// The CLI resolves the draft, says so, and the summary does not count the draft notice as drift.
const out = path.join(DRAFTS, "out");
let r = execFileSync("node", [path.join(KIT, "resolve.js"), "harbor-point", "--out", out], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
ok(/Harbor Point \(draft\)/.test(r) && !/drift/.test(r), `resolve CLI summary: ${r.trim()}`);
ok(fs.existsSync(path.join(out, "prism.css")), "resolve CLI writes prism.css");

// A changed draft fails safe until it is pinned again, and pin.js pins the draft, never the shipped copy.
fs.appendFileSync(path.join(DRAFTS, "harbor-point", "digest.md"), "\nOne more rule.\n");
ok(load("harbor-point").errors.some(e => /digest changed/.test(e)), "edited draft refuses to build before pinning");
const shippedProfile = fs.readFileSync(path.join(KIT, "brands", "prism", "profile.json"), "utf8");
ok(/\(draft\)/.test(node(path.join(KIT, "pin.js"), "harbor-point")), "pin.js names the draft");
ok(!load("harbor-point").errors.length, "pinned draft resolves");
ok(fs.readFileSync(path.join(KIT, "brands", "prism", "profile.json"), "utf8") === shippedProfile, "shipped profile untouched");

// A draft with a shipped brand's id (a re-run) replaces it in this workspace only, and says so.
fs.cpSync(src, path.join(DRAFTS, "prism"), { recursive: true });
ok(brandDir("prism").draft, "same-id draft wins");
ok(/prism \(draft, replaces the shipped brand here\)/.test(node(path.join(KIT, "brands.js"))), "brands.js says the draft replaces the shipped brand");
ok(load("prism").draft, "same-id draft loads as draft");

// The Python tools find drafts the same way.
const py = execFileSync("python3", ["-c", "import sys; sys.path.insert(0, sys.argv[1]); from brandpath import brand_dir, default_brand; print(brand_dir('harbor-point')); print(brand_dir('prism')); print(default_brand())", KIT], { env, encoding: "utf8" }).trim().split("\n");
ok(py[0] === path.join(DRAFTS, "harbor-point"), "brandpath finds the draft");
ok(py[1] === path.join(DRAFTS, "prism"), "brandpath prefers the same-id draft");
ok(py[2] === shippedDefault.id, "brandpath default ignores drafts");

fs.rmSync(DRAFTS, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
