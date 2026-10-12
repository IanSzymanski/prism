// Motion: the motion format file, its brief for Claude Motion, and the check of the film Motion made.
// Usage: node tests/motion.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-motion-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const motion = (...a) => spawnSync("node", [path.join(KIT, "motion.js"), ...a], { encoding: "utf8" });
const M = require(path.join(KIT, "motion.js"));
const FIX = fs.readFileSync(path.join(ROOT, "fixtures", "motion.md"), "utf8");

// 1. The fixture briefs in the default brand: four scenes, 15 s, the brand's faces and logo as uploads.
const dir = path.join(TMP, "film");
let r = motion("brief", path.join(ROOT, "fixtures", "motion.md"), "--out", dir);
ok(r.status === 0, `fixture briefs: ${r.stderr}`);
const film = JSON.parse(fs.readFileSync(path.join(dir, "film.json"), "utf8")), brief = fs.readFileSync(path.join(dir, "brief.md"), "utf8");
ok(film.scenes.map(s => s.id).join() === "before,packet,result,close", "scene ids in order");
ok(film.length === 15 && film.scenes[2].start === 7.5, "length and starts add up");
ok(film.width === 1080 && film.height === 1920, "story is 1080×1920");
ok(film.assets.length && film.assets.every(a => fs.existsSync(a.path) && a.mime), "every upload is a brand file with a type");
ok(film.assets.some(a => a.mime.startsWith("font/")) && film.logo && film.logo.name.startsWith("logo."), "brand faces and the logo are uploaded");
const B = require(path.join(KIT, "brand.js"))(path.join(ROOT, "fixtures", "motion.md"));
ok(film.palette.ground === B.color("prism-color-surface") && film.palette.main === B.color("prism-color-accent"), "palette from the brand's roles");
const upload = JSON.parse(/upload: (.*)/.exec(r.stdout)[1]);
ok(upload.file_paths.length === film.assets.length, "upload line lists every asset");
for (const s of film.scenes) for (const l of s.lines) ok(brief.includes(`"${l}"`), `brief carries "${l}" verbatim`);
ok(/Intake took 5 days\./.test(brief) && /Accent word: "5 days"/.test(brief), "accent word named apart, line kept whole");
ok(brief.includes('"23 pages"') && film.scenes[1].lines.includes("23 pages"), "quoted words in a drawn object are on-screen lines");
ok(/counts from 5 to its value/.test(brief) && film.scenes[2].counts.join() === "2,3,4,5", "count direction and its steps");
ok(/ask nothing/.test(brief) && /"theirs":1/.test(brief), "brief settles Motion's three questions");
ok(/pop at 1\.5 s \(#before\)/.test(brief) && /chime at 12\.8 s/.test(brief), "foley cues at film time");

// 2. The same file in the other shipped brand resolves its own faces.
const other = path.join(TMP, "other.md");
fs.writeFileSync(other, FIX.replace("technique:", "brand: prism\ntechnique:").replace("prism:logo", "prism:logo"));
r = motion("brief", other, "--out", path.join(TMP, "other"));
ok(r.status === 0, `second brand briefs: ${r.stderr}`);
const f2 = JSON.parse(fs.readFileSync(path.join(TMP, "other", "film.json"), "utf8"));
ok(f2.brand === "prism" && f2.palette.main !== film.palette.main, "second brand has its own palette");

// 3. The build refuses what the vocabulary doesn't have, and names it.
const bad = (label, edit, want) => {
  const f = path.join(TMP, `bad-${label}.md`); fs.writeFileSync(f, edit(FIX));
  const x = motion("brief", f, "--out", path.join(TMP, `bad-${label}`));
  ok(x.status === 1 && want.test(x.stderr), `refuses ${label}: ${x.stderr.split("\n")[0]}`);
};
bad("unknown class", t => t.replace("{.xl .words .drift}", "{.xl .words .sparkle}"), /unknown class \.sparkle/);
bad("another technique's class", t => t.replace("{.xl .words .drift}", "{.xl .type}"), /\.type is not used in stat-story/);
bad("two entrances", t => t.replace("{.xl .words .drift}", "{.xl .words .fade}"), /one enter class per block/);
bad("two sizes", t => t.replace("{.xl .words .drift}", "{.xl .l .words}"), /one size class per block/);
bad("missing id", t => t.replace(" #packet", ""), /needs an id/);
bad("duplicate id", t => t.replace("#packet", "#before"), /used twice/);
bad("bad id", t => t.replace("#packet", "#The_Packet"), /lower-case/);
bad("unknown layout", t => t.replace(".compare #packet", ".statement #packet"), /not a stat-story layout/);
bad("no closing", t => t.replace(".closing #close", ".quote #close"), /last scene is the closing/);
bad("short end card", t => t.replace("#close dur=3.5", "#close dur=2"), /held 3 s at least/);
bad("count without from", t => t.replace(" .count from=5", " .count"), /needs from=/);
bad("unknown sound", t => t.replace("sfx=ding", "sfx=airhorn"), /sfx=airhorn is not one of/);
bad("unknown technique", t => t.replace("technique: stat-story", "technique: claymation"), /technique "claymation"/);
bad("unknown aspect", t => t.replace("aspect: story", "aspect: cinema"), /aspect "cinema"/);
bad("too long", t => t.replace("#close dur=3.5", "#close dur=290"), /300 s at most/);
bad("timing outside the scene", t => t.replace("at=2.6", "at=9"), /outside the scene/);
bad("unknown attribute", t => t.replace("at=2.6", "speed=2"), /unknown attribute speed/);
bad("illustrative unlabelled", t => t.replace(/Illustrative example: organization and figures are fictional\./, "Case Amplify example.").replace("Youth services · Illustrative", "Youth services"), /illustrative/);
bad("unclosed scene", t => t.replace(/::::\s*$/, ""), /never closed/);
bad("text outside a scene", t => t.replace("---\n\n::::", "---\n\nHello\n\n::::"), /outside a scene/);

// 4. A brand can keep to some techniques (profile motion.techniques); core lists them all.
const bdir = path.join(TMP, "brand"); fs.mkdirSync(bdir);
fs.writeFileSync(path.join(bdir, "profile.json"), JSON.stringify({ motion: { techniques: ["kinetic"] } }));
ok(M.techniquesFor({ res: { dir: bdir } }).join() === "kinetic", "brand limits techniques");
ok(M.techniquesFor(null).length === Object.keys(M.T.techniques).length, "no brand: every technique");
ok(Object.keys(M.T.techniques).every(k => M.T.techniques[k].classes.every(c => M.T.classes[c])), "every technique class is in the vocabulary");

// 5. The film's words: markup text and wordy literals count, code strings don't.
const words = M.screenText(`kit.stage.append(kit.h('<div class="a"><h1 class="line" style="left:96px">Intake took ' + '5 days.</h1>' +
  '<p class="sub">Don\\'t retype</p></div>')); this.x.transform = 'translateY(' + 3 + 'px)'; kit.css('.a i{width:120px}'); const L = 'from referral to first visit';`);
ok(words.includes("Intake took 5 days.") && words.includes("Don't retype") && words.includes("from referral to first visit"), `screen text found: ${JSON.stringify(words)}`);
ok(!words.some(w => /120|translate|96/.test(w)), "CSS and transforms are not screen text");

// 6. check: a film made from the brief passes; a reworded line, a stray number or a missing face fails; page edits are routed.
const store = path.join(TMP, "store");
const writeStore = (mods, opts = {}) => {
  fs.rmSync(store, { recursive: true, force: true });
  for (const c of ["film", "modules", "assets"]) fs.mkdirSync(path.join(store, c), { recursive: true });
  const put = (c, id, data) => fs.writeFileSync(path.join(store, c, id + ".json"), JSON.stringify({ id, version: 1, data }));
  put("film", "meta", { v: 1, title: opts.title || film.title });
  put("film", "script", { code: "window.CUT = kit.scenes();" });
  put("modules", "scenes.json", { kind: "json", text: JSON.stringify({ v: 1, stage: opts.stage || "final", width: 1080, height: 1920, scenes: film.scenes.map(s => ({ id: s.id, name: s.name, dur: s.dur })) }) });
  put("modules", "base.css", { kind: "css", text: film.assets.filter(a => a.mime.startsWith("font/")).map(a => `.x{font-family:"${a.name.replace(/\.[^.]+$/, "")}"}`).join("\n") });
  put("modules", "score.js", { kind: "js", text: "kit.score(function(S,T){});" });
  for (const a of film.assets.filter(a => !(opts.drop || []).includes(a.name))) put("assets", a.name, { ref: "/_blob/" + "0".repeat(32), mime: a.mime });
  for (const [id, text] of Object.entries(mods)) put("modules", `scene-${id}.js`, { kind: "js", text });
  if (opts.retyped) put("modules", "retyped.json", { kind: "json", text: JSON.stringify(opts.retyped) });
};
const sceneCode = s => `kit.scene('${s.id}', { init(kit) { kit.stage.append(kit.h('<div class="ground">' + ${s.lines.map(l => JSON.stringify(`<p style="left:96px">${l}</p>`)).join(" + ")} + '</div>')); this.v = [5, 4, 3, 2]; }, render(t) { this.x = 'scale(' + 1.04 + ')'; } });`;
const good = Object.fromEntries(film.scenes.map(s => [s.id, sceneCode(s)]));
writeStore(good);
r = motion("check", dir, store); ok(r.status === 0 && /^OK/m.test(r.stdout), `faithful film passes: ${r.stdout}`);
writeStore({ ...good, result: good.result.replace("from referral to first visit scheduled", "from referral to the first visit") });
r = motion("check", dir, store); ok(r.status === 1 && /#result: line missing or reworded: "from referral to first visit scheduled"/.test(r.stdout), "reworded line fails");
writeStore({ ...good, close: good.close.replace("Nothing goes into the record", "Nothing (0 of 40) goes into the record") });
r = motion("check", dir, store); ok(r.status === 1 && /number 40 on screen/.test(r.stdout), "stray number fails");
writeStore({ ...good, result: good.result.replace(">2<", ">3<").replace("[5, 4, 3, 2]", "[5, 4, 3]") });
r = motion("check", dir, store); ok(r.status === 1 && /count never reaches 2/.test(r.stdout), "a count that stops short fails");
writeStore(good, { drop: [film.assets.find(a => a.mime.startsWith("font/")).name] });
r = motion("check", dir, store); ok(r.status === 1 && /is not in the film/.test(r.stdout), "missing brand face fails");
writeStore(good, { title: "Video", stage: "rough" });
r = motion("check", dir, store); ok(r.status === 1 && /title is "Video"/.test(r.stdout) && /not finished/.test(r.stdout), "title and stage checked");
const { packet, ...noPacket } = good; void packet;
writeStore(noPacket);
r = motion("check", dir, store); ok(r.status === 1 && /#packet: no scene module/.test(r.stdout), "missing scene fails");
writeStore({ ...good, close: good.close.replace("Nothing goes into the record without a person checking it.", "Nothing is saved until a person checks it.") },
  { retyped: [{ was: "Nothing goes into the record without a person checking it.", v: "Nothing is saved until a person checks it." }] });
r = motion("check", dir, store); ok(r.status === 0 && /PAGE EDITS: 1/.test(r.stdout), `page edit routed, not failed: ${r.stdout}`);

// 7. link keeps the film's url across briefs, so a revision never makes a second film.
r = motion("link", dir, "https://claude.ai/artifact/EXAMPLE");
r = motion("brief", path.join(ROOT, "fixtures", "motion.md"), "--out", dir);
ok(/film: https:\/\/claude\.ai\/artifact\/EXAMPLE/.test(r.stdout) && JSON.parse(fs.readFileSync(path.join(dir, "film.json"), "utf8")).url, "re-brief keeps the film");

// 8. The number check and vet read motion files as they are.
const cn = spawnSync("node", [path.join(KIT, "check-numbers.js"), path.join(ROOT, "fixtures", "social.md"), path.join(ROOT, "fixtures", "motion.md")], { encoding: "utf8" });
ok(cn.status === 0, `numbers in the motion fixture come from the social fixture: ${cn.stdout}`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`motion: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
