// Brand onboarding (D11): drafting a profile from a design system, mapping, bundling, and re-running on a changed design system.
// Uses the shipped brands' snapshots as design systems. Usage: node tests/onboard.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { execFileSync, spawnSync } = require("child_process");
const KIT = path.join(__dirname, "..", "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-onboard-")), DRAFTS = path.join(TMP, "drafts");
process.env.PRISM_DRAFTS = DRAFTS;
const env = { ...process.env };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const run = (...a) => spawnSync("node", [path.join(KIT, "onboard.js"), ...a], { env, encoding: "utf8" });
const prof = id => JSON.parse(fs.readFileSync(path.join(DRAFTS, id, "profile.json"), "utf8"));
const shipped = id => JSON.parse(fs.readFileSync(path.join(KIT, "brands", id, "profile.json"), "utf8"));

// 1. Start: the obvious roles are matched; a brand drafted from a shipped brand's own design system agrees with its hand-made profile.
let r = run("start", "lumen", path.join(KIT, "brands", "prism", "snapshot"), "--name", "Lumen", "--outputs", "sheet,email", "--audience", "product teams");
ok(r.status === 0, `start: ${r.stderr}`);
ok(/Builds: yes/.test(r.stdout), "a draft from a complete design system builds");
let p = prof("lumen"), hand = shipped("prism").roles;
const agree = Object.keys(hand).filter(k => p.roles[k] === hand[k]).length;
ok(agree >= 60, `drafter agrees with the hand-made Prism profile on ${agree} of ${Object.keys(hand).length} roles`);
ok(Object.keys(p.roles).every(k => !hand[k] || p.roles[k] === hand[k] || ["prism-asset-placeholder"].includes(k)), "every automatic match is one the hand-made profile also made");
ok(p.name === "Lumen" && p.content.audience === "product teams" && !p.default, "name, content defaults, never default");
ok(p._onboarding.outputs.join() === "sheet,email", "outputs recorded");
ok(p.m365.email.palette && p.m365.email.proposed, "email palette proposed");
ok(Object.keys(p.office.files).length && Object.values(p.office.files).every(h => /^[0-9a-f]{64}$/.test(h)), "Office fonts from the snapshot, pinned");
ok(/fonts\.googleapis\.com\/css2\?family=/.test(p.m365.email.fonts.webfonts), "web fonts URL");
ok(fs.existsSync(path.join(DRAFTS, "lumen", "source", "tokens.json")), "design system kept as source/");
ok(!fs.existsSync(path.join(DRAFTS, "lumen", "snapshot", "assets", "Spectrum", "fan-dark.svg")), "unmapped assets stay out of the snapshot");
r = run("start", "lumen", path.join(KIT, "brands", "prism", "snapshot"));
ok(r.status !== 0 && /already exists/.test(r.stderr), "start refuses to overwrite a draft");
ok(run("start", "prism", path.join(KIT, "brands", "prism", "snapshot")).status !== 0, "start refuses a shipped id");

// A design system named after its owner (acme-ink, brand-named accent) is matched through prefixes and usage notes.
r = run("start", "ca-test", path.join(KIT, "brands", "case-amplify", "snapshot"));
ok(/Builds: yes/.test(r.stdout), "Case Amplify's design system drafts to a building profile");
p = prof("ca-test"); hand = shipped("case-amplify").roles;
ok(p.roles["prism-color-accent"] === hand["prism-color-accent"], "accent found by its usage note");
ok(Object.keys(p.roles).every(k => !hand[k] || p.roles[k] === hand[k]), "every Case Amplify match is one the hand-made profile also made");

// 2. Map: sets, unmaps, copies an asset in from source/, rejects unknown roles.
r = run("map", "lumen", "color-wash=accent-tint", "own-asset-rule-stop=assets/Spectrum/spectrum-stop.svg", "color-band=-");
ok(r.status === 0, `map: ${r.stderr}`);
p = prof("lumen");
ok(p.roles["prism-color-wash"] === "accent-tint" && p._onboarding.matched["prism-color-wash"] === "set by hand", "map sets a role");
ok(!p.roles["prism-color-band"], "map unmaps a role");
ok(fs.existsSync(path.join(DRAFTS, "lumen", "snapshot", "assets", "Spectrum", "spectrum-stop.svg")), "map copies a mapped asset into the snapshot");
ok(run("map", "lumen", "color-nope=x").status !== 0, "map rejects an unknown role");
r = run("report", "lumen", "--json"); const rep = JSON.parse(r.stdout);
ok(rep.unmapped.some(u => u.role === "prism-color-band") && rep.unused.color.some(t => t.name === "bg"), "report lists unmapped roles and unused tokens");

// 3. Bundle: refuses the digest stub, then packs the brand without source/ and with the notes beside it.
const zip = path.join(TMP, "lumen.zip");
r = run("bundle", "lumen", zip);
ok(r.status !== 0 && /stub/.test(r.stderr), "bundle refuses the digest stub");
fs.writeFileSync(path.join(DRAFTS, "lumen", "digest.md"), "# Lumen brand rules\n\n- One accent word per title.\n");
execFileSync("node", [path.join(KIT, "pin.js"), "lumen"], { env });
fs.mkdirSync(path.join(DRAFTS, "lumen", "snapshot", "assets", "Junk"), { recursive: true }); fs.writeFileSync(path.join(DRAFTS, "lumen", "snapshot", "assets", "Junk", "old.svg"), "<svg/>");
r = run("bundle", "lumen", zip);
ok(r.status === 0, `bundle: ${r.stderr}`);
const names = execFileSync("python3", ["-c", "import zipfile,sys;print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))", zip], { encoding: "utf8" }).trim().split("\n");
ok(names.includes("ONBOARDING-lumen.md") && names.includes("lumen/profile.json"), "bundle holds the brand folder and its notes");
ok(!names.some(n => n.startsWith("lumen/source/")), "bundle leaves source/ out");
ok(!names.includes("lumen/snapshot/assets/Junk/old.svg"), "bundle drops assets nothing maps");
const bp = JSON.parse(execFileSync("python3", ["-c", "import zipfile,sys;print(zipfile.ZipFile(sys.argv[1]).read('lumen/profile.json').decode())", zip], { encoding: "utf8" }));
ok(!bp._onboarding && !bp.default && bp.m365.email.reviewed && bp.m365.email.reviewed.onboarding && !bp.m365.email.proposed, "bundled profile: no onboarding record, not default, palette accepted");
ok(!require(path.join(KIT, "resolve.js")).load("lumen").errors.length, "bundled draft still resolves");

// 4. Update: a shipped brand's changed design system lands as a same-id draft with what moved; a stale reviewed palette blocks the bundle.
const ds = path.join(TMP, "ca-ds"); fs.cpSync(path.join(KIT, "brands", "case-amplify", "snapshot"), ds, { recursive: true });
const T = JSON.parse(fs.readFileSync(path.join(ds, "tokens.json"), "utf8")), acc = shipped("case-amplify").roles["prism-color-accent"];
const tok = T.color.tokens.find(t => t.name === acc), first = T.color.themes[0].id;
if (typeof tok.value === "string") tok.value = "#7A10C0"; else tok.value[first] = "#7A10C0";
fs.writeFileSync(path.join(ds, "tokens.json"), JSON.stringify(T));
r = run("update", "case-amplify", ds);
ok(r.status === 0, `update: ${r.stderr}`);
ok(new RegExp(`color ${acc}: .*used by prism-color-accent`).test(r.stdout), "update names the changed token and the role using it");
ok(/email palette: prism-color-accent was/.test(r.stdout), "update names the palette's moved colour");
p = prof("case-amplify");
ok(p.version === shipped("case-amplify").version + 1 && p.default === undefined && p._onboarding.update_of === shipped("case-amplify").version, "update: next version, not default, records what it updates");
ok(!/onboarding not|digest changed/.test(r.stdout) && /Builds: yes/.test(r.stdout), "update keeps the brand building");
r = run("bundle", "case-amplify", path.join(TMP, "ca.zip"));
ok(r.status !== 0 && /reviewed against other colours/.test(r.stderr), "a reviewed palette whose colours moved blocks the bundle");
ok(run("palette", "case-amplify", "--keep").status === 0, "palette --keep");
p = prof("case-amplify");
ok(p.m365.email.source_roles["prism-color-accent"].toUpperCase() === "#7A10C0" && p.m365.email.reviewed.by === shipped("case-amplify").m365.email.reviewed.by, "--keep records the new colour and keeps the review");
r = run("bundle", "case-amplify", path.join(TMP, "ca.zip"));
ok(r.status === 0, `update bundle: ${r.stderr}`);
const notes = execFileSync("python3", ["-c", "import zipfile,sys;print(zipfile.ZipFile(sys.argv[1]).read('ONBOARDING-case-amplify.md').decode())", path.join(TMP, "ca.zip")], { encoding: "utf8" });
ok(/Changes since shipped version/.test(notes) && /none changed since version/.test(notes), "update notes list the changes and only changed code");
ok(run("update", "case-amplify").status !== 0, "update refuses to replace a draft");
ok(run("update", "case-amplify", "--force").status === 0, "update without a design system re-checks the shipped brand");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
