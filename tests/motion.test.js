// Motion: the motion format file, its brief for Claude Motion, and the check of the film Motion made.
// Usage: node tests/motion.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-motion-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
// Core's film behavior (music, motifs, the wave transition, Phosphor icons) is tested on a draft copy of the default brand
// without its own film settings (profile motion.film); those settings have their own section at the end.
const CORE_DRAFTS = path.join(TMP, "core-drafts"), DEF0 = require(path.join(KIT, "resolve.js")).defaultBrand();
fs.cpSync(path.join(KIT, "brands", DEF0), path.join(CORE_DRAFTS, DEF0), { recursive: true });
{ const pf = path.join(CORE_DRAFTS, DEF0, "profile.json"), pr = JSON.parse(fs.readFileSync(pf, "utf8")); delete pr.motion.film; fs.writeFileSync(pf, JSON.stringify(pr, null, 1)); }
process.env.PRISM_DRAFTS = CORE_DRAFTS;
const motion = (...a) => spawnSync("node", [path.join(KIT, "motion.js"), ...a], { encoding: "utf8", env: { ...process.env, PRISM_DRAFTS: CORE_DRAFTS } });
const M = require(path.join(KIT, "motion.js"));
const FIX = fs.readFileSync(path.join(ROOT, "fixtures", "motion.md"), "utf8");
const brief = (text, name) => { const f = path.join(TMP, `${name}.md`); fs.writeFileSync(f, text); const d = path.join(TMP, name); const r = motion("brief", f, "--out", d); return { r, d, film: r.status === 0 ? JSON.parse(fs.readFileSync(path.join(d, "film.json"), "utf8")) : null, text: r.status === 0 ? fs.readFileSync(path.join(d, "brief.md"), "utf8") : "" }; };

// 1. The fixture briefs in the default brand: five scenes, 20 s, a ground and colors per scene, transitions, uploads and records.
const dir = path.join(TMP, "film");
let r = motion("brief", path.join(ROOT, "fixtures", "motion.md"), "--out", dir);
ok(r.status === 0, `fixture briefs: ${r.stderr}`);
const film = JSON.parse(fs.readFileSync(path.join(dir, "film.json"), "utf8")), text = fs.readFileSync(path.join(dir, "brief.md"), "utf8");
ok(film.scenes.map(s => s.id).join() === "before,packet,change,result,close", "scene ids in order");
ok(film.length === 48.5 && film.scenes[3].start === 29.2, `length and starts add up: ${film.length} ${film.scenes[3].start}`);
ok(film.width === 1080 && film.height === 1920 && film.energy === "lively", "story, lively");
ok(film.assets.length && film.assets.every(a => fs.existsSync(a.path) && a.mime), "every upload is a brand file with a type");
ok(film.assets.some(a => a.name === "logo-on-dark.png"), "the end card on a dark gradient takes the on-dark logo");
const B = require(path.join(KIT, "brand.js"))(path.join(ROOT, "fixtures", "motion.md"));
const role = n => B.color(n);
ok(film.scenes[0].bg === "glow" && film.scenes[0].ground.length === 4, "a gradient ground keeps its stops");
ok(film.scenes[3].ground[0] === role("prism-color-accent"), "bg=main is the brand's main color");
ok(film.scenes[2].ground[0] === role("prism-color-dark-surface"), "bg=dark is the brand's dark surface");
for (const s of film.scenes) {
  ok(Math.min(...s.ground.map(g => M.contrast(s.colors.ink, g))) >= 4.5, `#${s.id}: ink reads on its ground`);
  ok(Math.min(...s.ground.map(g => M.contrast(s.colors.main, g))) >= 3, `#${s.id}: main color reads on its ground`);
}
ok(new Set(film.scenes.map(s => s.bg)).size === film.scenes.length, "every scene has its own ground");
ok(film.scenes[0].into === null && film.scenes.slice(1).map(s => s.into).join() === "wipe,iris,slide,wave", "transitions as written, none into the first scene; the piece leaves its grape scene on the brand wave");
ok(film.records.map(x => `${x.collection}/${x.doc_id}`).join() === "modules/icons.json,modules/motif-wave-stop.html", "icons and the centred stop wave (backdrops and transition) are prepared records");
const icons = JSON.parse(JSON.parse(fs.readFileSync(path.join(dir, "records", "modules", "icons.json.json"), "utf8")).text);
ok(Object.keys(icons).join() === "file-text,flag,user-check" && Object.values(icons).every(d => /^M/.test(d)), "icon paths from the brand's set");
const motifRec = JSON.parse(fs.readFileSync(path.join(dir, "records", "modules", "motif-wave-stop.html.json"), "utf8"));
ok(motifRec.kind === "html" && /^<svg/.test(motifRec.text), "an SVG motif goes in as markup");
const upload = JSON.parse(/upload: (.*)/.exec(r.stdout)[1]);
ok(upload.file_paths.length === film.assets.length, "upload line lists every asset");
for (const s of film.scenes) for (const l of s.lines) ok(text.includes(`"${l}"`), `brief carries "${l}" verbatim`);
ok(film.scenes[2].lines.includes("CARA flags details like upcoming court dates"), "list items are on-screen lines");
ok(/No hard cuts/.test(text) && /Everything arrives and everything leaves/.test(text) && /Nothing is ever still/.test(text), "brief states the motion rules");
ok(/\*\*Ends \(wipe into #packet\)\*\*/.test(text) && /\*\*Arrives \(wipe\)\*\*: it opens fully covered/.test(text), "a transition is written as two halves");
ok(/\.g-before/.test(text) && /One shared\.js/.test(text), "scene color classes and a shared helper");
const sec = id => text.split(`#${id} · `)[1].split("\n### ")[0];
ok(/at -1\.4 s it slides in/.test(sec("before")), "the first scene's blocks are in place before frame 0");
ok(/it leaves upward/.test(sec("before")) && /By 10\.05 s every block that leaves has left/.test(sec("before")), "blocks leave before the transition out");
ok(!/ s it (leaves|fades out|drops away|shrinks away)/.test(sec("close")) && /Ends the film/.test(sec("close")), "nothing leaves the end card");
ok(/marker band in #E3D0F3/.test(sec("packet")) && /marker band in #E3D0F3/.test(sec("before")), "highlight on the accent word, in the light gradient's color");
ok(/counts from 5 to its value/.test(sec("result")) && film.scenes[3].counts.join() === "2,3,4,5", "count direction and its steps");
ok(/whoosh at 10\.1 s/.test(text) && /chime at 39\.2 s/.test(text), "foley and transition whooshes at film time");

// 1b. Every scene holds after its last entrance lands, still moving, before anything leaves: a second per 20 characters
// on screen, 3 s at least and 12 s at most; dur= is a minimum.
ok(M.T.hold.min === 3 && M.T.hold.read === 20 && M.T.hold.max === 12 && film.hold.min === 3, "the hold rule: 3 s at least, 20 characters a second, 12 s at most");
const holdOf = c => Math.min(12, Math.max(3, Math.ceil(c / 20 * 10) / 10));
ok(film.scenes.map(s => s.chars).join() === "133,69,150,91,173", `characters on screen per scene: ${film.scenes.map(s => s.chars)}`);
ok(film.scenes[0].chars === film.scenes[0].lines.join(" ").replace(/[*_]/g, "").length, "the count is the scene's on-screen lines");
for (const s of film.scenes) ok(Math.abs(s.hold[1] - s.hold[0] - holdOf(s.chars)) < 0.001 && s.hold[1] <= s.dur + 0.001, `#${s.id}: holds ${holdOf(s.chars)} s for ${s.chars} characters inside its ${s.dur} s`);
ok(/Holds from 2\.7 s to 9\.4 s \(6\.7 s, for 133 characters\)/.test(sec("before")) && /Every scene holds once everything has landed/.test(text) && /a second for every 20 characters on screen/.test(text), "the brief states each hold");
ok(M.holdFor(10, M.T.hold) === 3 && M.holdFor(1000, M.T.hold) === 12 && M.holdFor(100, M.T.hold) === 5, "short scenes hold 3 s, long ones 12 s at most");
const slow = brief(FIX.replace("figures: illustrative", "figures: illustrative\nread: 10"), "slow");
ok(slow.r.status === 0 && slow.film.hold.read === 10 && Math.abs(slow.film.scenes[1].hold[1] - slow.film.scenes[1].hold[0] - 6.9) < 0.001, "read: in the front matter sets the reading rate");
const fixed = brief(FIX.replace("#close dur=10.8", "#close dur=4 hold=3"), "fixed");
ok(fixed.r.status === 0 && Math.abs(fixed.film.scenes[4].hold[1] - fixed.film.scenes[4].hold[0] - 3) < 0.001 && /\(3 s, set by hand\)/.test(fixed.text), "hold= on a scene sets its hold by hand");
ok(brief(FIX.replace("#close dur=10.8", "#close dur=10.8 hold=0"), "badhold").r.status === 1, "hold= below 1 s is refused");
ok(brief(FIX.replace("figures: illustrative", "figures: illustrative\nread: fast"), "badread").r.status === 1, "read: must be a number");
for (const id of ["before", "packet", "change", "result"]) {
  const leaves = [...sec(id).matchAll(/at ([\d.]+) s it (?:leaves|fades out|drops away|shrinks away)/g)].map(m => Number(m[1]));
  const hs = film.scenes.find(x => x.id === id).hold;
  ok(leaves.length && Math.min(...leaves) >= hs[1] - 0.001, `#${id}: nothing leaves before its hold ends (${Math.min(...leaves)} >= ${hs[1]})`);
}
const short = brief(FIX.replace("#packet dur=7.7", "#packet dur=4"), "short");
ok(short.r.status === 0 && /#packet runs 7\.7 s, not 4: its entrances land at 3\.2 s, then it holds 3\.5 s/.test(short.r.stderr) && short.film.scenes[1].dur === 7.7, "a scene too short for its hold grows, and says so");

// 2. A plain file still moves: defaults give every block an entrance and exit, every scene a ground, backdrop and transition.
const plain = brief(`---
title: Plain
technique: kinetic
---

:::: {.scene .title #a}
# Hello *there*
::::

:::: {.scene .statement #b}
## One idea
::::

:::: {.scene .statement #c}
## Another idea
::::

:::: {.scene .closing #d}
## Thanks
::::
`, "plain");
ok(plain.r.status === 0, `plain file briefs: ${plain.r.stderr}`);
if (plain.film) {
  const fl = plain.film;
  ok(fl.scenes.every((s, i) => i === 0 || fl.scenes[i - 1].bg !== s.bg), `default grounds never repeat back to back: ${fl.scenes.map(s => s.bg)}`);
  ok(fl.scenes.slice(1).every(s => s.into && s.into !== "cut"), "default transitions on every cut");
  ok(fl.scenes.every(s => s.backdrop && s.backdrop !== "none"), "default backdrops");
  ok(/it assembles letter by letter/.test(plain.text) && /highlight|marker band/.test(plain.text), "kinetic defaults: split entrance, emphasis on the accent");
  ok(fl.energy === "bold", "kinetic is bold by default");
}

// 3. The other shipped brand has its own colors and motifs.
const other = brief(FIX.replace("technique:", "brand: prism\ntechnique:").replaceAll(" motif=wave-stop", "").replace("backdrop=motif", "backdrop=motif motif=spectrum"), "other");
ok(other.r.status === 0, `second brand briefs: ${other.r.stderr}`);
if (other.film) {
  ok(other.film.brand === "prism" && other.film.scenes[3].ground[0] !== film.scenes[3].ground[0], "second brand has its own grounds");
  ok(other.film.records.some(x => x.doc_id === "motif-spectrum.html"), "second brand's motif picked by name");
}
ok(M.motifsFor(require(path.join(KIT, "brand.js"))(null, "prism")).length === 3, "prism brand lists its motifs");

// 4. The build refuses what the vocabulary doesn't have, and names it.
const bad = (label, edit, want) => {
  const f = path.join(TMP, `bad-${label.replace(/\W+/g, "-")}.md`); fs.writeFileSync(f, edit(FIX));
  const x = motion("brief", f, "--out", path.join(TMP, `bad-${label.replace(/\W+/g, "-")}`));
  ok(x.status === 1 && want.test(x.stderr), `refuses ${label}: ${x.stderr.split("\n")[0]}`);
};
bad("unknown class", t => t.replace("{.xl .mask .highlight}", "{.xl .mask .sparkle}"), /unknown class \.sparkle/);
bad("another technique's class", t => t.replace("{.xl .mask .highlight}", "{.xl .split}"), /\.split is not used in stat-story/);
bad("two entrances", t => t.replace("{.xl .mask .highlight}", "{.xl .mask .fade}"), /one enter class per block/);
bad("two sizes", t => t.replace("{.xl .mask .highlight}", "{.xl .l .mask}"), /one size class per block/);
bad("emphasis without accent", t => t.replace("# Intake took *5 days*.", "# Intake took 5 days."), /marks the accent word/);
bad("missing id", t => t.replace(" #packet", ""), /needs an id/);
bad("duplicate id", t => t.replace("#packet", "#before"), /used twice/);
bad("bad id", t => t.replace("#packet", "#The_Packet"), /lower-case/);
bad("unknown layout", t => t.replace(".compare #packet", ".statement #packet"), /not a stat-story layout/);
bad("no closing", t => t.replace(".closing #close", ".quote #close"), /last scene is the closing/);
bad("short end card", t => t.replace("#close dur=10.8", "#close dur=2"), /held 3 s at least/);
bad("count without from", t => t.replace(" .count from=5", " .count"), /needs from=/);
bad("unknown sound", t => t.replace("sfx=ding", "sfx=airhorn"), /sfx=airhorn is not one of/);
bad("unknown technique", t => t.replace("technique: stat-story", "technique: claymation"), /technique "claymation"/);
bad("unknown aspect", t => t.replace("aspect: story", "aspect: cinema"), /aspect "cinema"/);
bad("unknown energy", t => t.replace("energy: lively", "energy: frantic"), /energy is one of/);
bad("unknown ground", t => t.replace("bg=tint", "bg=neon"), /bg=neon is not one of/);
bad("unknown backdrop", t => t.replace("backdrop=dots", "backdrop=confetti"), /backdrop=confetti is not one of/);
bad("unknown transition", t => t.replace("in=wipe", "in=spin"), /in=spin is not one of/);
bad("transition into the first scene", t => t.replace("#before dur=10.5", "#before in=wipe dur=10.5"), /first scene has nothing to arrive from/);
bad("unknown motif", t => t.replace("motif=wave-stop", "motif=sunburst"), /motif sunburst is not one of/);
bad("icon not in the brand set", t => t.replace(".ph-flag", ".ph-not-an-icon"), /icon not-an-icon is not in the brand's icon set/);
bad("frame on a line", t => t.replace("[days]{.unit}", "[days]{.unit frame=card}"), /frame= is for pictures/);
bad("too long", t => t.replace("#close dur=10.8", "#close dur=290"), /300 s at most/);
bad("timing outside the scene", t => t.replace("at=2.2", "at=9"), /outside the scene/);
bad("unknown attribute", t => t.replace("at=2.2", "speed=2"), /unknown attribute speed/);
bad("unknown scene attribute", t => t.replace("in=iris", "in=iris tempo=fast"), /unknown scene attribute tempo/);
bad("old ground front matter", t => t.replace("energy: lively", "ground: dark"), /ground is set per scene/);
bad("illustrative unlabelled", t => t.replace(/Illustrative example: organization and figures are fictional\./, "Case example.").replace("Youth services · Illustrative", "Youth services"), /illustrative/);
bad("unclosed scene", t => t.replace(/::::\s*$/, ""), /never closed/);
bad("text outside a scene", t => t.replace("---\n\n::::", "---\n\nHello\n\n::::"), /outside a scene/);
const twice = brief(FIX.replace("bg=tint", "bg=glow"), "twice");
ok(twice.r.status === 0 && /same ground as the scene before/.test(twice.r.stderr), "warns when a ground set by hand repeats");

// 4b. The brand's rules for a kind of piece (profile motion.pieces): this brand's case study films.
const sceneSecs = film.scenes.map(x => sec(x.id)).join("\n");
ok(!/#D1409A/i.test(sceneSecs) && /Never these colors.*#D1409A/.test(text), "magenta is named only as forbidden");
ok(!/underline/.test(sceneSecs) && !/large flat shapes/.test(sceneSecs), "no underline, no free-flowing shapes");
ok(/radial-gradient\(95% 55% at 100% 100%, #6A1BAE/.test(sec("close")) && film.scenes[4].ground.includes("#140829"), "the dark card is the brand's cta-card look");
ok(film.scenes[3].colors.second === B.color("prism-color-eyebrow-on-dark") && /8 px strokes at about 45 %/.test(sec("result")), "rings in lilac, clearly visible, on the grape ground");
ok(/rises from the bottom edge.*brand wave/.test(sec("result")) && /motif-wave-stop\.html/.test(sec("result")), "the grape scene leaves on the brand wave");
ok(/Durations in days are shown as a calendar/.test(text), "the piece's own rules are in the brief");
ok(film.piece === "case-study" && film.deny.colors.includes(B.color("prism-color-chart-2")), "film.json carries the piece and its forbidden colors");
bad("a backdrop the piece never uses", t => t.replace("backdrop=dots", "backdrop=shapes"), /case study films never use backdrop=shapes/);
bad("a class the piece never uses", t => t.replace("{.xl .mask .highlight}", "{.xl .mask .underline}"), /case study films never use \.underline/);
bad("another transition out of the grape scene", t => t.replace('name="People review" bg=night', 'name="People review" in=blinds bg=night'), /leave a main scene with wave, not blinds/);
const nopiece = brief(FIX.replace("piece: case-study\n", ""), "nopiece");
ok(nopiece.r.status === 0 && /motion rules for case-study; name the piece/.test(nopiece.r.stderr) && /underline|large flat shapes/.test(nopiece.text) === false, `no piece named: warned, core vocabulary only: ${nopiece.r.stderr.split("\n")[0]}`);
const shapes = brief(FIX.replace("piece: case-study\n", "").replace("backdrop=dots", "backdrop=shapes"), "shapes");
ok(shapes.r.status === 0 && /large flat shapes/.test(shapes.text), "without the piece, core's shapes are allowed");

// 5. A brand can keep to some techniques (profile motion.techniques); core lists them all.
const bdir = path.join(TMP, "brand"); fs.mkdirSync(bdir);
fs.writeFileSync(path.join(bdir, "profile.json"), JSON.stringify({ motion: { techniques: ["kinetic"] } }));
ok(M.techniquesFor({ res: { dir: bdir } }).join() === "kinetic", "brand limits techniques");
ok(M.techniquesFor(null).length === Object.keys(M.T.techniques).length, "no brand: every technique");
for (const [k, t] of Object.entries(M.T.techniques)) {
  ok(t.classes.every(c => M.T.classes[c]), `${k}: every class is in the vocabulary`);
  ok(Object.values(t.defaults).every(d => ["enter", "hold", "exit", "emphasis"].every(x => !d[x] || t.classes.includes(d[x]))), `${k}: defaults use its own classes`);
  ok(Object.values(t.layouts).every(l => M.T.grounds[l.bg] && M.T.backdrops[l.backdrop]), `${k}: layout grounds and backdrops exist`);
  ok(t.transitions.every(x => M.T.transitions[x]), `${k}: its transitions exist`);
}

// 6. The film's words: markup text and wordy literals count, code strings don't.
const words = M.screenText(`kit.stage.append(kit.h('<div class="a"><h1 class="line" style="left:96px">Intake took ' + '5 days.</h1>' +
  '<p class="sub">Don\\'t retype</p></div>')); this.x.transform = 'translateY(' + 3 + 'px)'; kit.css('.a i{width:120px}'); const L = 'from referral to first visit';`);
ok(words.includes("Intake took 5 days.") && words.includes("Don't retype") && words.includes("from referral to first visit"), `screen text found: ${JSON.stringify(words)}`);
ok(!words.some(w => /120|translate|96/.test(w)), "CSS and transforms are not screen text");

// 7. check: a film made from the brief passes; a reworded line, a stray number, a missing face, ground or record fails; page edits are routed.
const store = path.join(TMP, "store");
const writeStore = (mods, opts = {}) => {
  fs.rmSync(store, { recursive: true, force: true });
  for (const c of ["film", "modules", "assets"]) fs.mkdirSync(path.join(store, c), { recursive: true });
  const put = (c, id, data) => fs.writeFileSync(path.join(store, c, id + ".json"), JSON.stringify({ id, version: 1, data }));
  put("film", "meta", { v: 1, title: opts.title || film.title });
  put("film", "script", { code: "window.CUT = kit.scenes();" });
  put("modules", "scenes.json", { kind: "json", text: JSON.stringify({ v: 1, stage: opts.stage || "final", width: 1080, height: 1920, scenes: film.scenes.map(s => ({ id: s.id, name: s.name, dur: s.dur })) }) });
  const grounds = film.scenes.filter(s => !(opts.noGround || []).includes(s.id)).map(s => `.g-${s.id}{background:linear-gradient(${s.ground.join(",")})}`);
  put("modules", "base.css", { kind: "css", text: [...film.assets.filter(a => a.mime.startsWith("font/")).map(a => `.x{font-family:"${a.name.replace(/\.[^.]+$/, "")}"}`), ...grounds].join("\n") });
  put("modules", "score.js", { kind: "js", text: "kit.score(function(S,T){});" });
  for (const a of film.assets.filter(a => !(opts.drop || []).includes(a.name))) put("assets", a.name, { ref: "/_blob/" + "0".repeat(32), mime: a.mime });
  for (const x of film.records.filter(x => !(opts.drop || []).includes(x.doc_id))) put(x.collection, x.doc_id, JSON.parse(fs.readFileSync(path.join(dir, "records", x.collection, x.doc_id + ".json"), "utf8")));
  for (const [id, code] of Object.entries(mods)) put("modules", `scene-${id}.js`, { kind: "js", text: code });
  if (opts.retyped) put("modules", "retyped.json", { kind: "json", text: JSON.stringify(opts.retyped) });
};
const sceneCode = s => `kit.scene('${s.id}', { init(kit) { kit.stage.append(kit.h('<div class="ground g-${s.id}">' + ${s.lines.map(l => JSON.stringify(`<p style="left:96px">${l}</p>`)).join(" + ") || "''"} + '</div>')); this.v = [5, 4, 3, 2]; ${s.id === "change" ? "kit.json('icons.json'); kit.module('motif-wave-stop.html');" : s.id === "before" ? "kit.module('motif-wave-stop.html');" : ""} }, render(t) { this.x = 'scale(' + 1.04 + ')'; } });`;
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
writeStore(good, { noGround: ["result"] });
r = motion("check", dir, store); ok(r.status === 1 && /#result: its ground .* is nowhere/.test(r.stdout), "a scene off its brand ground fails");
writeStore(good, { drop: ["icons.json"] });
r = motion("check", dir, store); ok(r.status === 1 && /record modules\/icons\.json is not in the film/.test(r.stdout), "a missing record fails");
writeStore({ ...good, change: good.change.replace("motif-wave-stop.html", "motif-wave-stop.svg"), before: good.before.replace("motif-wave-stop.html", "motif-wave-stop.svg") });
r = motion("check", dir, store); ok(r.status === 1 && /no scene uses it by that name/.test(r.stdout), "a record asked for by the wrong name fails");
writeStore(good, { title: "Video", stage: "rough" });
r = motion("check", dir, store); ok(r.status === 1 && /title is "Video"/.test(r.stdout) && /not finished/.test(r.stdout), "title and stage checked");
const { packet, ...noPacket } = good; void packet;
writeStore(noPacket);
r = motion("check", dir, store); ok(r.status === 1 && /#packet: no scene module/.test(r.stdout), "missing scene fails");
writeStore({ ...good, close: good.close.replace("Nothing goes into the record without a person checking it.", "Nothing is saved until a person checks it.") },
  { retyped: [{ was: "Nothing goes into the record without a person checking it.", v: "Nothing is saved until a person checks it." }] });
r = motion("check", dir, store); ok(r.status === 0 && /PAGE EDITS: 1/.test(r.stdout), `page edit routed, not failed: ${r.stdout}`);

writeStore({ ...good, packet: good.packet.replace("kit.scene(", "const P = '#D1409A'; kit.scene(") });
r = motion("check", dir, store); ok(r.status === 1 && /#d1409a is a color this piece never uses, but scene-packet\.js uses it/.test(r.stdout), "a forbidden color in the film fails");

// 8. link keeps the film's url across briefs, so a revision never makes a second film.
r = motion("link", dir, "https://claude.ai/artifact/EXAMPLE");
r = motion("brief", path.join(ROOT, "fixtures", "motion.md"), "--out", dir);
ok(/film: https:\/\/claude\.ai\/artifact\/EXAMPLE/.test(r.stdout) && JSON.parse(fs.readFileSync(path.join(dir, "film.json"), "utf8")).url, "re-brief keeps the film");

// 9. The number check reads motion files as they are.
const cn = spawnSync("node", [path.join(KIT, "check-numbers.js"), path.join(ROOT, "fixtures", "social.md"), path.join(ROOT, "fixtures", "motion.md")], { encoding: "utf8" });
ok(cn.status === 0, `numbers in the motion fixture come from the social fixture: ${cn.stdout}`);

// 10. A UI walkthrough: the app rebuilt from screenshots, a step card, actions in sequence, hand-offs chosen by screen.
const WT = fs.readFileSync(path.join(ROOT, "fixtures", "motion-walkthrough.md"), "utf8");
// Variants are written next to the fixture so their screenshots resolve; each is removed after it briefs.
const wtBrief = (text, name) => { const f = path.join(ROOT, "fixtures", `.wt-${name}.md`); fs.writeFileSync(f, text); const d = path.join(TMP, `wt-${name}`); const x = motion("brief", f, "--out", d); const g = motion("gaps", f); fs.rmSync(f); return { r: x, g, film: x.status === 0 ? JSON.parse(fs.readFileSync(path.join(d, "film.json"), "utf8")) : null, text: x.status === 0 ? fs.readFileSync(path.join(d, "brief.md"), "utf8") : "" }; };
const wt = wtBrief(WT, "fixture");
ok(wt.r.status === 0, `walkthrough fixture briefs: ${wt.r.stderr}`);
const wf = wt.film, wtext = wt.text, wsec = id => wtext.split(`#${id} · `)[1].split("\n### ")[0];
ok(wf.width === 1920 && wf.height === 1080 && wf.energy === "calm" && wf.data === "demo", "wide, calm, demo data");
ok(wf.scenes.map(s => s.into).join() === ",zoom-through,chrome,chrome,chrome,reframe,fade", `hand-offs from what is on either side: ${wf.scenes.map(s => s.into)}`);
ok(wf.scenes.filter(s => s.ui).map(s => `${s.screen}/${s.fit}`).join() === "desktop/full,desktop/full,desktop/full,desktop/full,phone/device", "desktop fills the wide stage; the phone sits in its mockup");
ok(wf.scenes[2].guide === "images/harbor-notes.png" && wf.scenes[4].guide === "images/harbor-new-note.png", "a scene without a screenshot stays on the page before it");
ok(wf.guides.length === 3 && wf.guides.every(g => fs.existsSync(g.file) && g.w && g.h), "every screenshot is listed with its size");
ok(!wf.assets.some(a => /harbor/.test(a.name)), "screenshots are guides, never uploaded");
ok(wf.scenes.filter(s => s.step).map(s => s.name).join("|") === "Start a note|Write it once|Share it with the team|Read it anywhere", "steps are named by their titles (chapters)");
ok(wf.scenes[3].lines[0] === "Step 2 of 4" && /the eyebrow "Step 2 of 4"/.test(wsec("write")) && /4 progress dots with the first 2 filled/.test(wsec("write")), "Prism numbers the steps on the card");
ok(["Start a note", "Write it once", "Share it with the team", "Read it anywhere"].every(t => wf.scenes[6].lines.includes(t)) && /The recap of the steps/.test(wsec("close")), "the end card recaps the steps by title");
ok(wf.scenes[6].lines.includes("Start at harborpoint.example.com") && /call to action/.test(wsec("close")), "the call to action is a line on the end card");
ok(wf.gaps.length === 1 && /Assumed, not confirmed: the sign-up address/.test(wf.gaps[0].ask) && /gap: Assumed/.test(wt.r.stderr), "an assumed detail is carried as a gap to flag");
ok(/Read each screenshot with the Read tool/.test(wtext) && /Build the app once/.test(wtext) && /harbor-new-note\.png` \(1440×900, desktop\)/.test(wtext), "the brief asks for the app rebuilt once from its screenshots");
ok(/soft scrim \(about 50 %\)/.test(wtext) && /Nothing overset/.test(wtext) && /cursor settles on a target/.test(wtext), "the house rules are in the brief");
ok(/collapses over 0\.4 s to a chip/.test(wsec("start")) && /The card's title, size s/.test(wsec("start")), "the step card opens, collapses, and is set small");
ok(/at an even 33 letters a second, the caret solid/.test(wsec("write")) && /Action \(\.choose\)/.test(wsec("write")), "typing is even and the actions are spelled out");
const acts = [...wsec("write").matchAll(/Action \(\.\w+\): at ([\d.]+) s.*?done by ([\d.]+) s/g)].map(m => [Number(m[1]), Number(m[2])]);
const collapse = Number(/at ([\d.]+) s it collapses/.exec(wsec("write"))[1]);
ok(acts.length === 3 && acts[0][0] > collapse && acts.every((a, i) => i === 0 || a[0] >= acts[i - 1][1] + 1.5), `actions wait for the card and each other: ${JSON.stringify(acts)}`);
ok(Math.abs(acts[2][1] - acts[2][0] - (0.8 + "Talked through the new schedule and next week's visit.".length / 33 + 1)) < 0.02, "typing time grows with the words");
ok(/camera pulls back out to the whole screen; by/.test(wsec("write")) && !/camera pulls back out to the whole screen; by/.test(wsec("meet")), "a zoomed scene pulls back before its hand-off; one already back doesn't");
ok(/\*\*Ends \(chrome into #write\)\*\*/.test(wtext) && /exactly the same chrome, pixel for pixel/.test(wsec("write")), "chrome hand-offs swap only the page");
ok(/toward the phone screen's proportions/.test(wsec("share")) && /in the phone mockup/.test(wsec("phone")), "a new screen reframes");
ok(/behind the app, seen only during transitions/.test(wsec("write")) && wf.scenes.filter(s => s.ui).every(s => s.bg === "light"), "app scenes share one ground behind the UI");
// The story stage: a desktop app is cropped to it and followed by the camera; toasts go to the top.
const tall = wtBrief(WT.replace("aspect: wide", "aspect: story"), "story");
ok(tall.r.status === 0 && tall.film.scenes[2].fit === "crop" && tall.film.scenes[5].fit === "full" && /slides in at the top of the frame/.test(tall.text), `a story stage crops the desktop app and fills with the phone: ${tall.r.stderr.split("\n")[0]}`);

// Interviewing for gaps: what only the person can answer stops the brief and is asked for.
const needs = (label, edit, want) => { const x = wtBrief(edit(WT), label.replace(/\W+/g, "-")); ok(x.r.status === 1 && want.test(x.r.stderr) && x.g.status === 1 && /ASK \(needed\)/.test(x.g.stdout), `asks for ${label}: ${x.r.stderr.split("\n")[0]}`); };
needs("a screenshot", t => t.replace("![Visit notes](images/harbor-notes.png){.screen}\n", ""), /ask the person: #meet: there is no screenshot/);
needs("a missing screenshot file", t => t.replace("harbor-notes.png", "harbor-gone.png"), /harbor-gone\.png isn't there/);
needs("what the data is", t => t.replace("data: demo\n", ""), /demo data, or real people's/);
needs("the phone layout", t => t.replace("![Visit notes on a phone](images/harbor-phone.png){.screen}\n", ""), /changes from the desktop to the phone layout/);
const nocta = wtBrief(WT.replace("[Start at harborpoint.example.com]{.cta}\n", ""), "nocta");
ok(nocta.r.status === 0 && /gap: #close: the end card has no call to action/.test(nocta.r.stderr) && nocta.g.status === 0 && /^ASK: /m.test(nocta.g.stdout), "a missing call to action is asked, not blocking");
const shape = wtBrief(WT.replace("#phone screen=phone", "#phone screen=desktop"), "shape");
ok(shape.r.status === 0 && /harbor-phone\.png is phone-shaped but the scene shows the desktop layout/.test(shape.r.stderr), "a screenshot of the wrong shape is asked about");
ok(motion("gaps", path.join(ROOT, "fixtures", "motion.md")).stdout.trim() === "no gaps", "a film that isn't a walkthrough has no gaps");

// Refusals: actions and screens in the wrong place, hand-offs that can't work, the vocabulary.
const wbad = (label, edit, want) => { const x = wtBrief(edit(WT), `bad-${label.replace(/\W+/g, "-")}`); ok(x.r.status === 1 && want.test(x.r.stderr), `walkthrough refuses ${label}: ${x.r.stderr.split("\n")[0]}`); };
wbad("an action on the title card", t => t.replace("# Write a visit note in *four steps* {.xl}", "# Write a visit note in *four steps* {.xl}\n\n[New note]{.click}"), /an action belongs in a scene that shows the app/);
wbad("a quote in a step", t => t.replace("[New note]{.click zoom=1.6 sfx=click}", "[New note]{.click zoom=1.6 sfx=click}\n\n> Notes in a minute"), /words on a step scene are the step card/);
wbad("a step without a title", t => t.replace("## Start a note\n", ""), /needs its title for the step card/);
wbad("a fill without its field", t => t.replace('{.fill field="Client" zoom=1.6}', "{.fill zoom=1.6}"), /\.fill names its field/);
wbad("a zoom past 2×", t => t.replace("zoom=1.8", "zoom=3"), /zoom= is 1\.4 to 2/);
wbad("an action class on a heading", t => t.replace("## Start a note", "## Start a note {.click}"), /\.click is an action: write it on its own line/);
wbad("a chrome hand-off to another screen", t => t.replace("#phone screen=phone", "#phone screen=phone in=chrome"), /keeps the chrome of the scene before/);
wbad("an unknown screen", t => t.replace("screen=phone", "screen=watch"), /screen=watch is not one of/);
wbad("unknown data", t => t.replace("data: demo", "data: live"), /data is demo or stand-in/);
wbad("stand-in data unlabelled", t => t.replace("data: demo", "data: stand-in").replace("figures: illustrative\n", "").replace("[Illustrative demo: Harbor Point and its data are fictional.]{.note}\n", "").replace(" · Illustrative demo", ""), /data: stand-in, but no line on screen says/);
bad("a click in a stat story", t => t.replace("[days]{.unit}", "[days]{.click}"), /is not used in stat-story|belongs in a scene that shows the app/);

// check: the app's words may live in ui.js; numbers in the app's own copy are noted, not failed.
const wdir = path.join(TMP, "wt-check"), wstore = path.join(TMP, "wt-store");
motion("brief", path.join(ROOT, "fixtures", "motion-walkthrough.md"), "--out", wdir);
const wfilm = JSON.parse(fs.readFileSync(path.join(wdir, "film.json"), "utf8"));
for (const c of ["film", "modules", "assets"]) fs.mkdirSync(path.join(wstore, c), { recursive: true });
const wput = (c, id, data) => fs.writeFileSync(path.join(wstore, c, id + ".json"), JSON.stringify({ id, version: 1, data }));
wput("film", "meta", { title: wfilm.title });
wput("modules", "scenes.json", { kind: "json", text: JSON.stringify({ stage: "final", width: 1920, height: 1080, scenes: wfilm.scenes.map(s => ({ id: s.id, name: s.name, dur: s.dur })) }) });
wput("modules", "base.css", { kind: "css", text: [...wfilm.assets.filter(a => a.mime.startsWith("font/")).map(a => `.x{font-family:"${a.name.replace(/\.[^.]+$/, "")}"}`), ...wfilm.scenes.map(s => `.g-${s.id}{background:linear-gradient(${s.ground.join(",")})}`)].join("\n") });
wput("modules", "score.js", { kind: "js", text: "kit.score(function(S,T){});" });
for (const a of wfilm.assets) wput("assets", a.name, { ref: "/_blob/" + "0".repeat(32), mime: a.mime });
for (const x of wfilm.records) wput(x.collection, x.doc_id, JSON.parse(fs.readFileSync(path.join(wdir, "records", x.collection, x.doc_id + ".json"), "utf8")));
const uiLines = wfilm.scenes.filter(s => s.ui).flatMap(s => s.lines);
wput("modules", "ui.js", { kind: "js", text: `kit.ui = kit.h('<main>' + ${uiLines.map(l => JSON.stringify(`<span>${l}</span>`)).join(" + ")} + '<td>12 notes this week</td></main>');` });
for (const s of wfilm.scenes) wput("modules", `scene-${s.id}.js`, { kind: "js", text: s.ui ? `kit.scene('${s.id}', { init(kit) { kit.stage.append(kit.ui); } });` : `kit.scene('${s.id}', { init(kit) { kit.assets.url('logo-on-dark.svg'); kit.stage.append(kit.h('<div class="ground g-${s.id}">' + ${s.lines.map(l => JSON.stringify(`<p>${l}</p>`)).join(" + ")} + '</div>')); } });` });
r = motion("check", wdir, wstore);
ok(r.status === 0 && /numbers in the app's own copy/.test(r.stdout) && /12 \("12 notes this week"\)/.test(r.stdout) && /flag on delivery, not confirmed/.test(r.stdout), `the app's words in ui.js pass; its numbers and gaps are noted: ${r.stdout}`);

// The brand's film settings (profile motion.film), on a draft copy of the default brand: no music, no wave motif, only its
// approved gradients, Lucide icons, its tone and feel, fewer larger words, and walkthroughs with no cards, a full-frame
// UI that animates in and out, and annotations in place of the step card.
const DEF = require(path.join(KIT, "resolve.js")).defaultBrand(), DRAFTS = path.join(TMP, "drafts");
fs.cpSync(path.join(KIT, "brands", DEF), path.join(DRAFTS, DEF), { recursive: true });
const prof = JSON.parse(fs.readFileSync(path.join(DRAFTS, DEF, "profile.json"), "utf8"));
const motifIds = (prof.motion.motifs || []).map(m => m.id);
const approved = { glow: { css: "linear-gradient(135deg, #FFFFF8 0%, #EBDDF6 100%)", say: "the light gradient" }, night: { css: "linear-gradient(170deg, #140829 0%, #381D81 100%)", say: "the night gradient" } };
prof.motion.film = { music: "none", deny_motifs: motifIds, gradients: approved, icons: "lucide", tone: "Professional empathy with light playfulness.",
  words: { max_per_scene: 12, scale: 1.25 }, feel: "Free flowing.", walkthrough: { cards: false, ui: "full-frame", annotations: { fill: "prism-color-accent", text: "#FFFFFF", lines: 1, tether: true }, ui_in_out: true } };
fs.writeFileSync(path.join(DRAFTS, DEF, "profile.json"), JSON.stringify(prof, null, 1));
const fmotion = (...a) => spawnSync("node", [path.join(KIT, "motion.js"), ...a], { encoding: "utf8", env: { ...process.env, PRISM_DRAFTS: DRAFTS } });
// The shipped default brand's own film settings refuse the fixture's wave motif and keep films silent.
const shipped = spawnSync("node", [path.join(KIT, "motion.js"), "brief", path.join(ROOT, "fixtures", "motion.md"), "--out", path.join(TMP, "shipped")], { encoding: "utf8", env: { ...process.env, PRISM_DRAFTS: "/nonexistent" } });
ok(shipped.status === 1 && /never use the wave-stop motif/.test(shipped.stderr), `the default brand's film settings refuse the wave motif: ${shipped.stderr.slice(-300)}`);
const fbrief = (txt, name) => { const f = path.join(TMP, `${name}.md`); fs.writeFileSync(f, txt); const d = path.join(TMP, name); const x = fmotion("brief", f, "--out", d);
  return { r: x, film: x.status === 0 ? JSON.parse(fs.readFileSync(path.join(d, "film.json"), "utf8")) : null, text: x.status === 0 ? fs.readFileSync(path.join(d, "brief.md"), "utf8") : "", d }; };
const NOWAVE = FIX.replace("music: calm\n", "").replaceAll(" backdrop=motif motif=wave-stop", " backdrop=dots").replace("bg=tint backdrop=dots", "bg=tint backdrop=rings").replace("bg=main backdrop=rings", "bg=main backdrop=grid");
const fb = fbrief(NOWAVE, "film-settings");
ok(fb.r.status === 0, `a film briefs under the brand's film settings: ${fb.r.stderr.slice(-600)}`);
if (fb.film) {
  ok(fb.film.music === "none" && !/whoosh at/.test(fb.text) && /No music/.test(fb.text), "no music by default, and no whooshes");
  ok(!fb.film.records.some(x => /^motif-/.test(x.doc_id)) && !fb.film.scenes.some(x => x.into === "wave") && new RegExp(`No ${motifIds.join(", ")} motif anywhere`).test(fb.text), "no motif records, no motif transition, and the brief says so");
  ok(/Gradient grounds: only these, exactly/.test(fb.text) && fb.text.includes(`background: ${approved.glow.css};`) && fb.text.includes(`background: ${approved.night.css};`), "the approved gradients are printed as CSS");
  ok(fb.film.scenes[0].ground.join() === "#FFFFF8,#EBDDF6" && fb.text.includes(`exactly \`background: ${approved.glow.css}\``), "a gradient ground is the approved gradient, exactly");
  const lu = JSON.parse(JSON.parse(fs.readFileSync(path.join(fb.d, "records", "modules", "icons.json.json"), "utf8")).text);
  ok(Object.keys(lu).sort().join() === "file-text,flag,user-check" && Object.values(lu).every(m => /^</.test(m)) && /viewBox="0 0 24 24" fill="none" stroke="currentColor"/.test(fb.text), "icons are Lucide markup, drawn as stroke icons");
  ok(/\*\*Tone:\*\* Professional empathy/.test(fb.text) && /\*\*Feel:\*\* Free flowing/.test(fb.text), "tone and feel are house rules");
  ok(/already 1\.25× core's/.test(fb.text) && /\| xl \| 188 \|/.test(fb.text), "type sizes are scaled up");
  ok(/words on screen \(the brand keeps a scene to 12\)/.test(fb.r.stderr), "a scene over the brand's words is reported");
}
ok(fbrief(FIX.replace("music: calm\n", ""), "film-wave").r.status === 1 && /never use the wave-stop motif/.test(fbrief(FIX.replace("music: calm\n", ""), "film-wave2").r.stderr), "a format file that asks for a motif the brand's films never use is refused");
ok(/bg=vivid is a gradient this brand's films never use/.test(fbrief(NOWAVE.replace("bg=main", "bg=vivid"), "film-grad").r.stderr), "a gradient that isn't approved is refused");
ok(fbrief(NOWAVE.replace("music: calm\n", "").replace("figures: illustrative", "figures: illustrative\nmusic: calm"), "film-music").film.music === "calm", "music in the front matter still wins");
// A walkthrough with no cards: it opens and ends on the app, with annotations, the UI covering the frame.
fs.cpSync(path.join(ROOT, "fixtures", "images"), path.join(TMP, "images"), { recursive: true });
const NOCARD = WT.replace("brand: prism\n", "").replace("figures: illustrative\n", "").replace(/assumed: .*\n/, "").replace("piece: walkthrough\n", "")
  .replace(/:::: \{\.scene \.title[\s\S]*?\n::::\n\n/, "").replace(/\n:::: \{\.scene \.closing[\s\S]*?\n::::\n?/, "\n").replace(/\[[^\]]*\]\{\.sub\}\n\n/g, "");
const wb = fbrief(NOCARD, "film-walk");
ok(wb.r.status === 0, `a walkthrough with no opening or closing card briefs: ${wb.r.stderr.slice(-600)}`);
if (wb.film) {
  ok(wb.film.scenes[0].layout === "app" && wb.film.scenes[wb.film.scenes.length - 1].layout === "step" && !/recap of the steps/.test(wb.text) && /No opening or closing card/.test(wb.text), "it opens and ends on the app");
  ok(/\*\*Annotation\*\*: "Start a note", tethered to "New note"/.test(wb.text) && /solid pill in #[0-9A-F]{6} with one line of #FFFFFF text/i.test(wb.text) && !/Step card/.test(wb.text) && !wb.film.scenes.some(x => x.lines.some(l => /^Step \d/.test(l))), "annotations take the step card's place");
  ok(/The app is the whole picture/.test(wb.text) && /covering the whole frame/.test(wb.text) && !/mockup/.test(wb.text.split("## Scenes")[1]), "the UI covers the frame, never a device over a ground");
  ok(/The UI animates in and out/.test(wb.text) && /over the last 1\.2 s the UI animates out/.test(wb.text), "the UI animates in and out");
}
ok(/no opening or closing card/.test(fbrief(WT.replace("brand: prism\n", ""), "film-walk-cards").r.stderr), "a title or end card is refused when the brand's walkthroughs have none");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`motion: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
