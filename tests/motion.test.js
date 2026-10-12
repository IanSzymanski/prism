// Motion: the motion format file, its brief for Claude Motion, and the check of the film Motion made.
// Usage: node tests/motion.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-motion-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const motion = (...a) => spawnSync("node", [path.join(KIT, "motion.js"), ...a], { encoding: "utf8" });
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

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`motion: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
