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
ok(film.length === 20 && film.scenes[3].start === 12, "length and starts add up");
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
ok(film.scenes[0].into === null && film.scenes.slice(1).map(s => s.into).join() === "wipe,iris,slide,blinds", "transitions as written, none into the first scene");
ok(film.records.map(x => `${x.collection}/${x.doc_id}`).join() === "modules/icons.json,modules/motif-wave-dark.html", "icons and the dark-ground motif are prepared records");
const icons = JSON.parse(JSON.parse(fs.readFileSync(path.join(dir, "records", "modules", "icons.json.json"), "utf8")).text);
ok(Object.keys(icons).join() === "file-text,flag,user-check" && Object.values(icons).every(d => /^M/.test(d)), "icon paths from the brand's set");
const motifRec = JSON.parse(fs.readFileSync(path.join(dir, "records", "modules", "motif-wave-dark.html.json"), "utf8"));
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
ok(/it leaves upward/.test(sec("before")) && /By 3\.05 s every block that leaves has left/.test(sec("before")), "blocks leave before the transition out");
ok(!/ s it (leaves|fades out|drops away|shrinks away)/.test(sec("close")) && /Ends the film/.test(sec("close")), "nothing leaves the end card");
ok(/marker band/.test(sec("packet")) && /underline/.test(sec("before")), "emphasis on the accent word");
ok(/counts from 5 to its value/.test(sec("result")) && film.scenes[3].counts.join() === "2,3,4,5", "count direction and its steps");
ok(/whoosh at 3\.1 s/.test(text) && /chime at 17\.5 s/.test(text), "foley and transition whooshes at film time");

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
const other = brief(FIX.replace("technique:", "brand: prism\ntechnique:").replace("backdrop=motif", "backdrop=motif motif=spectrum"), "other");
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
bad("unknown class", t => t.replace("{.xl .mask .underline}", "{.xl .mask .sparkle}"), /unknown class \.sparkle/);
bad("another technique's class", t => t.replace("{.xl .mask .underline}", "{.xl .split}"), /\.split is not used in stat-story/);
bad("two entrances", t => t.replace("{.xl .mask .underline}", "{.xl .mask .fade}"), /one enter class per block/);
bad("two sizes", t => t.replace("{.xl .mask .underline}", "{.xl .l .mask}"), /one size class per block/);
bad("emphasis without accent", t => t.replace("# Intake took *5 days*.", "# Intake took 5 days."), /marks the accent word/);
bad("missing id", t => t.replace(" #packet", ""), /needs an id/);
bad("duplicate id", t => t.replace("#packet", "#before"), /used twice/);
bad("bad id", t => t.replace("#packet", "#The_Packet"), /lower-case/);
bad("unknown layout", t => t.replace(".compare #packet", ".statement #packet"), /not a stat-story layout/);
bad("no closing", t => t.replace(".closing #close", ".quote #close"), /last scene is the closing/);
bad("short end card", t => t.replace("#close dur=4", "#close dur=2"), /held 3 s at least/);
bad("count without from", t => t.replace(" .count from=5", " .count"), /needs from=/);
bad("unknown sound", t => t.replace("sfx=ding", "sfx=airhorn"), /sfx=airhorn is not one of/);
bad("unknown technique", t => t.replace("technique: stat-story", "technique: claymation"), /technique "claymation"/);
bad("unknown aspect", t => t.replace("aspect: story", "aspect: cinema"), /aspect "cinema"/);
bad("unknown energy", t => t.replace("energy: lively", "energy: frantic"), /energy is one of/);
bad("unknown ground", t => t.replace("bg=tint", "bg=neon"), /bg=neon is not one of/);
bad("unknown backdrop", t => t.replace("backdrop=dots", "backdrop=confetti"), /backdrop=confetti is not one of/);
bad("unknown transition", t => t.replace("in=wipe", "in=spin"), /in=spin is not one of/);
bad("transition into the first scene", t => t.replace("#before dur=3.5", "#before in=wipe dur=3.5"), /first scene has nothing to arrive from/);
bad("unknown motif", t => t.replace("backdrop=motif", "backdrop=motif motif=sunburst"), /motif sunburst is not one of/);
bad("icon not in the brand set", t => t.replace(".ph-flag", ".ph-not-an-icon"), /icon not-an-icon is not in the brand's icon set/);
bad("frame on a line", t => t.replace("[days]{.unit}", "[days]{.unit frame=card}"), /frame= is for pictures/);
bad("too long", t => t.replace("#close dur=4", "#close dur=290"), /300 s at most/);
bad("timing outside the scene", t => t.replace("at=2.2", "at=9"), /outside the scene/);
bad("unknown attribute", t => t.replace("at=2.2", "speed=2"), /unknown attribute speed/);
bad("unknown scene attribute", t => t.replace("in=iris", "in=iris tempo=fast"), /unknown scene attribute tempo/);
bad("old ground front matter", t => t.replace("energy: lively", "ground: dark"), /ground is set per scene/);
bad("illustrative unlabelled", t => t.replace(/Illustrative example: organization and figures are fictional\./, "Case example.").replace("Youth services · Illustrative", "Youth services"), /illustrative/);
bad("unclosed scene", t => t.replace(/::::\s*$/, ""), /never closed/);
bad("text outside a scene", t => t.replace("---\n\n::::", "---\n\nHello\n\n::::"), /outside a scene/);
const twice = brief(FIX.replace("bg=tint", "bg=glow"), "twice");
ok(twice.r.status === 0 && /same ground as the scene before/.test(twice.r.stderr), "warns when a ground set by hand repeats");

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
const sceneCode = s => `kit.scene('${s.id}', { init(kit) { kit.stage.append(kit.h('<div class="ground g-${s.id}">' + ${s.lines.map(l => JSON.stringify(`<p style="left:96px">${l}</p>`)).join(" + ") || "''"} + '</div>')); this.v = [5, 4, 3, 2]; ${s.id === "change" ? "kit.json('icons.json'); kit.module('motif-wave-dark.html');" : ""} }, render(t) { this.x = 'scale(' + 1.04 + ')'; } });`;
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
writeStore({ ...good, change: good.change.replace("motif-wave-dark.html", "motif-wave-dark.svg") });
r = motion("check", dir, store); ok(r.status === 1 && /no scene uses it by that name/.test(r.stdout), "a record asked for by the wrong name fails");
writeStore(good, { title: "Video", stage: "rough" });
r = motion("check", dir, store); ok(r.status === 1 && /title is "Video"/.test(r.stdout) && /not finished/.test(r.stdout), "title and stage checked");
const { packet, ...noPacket } = good; void packet;
writeStore(noPacket);
r = motion("check", dir, store); ok(r.status === 1 && /#packet: no scene module/.test(r.stdout), "missing scene fails");
writeStore({ ...good, close: good.close.replace("Nothing goes into the record without a person checking it.", "Nothing is saved until a person checks it.") },
  { retyped: [{ was: "Nothing goes into the record without a person checking it.", v: "Nothing is saved until a person checks it." }] });
r = motion("check", dir, store); ok(r.status === 0 && /PAGE EDITS: 1/.test(r.stdout), `page edit routed, not failed: ${r.stdout}`);

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
