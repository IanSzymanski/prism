// Brands that live in their design systems (D19): a bundled brand packs into the project/prism/ folder its design system keeps,
// a design system read into the workspace builds exactly like the bundled brand, data drift warns, code drift stops, and the
// workspace can name its default brand.
// Usage: node tests/ds-brands.test.js
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto"), { execFileSync, spawnSync } = require("child_process");
const KIT = path.join(__dirname, "..", "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ds-")), DRAFTS = path.join(TMP, "ws", ".prism", "brands");
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const env = { ...process.env, PRISM_DRAFTS: DRAFTS };
const run = (cmd, args, e = env) => spawnSync(cmd, args, { env: e, encoding: "utf8" });
const node = (...a) => run("node", a);
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const rel = (from, p) => path.relative(from, p).split(path.sep).join("/");
const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
// The brand in a fresh process, so PRISM_DRAFTS is read the way builds read it.
const loadIn = (id, e = env) => JSON.parse(execFileSync("node", ["-e", `const r=require(${JSON.stringify(path.join(KIT, "resolve.js"))}).load(${JSON.stringify(id)});console.log(JSON.stringify({layout:r.layout,draft:r.draft,errors:r.errors,warnings:r.warnings,source:r.source,dir:r.dir,snap:r.snap}))`], { env: e, encoding: "utf8" }));
const cssIn = (id, e) => { const out = path.join(TMP, `css-${id}-${e === env ? "ds" : "kit"}`); execFileSync("node", [path.join(KIT, "resolve.js"), id, "--out", out], { env: e, stdio: "ignore" }); return fs.readFileSync(path.join(out, "prism.css"), "utf8"); };
const shippedEnv = { ...process.env, PRISM_DRAFTS: path.join(TMP, "none") };
const shipped = fs.readdirSync(path.join(KIT, "brands")).filter(b => fs.existsSync(path.join(KIT, "brands", b, "profile.json")));

// 1. Every bundled brand packs into a folder its design system keeps as it is.
for (const b of shipped) {
  const out = path.join(TMP, `pack-${b}`), r = node(path.join(KIT, "dsbrand.js"), "pack", b, out, "--with-design-system");
  ok(r.status === 0, `${b} packs: ${r.stderr}`);
  const prism = path.join(out, "project", "prism"), files = walk(prism).map(p => rel(prism, p));
  ok(files.includes("profile.json") && files.includes("digest.md"), `${b}: profile and digest in prism/`);
  ok(!files.some(f => f.startsWith("snapshot/") || f.startsWith("tutorial/")), `${b}: no snapshot or tutorial in prism/ (the design system is the source; the tutorial stays in the plugin)`);
  ok(files.filter(f => /\.mdx?$/.test(f)).join() === "digest.md", `${b}: digest.md is the only Markdown file (each would become a brand-book section)`);
  ok(walk(prism).every(p => fs.statSync(p).size <= 512 * 1024), `${b}: every file within the design system's 512 KB limit`);
  ok(files.every(f => !f.split("/").some(s => s.startsWith("."))), `${b}: no dot-files`);
  const digest = fs.readFileSync(path.join(prism, "digest.md"), "utf8");
  ok(digest.split("\n").find(l => /^# /.test(l)) === "# Prism", `${b}: the digest is titled Prism, so it shows as the Prism section of the brand book`);
  const prof = JSON.parse(fs.readFileSync(path.join(prism, "profile.json"), "utf8"));
  ok(prof.default === undefined, `${b}: a packed profile names no default`);
  ok(prof.prism === fs.readFileSync(path.join(KIT, "VERSION"), "utf8").trim(), `${b}: the profile records the Prism that packed it`);
  ok(prof.digest.sha256 === sha(path.join(prism, "digest.md")), `${b}: the digest pin matches the retitled digest`);
  for (const f of Object.keys(prof.snapshot.files)) ok(fs.existsSync(path.join(out, "project", f)), `${b}: pinned ${f} is where the design system keeps it`);
  ok(node(path.join(KIT, "dsbrand.js"), "pack", b, out).status === 1, `${b}: packing over an existing folder is refused`);
}

// 2. A folder the design system would not keep as it is fails the pack, naming each file.
const bad = path.join(DRAFTS, "harbor-point");
fs.cpSync(path.join(KIT, "brands", "prism"), bad, { recursive: true });
let bp = JSON.parse(fs.readFileSync(path.join(bad, "profile.json"), "utf8")); bp.id = "harbor-point"; bp.name = "Harbor Point"; fs.writeFileSync(path.join(bad, "profile.json"), JSON.stringify(bp, null, 1));
fs.writeFileSync(path.join(bad, "notes.md"), "# Notes\n");
fs.writeFileSync(path.join(bad, "own-big.bin"), Buffer.alloc(600 * 1024));
let r = node(path.join(KIT, "dsbrand.js"), "pack", "harbor-point", path.join(TMP, "pack-bad"));
ok(r.status === 1 && /notes\.md: a Markdown file/.test(r.stderr) && /own-big\.bin: 600 KB/.test(r.stderr), `pack names what the design system would not keep: ${r.stderr}`);

// 3. Installing a design system read into the workspace: it replaces the bundled brand of the same id and builds the same.
r = node(path.join(KIT, "dsbrand.js"), "install", path.join(TMP, "pack-harbor-point-missing"));
ok(r.status === 1 && /not a Prism brand/.test(r.stderr), "a folder without prism/profile.json is not a brand");
for (const b of shipped) {
  r = node(path.join(KIT, "dsbrand.js"), "install", path.join(TMP, `pack-${b}`), "--url", `https://claude.ai/artifact/${b}`, "--version", "v1");
  ok(r.status === 0 && /builds from its design system, version v1/.test(r.stdout), `${b} installs: ${r.stdout}${r.stderr}`);
  const res = loadIn(b);
  ok(res.layout === "design-system" && res.draft === false && !res.errors.length, `${b} resolves from its design system: ${res.errors.join("; ")}`);
  ok(!res.warnings.some(w => /design system changed|draft/.test(w)), `${b}: an unchanged design system builds without warnings`);
  ok(res.dir === path.join(DRAFTS, b, "prism") && res.snap === path.join(DRAFTS, b), `${b}: profile in prism/, design-system files beside it`);
  ok(res.source && res.source.url === `https://claude.ai/artifact/${b}` && res.source.version === "v1", `${b}: the install records where it came from`);
  // The longer folder first: a design system's prism/ sits inside it, a bundled brand's snapshot/ inside the brand.
  const norm = (s, from) => [[from.snap, "ROOT"], [from.dir, "BRAND"]].sort((x, y) => y[0].length - x[0].length).reduce((t, [p, n]) => t.split(p).join(n), s);
  const kitDir = path.join(KIT, "brands", b);
  ok(norm(cssIn(b, env), res) === norm(cssIn(b, shippedEnv), { dir: kitDir, snap: path.join(kitDir, "snapshot") }), `${b}: the design-system copy resolves to the bundled brand's values`);
}
const listed = node(path.join(KIT, "brands.js")).stdout;
ok(/case-amplify \(default\) \(from its design system, version v1\)/.test(listed), `brands lists where a brand came from: ${listed}`);
const json = JSON.parse(node(path.join(KIT, "brands.js"), "--json").stdout);
ok(json.filter(x => shipped.includes(x.id)).every(x => x.from_design_system && x.from_design_system.version === "v1" && !x.draft), "brands --json carries the design system for each");
ok(json.find(x => x.id === "harbor-point").draft && json.find(x => x.id === "harbor-point").from_design_system === null, "an onboarding draft is still a draft");
ok(json.find(x => x.id === "case-amplify").digest === path.join(DRAFTS, "case-amplify", "prism", "digest.md"), "the digest agents read is the design system's");

// 4. The Python tools find the same folders.
const py = code => run("python3", ["-c", `import sys; sys.path.insert(0, ${JSON.stringify(KIT)}); import brandpath as b; ${code}`]).stdout.trim();
ok(py("print(b.brand_dir('prism'))") === path.join(DRAFTS, "prism", "prism"), "brandpath.brand_dir finds the Prism folder");
ok(py("print(b.snapshot_dir('prism'))") === path.join(DRAFTS, "prism"), "brandpath.snapshot_dir is the design system");
ok(py("print(b.brand_file('prism', 'snapshot/fonts/IBMPlexMono-Medium.ttf'))") === path.join(DRAFTS, "prism", "fonts", "IBMPlexMono-Medium.ttf"), "brandpath.brand_file maps snapshot/ paths into the design system");
const fp = run("python3", [path.join(KIT, "fontpack.py"), path.join(TMP, "prism-fonts.zip"), "prism"]);
ok(fp.status === 0 && fs.existsSync(path.join(TMP, "prism-fonts.zip")), `fontpack reads Office fonts from the design system: ${fp.stderr}`);

// 5. The tutorial stays in the plugin: a brand read from its design system uses the sample bundled under its id.
const tut = JSON.parse(node(path.join(KIT, "tutorial.js"), "case-amplify", "--json").stdout);
ok(tut.sample === "brand" && tut.dir === path.join(KIT, "brands", "case-amplify", "tutorial"), `the tutorial keeps the plugin's sample: ${tut.sample} ${tut.dir}`);

// 6. Packages: a brand's own, from its Prism folder.
fs.writeFileSync(path.join(DRAFTS, "prism", "prism", "packages.json"), JSON.stringify({ packages: { "field-kit": { name: "Field kit", use: "Event handouts", outputs: [{ id: "sheet", format: "sheet" }] } } }));
const pk = node(path.join(KIT, "packages.js"), "list", "--brand", "prism", "--json");
ok(pk.status === 0 && JSON.parse(pk.stdout)["field-kit"], `packages reads prism/packages.json: ${pk.stderr}`);

// 7. Drift: the editors' data changes build with a warning; code changes stop the build; the index never counts.
const ca = path.join(DRAFTS, "case-amplify");
fs.appendFileSync(path.join(ca, "tokens.json"), "\n");
fs.appendFileSync(path.join(ca, "prism", "digest.md"), "\nOne more rule.\n");
fs.appendFileSync(path.join(ca, "design-system.json"), "\n");
let res = loadIn("case-amplify");
ok(!res.errors.length, `data changes still build: ${res.errors.join("; ")}`);
ok(res.warnings.includes("design system changed since this brand was checked: tokens.json") && res.warnings.includes("design system changed since this brand was checked: digest.md"), `data changes warn: ${res.warnings.join("; ")}`);
ok(!res.warnings.some(w => /design-system\.json/.test(w)), "the design system's index is not drift");
r = node(path.join(KIT, "resolve.js"), "case-amplify", "--out", path.join(TMP, "drift"));
ok(r.status === 0 && /from its design system.*2 drift warning/.test(r.stdout), `resolve says it is from its design system and counts drift: ${r.stdout}`);
const pinned = Object.keys(JSON.parse(fs.readFileSync(path.join(ca, "prism", "profile.json"), "utf8")).snapshot.files).sort();
r = node(path.join(KIT, "pin.js"), "case-amplify");
ok(r.status === 0 && /from its design system/.test(r.stdout), `pin re-checks a design-system brand: ${r.stdout}`);
ok(!loadIn("case-amplify").warnings.some(w => /design system changed/.test(w)), "after pinning, no drift");
ok(JSON.stringify(Object.keys(JSON.parse(fs.readFileSync(path.join(ca, "prism", "profile.json"), "utf8")).snapshot.files).sort()) === JSON.stringify(pinned), "pinning a design system pins what the brand reads, not the whole design system");
fs.appendFileSync(path.join(ca, "prism", "ornaments.js"), "\n// changed\n");
res = loadIn("case-amplify");
ok(res.errors.some(e => /ornaments\.js \(code/.test(e)), `changed ornaments stop the build: ${res.errors.join("; ")}`);
node(path.join(KIT, "pin.js"), "case-amplify");
const gen = Object.values(JSON.parse(fs.readFileSync(path.join(ca, "prism", "profile.json"), "utf8")).generators)[0].script;
fs.appendFileSync(path.join(ca, gen), "\n// changed\n");
ok(loadIn("case-amplify").errors.some(e => e.includes(`${gen} (code`)), "a changed generator stops the build");
node(path.join(KIT, "pin.js"), "case-amplify");
fs.rmSync(path.join(ca, "fonts", "Inter-Medium.ttf"));
ok(loadIn("case-amplify").errors.includes("design system file missing: fonts/Inter-Medium.ttf"), "a missing file stops the build");

// 8. A profile newer than this kit reads is refused, not guessed at.
const pp = path.join(DRAFTS, "prism", "prism", "profile.json"), pj = JSON.parse(fs.readFileSync(pp, "utf8"));
fs.writeFileSync(pp, JSON.stringify({ ...pj, schema: 99 }));
ok(loadIn("prism").errors.some(e => /schema 99; this Prism reads schema 1: update Prism/.test(e)), "a newer profile schema is refused");
fs.writeFileSync(pp, JSON.stringify(pj));

// 9. The workspace default, and removing a copy.
r = node(path.join(KIT, "dsbrand.js"), "install", path.join(TMP, "pack-prism"), "--default");
ok(r.status === 0 && /this workspace's default brand/.test(r.stdout), `install --default: ${r.stdout}${r.stderr}`);
const dflt = e => execFileSync("node", ["-e", `console.log(require(${JSON.stringify(path.join(KIT, "resolve.js"))}).defaultBrand())`], { env: e, encoding: "utf8" }).trim();
ok(dflt(env) === "prism", "the workspace default wins over the bundled default");
ok(py("print(b.default_brand())") === "prism", "brandpath agrees on the workspace default");
fs.writeFileSync(path.join(DRAFTS, ".default"), "harbor-point\n");
ok(dflt(env) === "case-amplify", "a draft named as the workspace default is ignored: drafts are never the default");
fs.writeFileSync(path.join(DRAFTS, ".default"), "prism\n");
r = node(path.join(KIT, "dsbrand.js"), "install", path.join(TMP, "pack-prism"));
ok(r.status === 0, "installing again replaces the copy");
r = node(path.join(KIT, "dsbrand.js"), "remove", "prism");
ok(r.status === 0 && !fs.existsSync(path.join(DRAFTS, "prism")) && !fs.existsSync(path.join(DRAFTS, ".default")), "remove drops the copy and the default it held");
ok(dflt(env) === "case-amplify", "with the workspace default gone, the bundled default is back");
r = node(path.join(KIT, "dsbrand.js"), "remove", "harbor-point");
ok(r.status === 1, "remove refuses an onboarding draft");

// 10. An onboarding draft of the same id is never overwritten by an install unless asked.
fs.cpSync(path.join(KIT, "brands", "prism"), path.join(DRAFTS, "prism"), { recursive: true });
r = node(path.join(KIT, "dsbrand.js"), "install", path.join(TMP, "pack-prism"));
ok(r.status === 1 && /onboarding draft of prism/.test(r.stderr), "install refuses to overwrite an onboarding draft");
r = node(path.join(KIT, "dsbrand.js"), "install", path.join(TMP, "pack-prism"), "--replace");
ok(r.status === 0 && loadIn("prism").layout === "design-system", "--replace drops the draft for the design system's brand");
r = node(path.join(KIT, "onboard.js"), "update", "prism");
ok(r.status === 1 && /prism is read from its design system/.test(r.stderr + r.stdout), `onboarding names a design-system brand in the way, not a draft: ${r.stderr}`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
