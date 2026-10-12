// Device mockups (core): phone, tablet and laptop frames around a screenshot, in sheets, decks and films.
// Usage: node tests/devices.test.js   (the PNG and build checks need the kit's deck tools: run.sh setup deck)
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-devices-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const D = require(path.join(KIT, "devices.js"));
const SHOT = path.join(KIT, "brands", "prism", "snapshot", "assets", "Templates", "sample-screen.png");
const run = (...a) => spawnSync("bash", [path.join(KIT, "run.sh"), ...a], { encoding: "utf8", cwd: TMP });

// 1. Geometry: three devices, two tones, the screen inside the body, a turned phone or tablet swaps its sides.
ok(D.DEVICES.join() === "phone,tablet,laptop", "phone, tablet, laptop");
for (const d of D.DEVICES) for (const tone of ["dark", "light"]) {
  const g = D.geometry(d, { tone }), s = g.screen;
  ok(s.x > 0 && s.y > 0 && s.x + s.w < g.w && s.y + s.h < g.h, `${d} ${tone}: the screen sits inside the frame`);
  ok(/fill-rule="evenodd"/.test(g.svg) && !/NaN|undefined/.test(g.svg), `${d} ${tone}: the frame is drawn with a hole for the screen`);
}
ok(D.geometry("phone").screen.h > D.geometry("phone").screen.w && D.geometry("laptop").screen.w / D.geometry("laptop").screen.h === 1.6, "a portrait phone, a 16:10 laptop");
for (const d of ["phone", "tablet"]) {
  const p = D.geometry(d), l = D.geometry(d, { landscape: true });
  ok(l.w === p.h && l.h === p.w && l.screen.w === p.screen.h && l.screen.h === p.screen.w && l.landscape, `${d}: landscape is the portrait one turned`);
  ok(l.screen.x + l.screen.w < l.w && l.screen.y + l.screen.h < l.h && /rotate\(-90\)/.test(l.svg), `${d}: the turned screen stays inside`);
}
ok(!D.geometry("laptop", { landscape: true }).landscape, "a laptop has no landscape");
let threw = ""; try { D.geometry("watch"); } catch (e) { threw = e.message; } ok(/phone, tablet, laptop/.test(threw), "an unknown device is refused by name");
threw = ""; try { D.geometry("phone", { tone: "gold" }); } catch (e) { threw = e.message; } ok(/dark, light/.test(threw), "an unknown tone is refused by name");

// 2. Page markup: the screenshot in the screen (top kept by default), the frame as inline SVG over it, no brand in core.
const h = D.html("file:///x/shot.png", { device: "phone", alt: "Intake \"screen\"" });
ok(/class="prism-device prism-device--phone tone-dark"/.test(h) && /<img class="prism-device__screen"/.test(h) && /<svg class="prism-device__frame"/.test(h), "markup: wrapper, screen, frame");
ok(/data-focus="50% 0%"/.test(h) && /alt="Intake &quot;screen&quot;"/.test(h), "the crop keeps the top; the caption is escaped");
ok(/data-focus="20% 40%"/.test(D.html("a.png", { device: "laptop", focus: "20% 40%" })), "a written focus wins");
ok(/is-landscape/.test(D.html("a.png", { device: "tablet", landscape: true, tone: "light" })), "a turned tablet says so");

// 3. A framed PNG: the frame's size, transparent outside the body, the screenshot inside the screen.
const sharpOk = spawnSync("bash", ["-c", `. "${KIT}/env.sh" 2>/dev/null; node -e "require('sharp')"`]).status === 0;
if (!sharpOk) console.log("skip: sharp is not installed (run.sh setup deck), so PNG and build checks are skipped");
else (async () => {
  const r = run("devices", "render", SHOT, path.join(TMP, "laptop.png"), "--device", "laptop", "--width", "1720");
  ok(r.status === 0 && /1720×1036/.test(r.stdout), `render writes the frame's size: ${r.stdout}${r.stderr}`);
  const px = spawnSync("bash", ["-c", `. "${KIT}/env.sh"; node -e "require('sharp')(process.argv[1]).raw().toBuffer({resolveWithObject:true}).then(({data,info})=>{const a=(x,y)=>data[(y*info.width+x)*4+3];console.log(info.channels,a(2,1030),a(860,500))})" "${path.join(TMP, "laptop.png")}"`], { encoding: "utf8" }).stdout.trim().split(" ").map(Number);
  ok(px[0] === 4 && px[1] === 0 && px[2] === 255, `transparent beside the base, solid on the screen: ${px}`);
  ok(run("devices", "render", SHOT, path.join(TMP, "x.png"), "--device", "watch").status === 1, "render refuses an unknown device");

  // 4. A sheet: the frame is vector in the PDF and the build passes verify.
  fs.mkdirSync(path.join(TMP, "images"), { recursive: true }); fs.copyFileSync(SHOT, path.join(TMP, "images", "screen.png"));
  fs.writeFileSync(path.join(TMP, "sheet.md"), `---\ntitle: Devices\n---\n\n## Screens\n\n![The screen.](images/screen.png){device=laptop}\n\n::: media\n![](images/screen.png){device=phone tone=light}\n\nBeside a phone.\n:::\n`);
  let b = run("sheet", "sheet.md", "sheet.pdf", "--html");
  ok(b.status === 0, `sheet with devices builds: ${b.stderr}`);
  const html = fs.readFileSync(path.join(TMP, "sheet.sheet.html"), "utf8");
  ok((html.match(/class="prism-device /g) || []).length === 2 && /prism-device--phone tone-light/.test(html), "two mockups in the page, the phone silver");
  ok(/OK/.test(run("verify", "sheet.pdf").stdout), "the sheet passes verify");

  // 5. A deck: a plain device, overset left with a phone layered in front, overset right; the overset part is cut at the edge.
  fs.writeFileSync(path.join(TMP, "deck.md"), `---\ntitle: Devices\nfooter: Test\n---\n\n:::: {.slide .title}\n::::\n\n:::: {.slide .media}\n## Plain\n![](images/screen.png){device=laptop}\n\nText.\n::::\n\n:::: {.slide .media .overset-left}\n## Layers\n![](images/screen.png){device=laptop}\n![](images/screen.png){device=phone}\n\nText.\n::::\n\n:::: {.slide .media .overset-right}\n## Right\n![](images/screen.png){device=tablet .landscape}\n\nText.\n::::\n\n:::: {.slide .closing}\n## End\nexample.com\n::::\n`);
  b = run("deck", "deck.md", "deck.pptx");
  ok(b.status === 0 && !/warn|left out/i.test(b.stderr), `deck with devices builds cleanly: ${b.stderr}`);
  const slide = n => spawnSync("unzip", ["-p", path.join(TMP, "deck.pptx"), `ppt/slides/slide${n}.xml`], { encoding: "utf8" }).stdout;
  const pics = n => [...slide(n).matchAll(/<p:pic>[\s\S]*?<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/g)].map(m => m.slice(1).map(Number));
  const SW = 13.333 * 914400, inside = p => p[0] >= 0 && p[0] + p[2] <= SW + 9144;
  ok(!/descr="\//.test(slide(3)) && /descr="Laptop screen"/.test(slide(3)), "device pictures carry alt text, never a file path");
  ok(pics(2).length === 1 && inside(pics(2)[0]) && pics(2)[0][0] > 600000, "plain: one device on the left margin");
  const L = pics(3);
  ok(L.length === 2 && L[0][0] === 0 && L.every(inside), `overset left: the laptop starts at the slide's edge (cut), the phone in front: ${JSON.stringify(L)}`);
  ok(L[1][0] > L[0][0] && L[1][0] < L[0][0] + L[0][2] && L[1][3] < L[0][3], "the phone overlaps the laptop's inner corner and is smaller");
  const R = pics(4);
  ok(R.length === 1 && Math.abs(R[0][0] + R[0][2] - SW) < 20000, "overset right: the tablet is cut at the right edge");
  ok(/OK/.test(run("verify", "deck.pptx").stdout), "the deck passes verify");

  // 6. A film: frame=laptop sends core's frame as a record and tells Motion where the screen is.
  const fx = fs.readFileSync(path.join(ROOT, "fixtures", "motion.md"), "utf8").replace("::: {.draw .drop at=0.6}", "![](images/screen.png){.rise frame=laptop}\n\n::: {.draw .drop at=0.6}");
  fs.writeFileSync(path.join(TMP, "motion.md"), fx);
  b = spawnSync("node", [path.join(KIT, "motion.js"), "brief", path.join(TMP, "motion.md"), "--out", path.join(TMP, "film")], { encoding: "utf8" });
  const brief = b.status === 0 ? fs.readFileSync(path.join(TMP, "film", "brief.md"), "utf8") : "";
  ok(b.status === 0 && fs.existsSync(path.join(TMP, "film", "records", "modules", "device-laptop.html.json")), `the film's laptop frame is a record: ${b.stderr}`);
  ok(/kit\.module\('device-laptop\.html'\)/.test(brief) && /left 8\.14%, top 3\.86%/.test(brief) && !/Motif `device-/.test(brief), "the brief places the screenshot in the frame's screen");
})().finally(() => { console.log(`devices: ${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; });
if (!sharpOk) { console.log(`devices: ${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; }
