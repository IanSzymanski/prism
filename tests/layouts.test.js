// Page layouts (D4): the Prism default layouts every brand can use, brand layouts stored with the brand (from its design system
// or an onboarding draft), what each needs, the builds, pinning and reading them from a design system, and `format:` with its
// old spelling `layout: brochure|5x7`. Usage: node tests/layouts.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-lay-")), DRAFTS = path.join(TMP, "ws", ".prism", "brands");
const env = { ...process.env, PRISM_DRAFTS: DRAFTS };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const node = (...a) => spawnSync("node", a, { env, encoding: "utf8" });
const run = (...a) => spawnSync("bash", [path.join(KIT, "run.sh"), ...a], { env, encoding: "utf8" });
const json = r => { try { return JSON.parse(r.stdout); } catch { return {}; } };
const write = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof s === "string" ? s : JSON.stringify(s, null, 1)); };
// A one-pager in a layout: front matter lines, then an optional opening block, then the shared body.
const sheet = (name, fm, lead = "") => {
  const f = path.join(TMP, `${name}.md`);
  write(f, `---\ntitle: How *Harbor Point* got its afternoons back\npagetitle: Harbor Point\neyebrow: Case study\nlegal: Fictional\n${fm}---\n\n${lead}## At a glance\n\n::: stats\n- **41%** less time\n- **94%** approved\n:::\n\n## What changed\n\nDrafts start from the visit.\n\n::: {.cta-card .small}\n## Close\n:::\n`);
  return f;
};
const build = (f, ...more) => { const r = run("sheet", f, f.replace(/\.md$/, ".pdf"), "--html", ...more), h = f.replace(/\.md$/, ".sheet.html");
  return { ...r, html: fs.existsSync(h) ? fs.readFileSync(h, "utf8") : "" }; };
const bodyClass = html => (/<body class="([^"]*)"/.exec(html) || [, ""])[1].trim().split(/\s+/);
fs.mkdirSync(DRAFTS, { recursive: true });
fs.mkdirSync(path.join(TMP, "images")); fs.copyFileSync(path.join(KIT, "brands", "prism", "snapshot", "assets", "Logos", "prism-logo.svg"), path.join(TMP, "images", "cover.svg"));

// 1. The Prism default layouts, listed for any brand: standard and three others, each with what it needs.
let r = run("layouts", "--json"), core = json(r);
ok(["standard", "photo-led", "stat-first", "sidebar"].every(k => core[k] && core[k].from === "core" && core[k].base === k), `the defaults are listed: ${r.stderr}`);
ok(core["photo-led"].needs.join() === "image" && core["stat-first"].needs.join() === "stat,stat-label" && core.sidebar.needs.join() === "rail" && !core.standard.needs.length, "each default says what it needs");
ok(Object.keys(core).pop() === "standard", "standard is listed last: what a piece takes when nothing else fits");
r = run("layouts"); ok(r.status === 0 && /^photo-led: Photo-led \(Prism default\) · needs image$/m.test(r.stdout) && /when: /.test(r.stdout), `the plain listing: ${r.stdout.slice(0, 200)}`);

// 2. Each default builds on one page with its structure; a missing need or an unknown layout stops with the reason.
const docs = {
  "photo-led": sheet("photo-led", "hero: small\nlayout: photo-led\nimage: images/cover.svg\n"),
  "stat-first": sheet("stat-first", "hero: small\nlayout: stat-first\nstat: 41%\nstat-label: less time on case notes\n"),
  sidebar: sheet("sidebar", "hero: small\nlayout: sidebar\n", "::: rail\n### In short\n\n> Ours again.\n:::\n\n"),
};
for (const [k, f] of Object.entries(docs)) {
  const b = build(f);
  ok(b.status === 0 && /\(1 page\)/.test(b.stdout) && bodyClass(b.html).includes(`layout-${k}`), `${k} builds on one page: ${b.stderr.slice(0, 300)}`);
  if (k === "photo-led") ok(/<figure class="prism-cover"><img class="prism-cover__img" src="file:\/\/[^"]*\/images\/cover\.svg"/.test(b.html) && /class="prism-mast__title"/.test(b.html), "photo-led draws the cover from image: with the title block over it");
  if (k === "stat-first") ok(/prism-lead__n">41%/.test(b.html) && /prism-lead__label">less time on case notes/.test(b.html), "stat-first draws the lead figure and its label");
  if (k === "sidebar") ok(/class="prism-split"[\s\S]*class="prism-rail"[\s\S]*Ours again[\s\S]*class="prism-main"[\s\S]*At a glance/.test(b.html) && b.html.indexOf("cta-card") > b.html.indexOf("prism-main"), "sidebar puts the rail beside the story and the close below");
}
const plain = build(sheet("plain", "hero: small\n"));
ok(plain.status === 0 && bodyClass(plain.html).join(" ") === "hero-small" && !/prism-cover|prism-lead|prism-mast__title|prism-split/.test(plain.html), "a sheet with no layout: is standard, built as before");
r = run("sheet", sheet("bad", "layout: stat-first\nstat: 41%\n"), path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /layout stat-first needs stat-label: in the front matter/.test(r.stderr), `a missing need stops the build: ${r.stderr}`);
r = run("sheet", sheet("bad", "layout: sidebar\n"), path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /needs a ::: rail block/.test(r.stderr), "a sidebar without a rail stops");
r = run("sheet", sheet("bad", "layout: poster\n"), path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /no layout "poster" for case-amplify; layouts: photo-led, stat-first, sidebar, standard/.test(r.stderr), `an unknown layout stops with the list: ${r.stderr}`);
r = run("sheet", sheet("bad", "layout: photo-led\nimage: images/cover.svg\nmast-image: images/cover.svg\n"), path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /mast-image goes with the standard layout/.test(r.stderr), "a title-area photo and a photo-led cover don't mix");

// 3. A brand read from its design system (installed with ds install) with a layout of its own: pinned as the brand's data, read
// by ds want, packed with the brand, used by the build with its front defaults and its own CSS (only in that layout).
const pack = path.join(TMP, "pack-prism");
r = node(path.join(KIT, "dsbrand.js"), "pack", "prism", pack, "--with-design-system"); ok(r.status === 0, `prism packs: ${r.stderr}`);
r = node(path.join(KIT, "dsbrand.js"), "install", pack, "--url", "https://claude.ai/artifact/prism-ds", "--version", "v1"); ok(r.status === 0, `prism installs from its design system: ${r.stderr}`);
const DS = path.join(DRAFTS, "prism", "prism"), dsLay = path.join(DS, "layouts", "sheet");
write(path.join(dsLay, "hero-band.json"), { name: "Hero band", use: "A short photo band leads, the title over it.", when: "Event recaps with one good photo.", base: "photo-led", front: { hero: "x-small", subtitle: "From the layout" }, css: "hero-band.css" });
write(path.join(dsLay, "hero-band.css"), ".layout-hero-band .prism-mast h1{color:{{prism-color-accent}}}\n");
r = node(path.join(KIT, "pin.js"), "prism"); const dsProf = JSON.parse(fs.readFileSync(path.join(DS, "profile.json"), "utf8"));
ok(r.status === 0 && dsProf.own["layouts/sheet/hero-band.json"] && dsProf.own["layouts/sheet/hero-band.css"], `pin.js pins the brand's layouts with its own files: ${r.stderr}`);
let prism = json(run("layouts", "--brand", "prism", "--json"));
ok(prism["hero-band"] && prism["hero-band"].from === "prism" && prism["hero-band"].base === "photo-led" && prism["hero-band"].needs.join() === "image", "a brand layout is listed with its base, and needs what its base needs");
ok(Object.keys(prism)[0] === "hero-band" && prism["photo-led"].from === "core", "the brand's own layouts come before the defaults");
// ds want names the layout files from the pinned profile; ds pack carries them.
const want = path.join(TMP, "want", "project");
write(path.join(want, "prism", "profile.json"), fs.readFileSync(path.join(DS, "profile.json"), "utf8")); fs.copyFileSync(path.join(DRAFTS, "prism", "tokens.json"), path.join(want, "tokens.json"));
r = node(path.join(KIT, "dsbrand.js"), "want", path.dirname(want), "--fresh");
ok(r.status === 0 && /^project\/prism\/layouts\/sheet\/hero-band\.json$/m.test(r.stdout) && /^project\/prism\/layouts\/sheet\/hero-band\.css$/m.test(r.stdout), `ds want lists the brand's layouts: ${r.stdout}`);
r = node(path.join(KIT, "dsbrand.js"), "pack", "prism", path.join(TMP, "repack"));
ok(r.status === 0 && fs.existsSync(path.join(TMP, "repack", "project", "prism", "layouts", "sheet", "hero-band.css")), `ds pack carries the brand's layouts: ${r.stderr}`);
// The build: the base's structure, both classes, the layout's front defaults under the file's own, its CSS filled and last.
const band = build(sheet("band", "brand: prism\nlayout: hero-band\nimage: images/cover.svg\n"));
const cls = bodyClass(band.html), links = [...band.html.matchAll(/<link rel="stylesheet" href="file:\/\/([^"]+)"/g)].map(m => m[1]);
ok(band.status === 0 && cls.includes("layout-photo-led") && cls.includes("layout-hero-band") && /prism-cover__img/.test(band.html), `a brand layout builds on its base's structure with both classes: ${band.stderr.slice(0, 300)}`);
ok(cls.includes("hero-x-small") && /<p class="prism-lede">From the layout<\/p>/.test(band.html), "the layout's front defaults apply when the file doesn't set them");
ok(links.length && /brand-layout-sheet-hero-band\.css$/.test(links[links.length - 1]) && /brand-sheet\.css$/.test(links[links.length - 2]), `the layout's CSS loads last, after the brand's layer: ${links.map(l => path.basename(l)).join(", ")}`);
const filled = links.length ? fs.readFileSync(links[links.length - 1], "utf8") : "";
ok(/\.layout-hero-band \.prism-mast h1\{color:#[0-9A-Fa-f]{6}\}/.test(filled), `its {{role}} placeholders are filled: ${filled}`);
const own = build(sheet("band-own", "brand: prism\nlayout: hero-band\nimage: images/cover.svg\nhero: small\nsubtitle: From the file\n"));
ok(own.status === 0 && bodyClass(own.html).includes("hero-small") && !bodyClass(own.html).includes("hero-x-small") && /<p class="prism-lede">From the file<\/p>/.test(own.html), "the file's own front matter wins over the layout's defaults");
const other = build(sheet("prism-photo", "brand: prism\nlayout: photo-led\nimage: images/cover.svg\nhero: x-small\n"));
ok(other.status === 0 && !/brand-layout-sheet/.test(other.html) && !bodyClass(other.html).includes("layout-hero-band"), "the layout's CSS is loaded only for that layout");
r = run("sheet", sheet("band-bad", "brand: prism\nlayout: hero-band\n"), path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /layout hero-band needs image: in the front matter/.test(r.stderr), "a brand layout needs what its base needs");
// A changed layout in a brand read from its design system is data: it builds and warns, it never stops the build.
write(path.join(dsLay, "hero-band.css"), ".layout-hero-band .prism-mast h1{color:{{prism-color-text-strong}}}\n");
r = run("resolve", "prism", "--out", path.join(TMP, "drift"));
ok(r.status === 0 && /design system changed since this brand was checked: layouts\/sheet\/hero-band\.css/.test(r.stderr) && /1 drift warning/.test(r.stdout), `a changed layout is drift that warns: ${r.stdout}${r.stderr}`);
r = run("sheet", path.join(TMP, "band.md"), path.join(TMP, "band.pdf")); ok(r.status === 0, `and the sheet still builds: ${r.stderr.slice(0, 300)}`);
node(path.join(KIT, "pin.js"), "prism");
// Design mode: the board names the sheet's layout and the others, and draws its lead.
r = run("wire", path.join(TMP, "band.md"), path.join(TMP, "stat-first.md"), path.join(ROOT, "fixtures", "deck.md"), "--out", path.join(TMP, "wire"));
const boardOf = n => { try { return fs.readFileSync(path.join(TMP, "wire", n, `${n}.dc.html`), "utf8"); } catch { return ""; } };
ok(r.status === 0 && /Layout: <b>Hero band<\/b> · Other layouts: Photo-led, Stat-first, Sidebar, Standard\. Ask in chat/.test(boardOf("band")) && /Cover photo: images\/cover\.svg/.test(boardOf("band")), `the board names the layout and the others: ${r.stderr.slice(0, 200)}`);
ok(/data-block="meta\.stat"/.test(boardOf("stat-first")) && !/class="wlayout"/.test(boardOf("deck")), "a stat-first board draws the lead figure; decks get no layout note");

// 4. An onboarding draft's layouts: a new one, one replacing a default, a default switched off in the profile.
fs.cpSync(path.join(KIT, "brands", "prism"), path.join(DRAFTS, "acme"), { recursive: true });
const apf = path.join(DRAFTS, "acme", "profile.json"), aprof = JSON.parse(fs.readFileSync(apf, "utf8"));
aprof.id = "acme"; aprof.name = "Acme"; delete aprof.default; aprof.layouts = { sheet: { "stat-first": null } }; write(apf, aprof);
const aLay = path.join(DRAFTS, "acme", "layouts", "sheet");
write(path.join(aLay, "quote-rail.json"), { name: "Quote rail", use: "The rail carries one large quote.", when: "A strong quote from someone named.", base: "sidebar", front: { hero: "x-small" } });
write(path.join(aLay, "photo-led.json"), { name: "Acme photo-led", use: "The photo in a frame under the title.", when: "A hero photo." });
ok(node(path.join(KIT, "pin.js"), "acme").status === 0, "a draft's layouts pin like its other files");
let acme = json(r = run("layouts", "--brand", "acme", "--json"));
ok(acme["quote-rail"] && acme["quote-rail"].from === "acme" && acme["quote-rail"].needs.join() === "rail", `a draft's own layout is listed: ${r.stderr}`);
ok(acme["photo-led"].from === "acme" && acme["photo-led"].name === "Acme photo-led" && acme["photo-led"].base === "photo-led", "a brand layout with a default's id replaces it, keeping that default's structure");
ok(!acme["stat-first"] && acme.sidebar.from === "core" && acme.standard, "null in the profile switches a default off; the others stay");
r = run("sheet", sheet("acme-off", "brand: acme\nlayout: stat-first\nstat: 41%\nstat-label: less time\n"), path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /no layout "stat-first" for acme/.test(r.stderr), "a default the brand switched off is refused");
const quote = build(sheet("acme-quote", "brand: acme\nlayout: quote-rail\n", "::: rail\n> Ours again.\n:::\n\n"));
ok(quote.status === 0 && bodyClass(quote.html).join(" ") === "hero-x-small layout-sidebar layout-quote-rail" && /class="prism-rail"/.test(quote.html), `a draft's layout builds on its base: ${quote.stderr.slice(0, 300)}`);

// 5. What a brand can't do: reserved or malformed ids, standard, unknown needs, bases and keys, anything but null in the profile.
const refused = (file, body, re, msg) => { const f = path.join(aLay, file); write(f, body); const x = run("layouts", "--brand", "acme"); fs.rmSync(f); ok(x.status === 2 && re.test(x.stderr), `${msg}: ${x.stderr}`); };
const L = { name: "X", use: "Y" };
for (const id of ["brochure", "5x7", "email", "web"]) refused(`${id}.json`, L, new RegExp(`${id} is a format`), `${id} is reserved`);
refused("Big_Photo.json", L, /lowercase letters, digits and hyphens/, "an id that isn't kebab-case is refused");
refused("standard.json", L, /doesn't define standard/, "a brand can't define standard");
refused("x.json", { ...L, needs: ["poster"] }, /needs is a list of image, stat, stat-label, rail/, "an unknown need is refused");
refused("x.json", { ...L, base: "quote-rail" }, /base quote-rail is not a Prism default layout/, "a base must be a Prism default layout");
refused("x.json", { ...L, layout: "x" }, /layout not known/, "an unknown key is refused");
refused("x.json", { ...L, front: { layout: "sidebar" } }, /front\.layout: a layout can't set layout/, "front can't change the layout");
refused("x.json", { ...L, css: "missing.css" }, /css missing\.css is not in layouts\/sheet\//, "a named CSS file must be there");
refused("x.json", { name: "X" }, /no use/, "a layout says what it is for");
for (const [k, v, re] of [["standard", null, /standard can't be switched off/], ["sidebar", {}, /only null goes here/], ["poster", null, /switches off a layout that doesn't exist/]]) {
  write(apf, { ...aprof, layouts: { sheet: { [k]: v } } }); const x = run("layouts", "--brand", "acme"); ok(x.status === 2 && re.test(x.stderr), `profile layouts.sheet.${k}: ${x.stderr}`);
}
write(apf, aprof);

// 6. format: picks the shape; layout: brochure and layout: 5x7 still work as its old spelling; the two can't disagree.
fs.cpSync(path.join(ROOT, "fixtures", "images"), path.join(TMP, "images"), { recursive: true });
const bro = fs.readFileSync(path.join(ROOT, "fixtures", "brochure.md"), "utf8");
for (const [name, text] of [["bro-format", bro.replace(/^layout: brochure$/m, "format: brochure")], ["bro-layout", bro]]) {
  write(path.join(TMP, `${name}.md`), text); const b = build(path.join(TMP, `${name}.md`));
  ok(b.status === 0 && /\(2 pages\)/.test(b.stdout) && /class="spread outside"/.test(b.html) && /class="spread inside"/.test(b.html), `${name}: a brochure, two sides: ${b.stderr.slice(0, 200)}`);
}
const card = build(sheet("card", "format: 5x7\n"));
ok(card.status === 0 && /class="spread side-front"/.test(card.html), `format: 5x7 builds a card: ${card.stderr.slice(0, 200)}`);
r = run("sheet", sheet("bad", "format: brochure\nlayout: 5x7\n"), path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /format: brochure and layout: 5x7 disagree/.test(r.stderr), "format: and the old layout: spelling can't disagree");
r = run("sheet", sheet("bad", "format: email\n"), path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /format: email is not built by run\.sh sheet/.test(r.stderr), "run.sh sheet refuses a format it doesn't build");
r = node(path.join(KIT, "check-numbers.js"), sheet("nums", "title: T\n"), path.join(TMP, "card.md"));
ok(r.status === 0, `format: 5x7 is not a number claim: ${r.stdout}`);

// 7. Packages: a sheet may carry a page layout the brand has; an html email may say format: email.
const proj = path.join(TMP, "piece"); write(path.join(proj, "content.md"), "---\ntitle: T\nstatus: approved\nversion: 1\n---\n\n41% less time.\n");
node(path.join(KIT, "packages.js"), "use", proj, "--new", "Pair", "--add", "one:sheet", "--add", "mail:html-email");
write(path.join(proj, "formats", "mail.md"), "---\nformat: email\nsubject: S\n---\n\n41% less time.\n");
write(path.join(proj, "formats", "one.md"), "---\ntitle: T\nlayout: sidebar\n---\n\n41% less time.\n");
r = node(path.join(KIT, "packages.js"), "check", proj); ok(r.status === 0, `a sheet in a page layout and format: email check OK: ${r.stdout}`);
write(path.join(proj, "formats", "one.md"), "---\ntitle: T\nlayout: poster\n---\n\n41% less time.\n");
r = node(path.join(KIT, "packages.js"), "check", proj); ok(r.status === 1 && /one: layout poster is not one of this brand's sheet layouts/.test(r.stdout), `an unknown sheet layout is caught: ${r.stdout}`);

// 8. The photo-led cover's darkening (scrim.js): the same ramp as always when the photo is dark enough, and enough more under
// each piece of text on a light photo that it reaches the target (4.8:1, so the baked JPEG and the print clear 4.5:1).
const SC = require(path.join(KIT, "scrim.js")), bsSrc = fs.readFileSync(path.join(KIT, "build-sheet.js"), "utf8");
ok(/require\("\.\/scrim\.js"\)\.inPage/.test(bsSrc) && /window\.prismScrim\.plan\(c, S, box, scrimColor, texts\)/.test(bsSrc), "the sheet build darkens the cover with scrim.js, measuring the text over it");
ok(SC.BASE.length === 13 && SC.BASE[1].join() === "0.15,0" && SC.BASE[11][1] === 0.9 && SC.BASE[12].join() === "1,0.9" && Math.abs(SC.BASE[6][0] - 0.45) < 1e-9 && SC.BASE[6][1] === 0.45, "the ramp: clear to 15%, smooth to 90% at 75%, as before");
const W3 = [255, 255, 255], K3 = [0, 0, 0];
const a0 = SC.need(W3, W3, K3);
ok(a0 > 0.4 && a0 < 0.7 && SC.contrast(W3, W3.map(v => (1 - a0) * v)) >= SC.TARGET, `white text on a white photo needs about half the darkening: ${a0}`);
ok(SC.need(W3, [40, 40, 40], K3) === 0, "white text on a dark photo needs none");
ok(SC.stops([{ top: 0.7, alpha: 0.3 }]).stops === SC.BASE && !SC.stops([{ top: 0.7, alpha: 0.3 }]).strengthened, "text the ramp already covers keeps the ramp exactly");
const up = SC.stops([{ top: 0.3, alpha: a0 }]), at = y => up.stops.find(([p]) => p >= y)[1];
ok(up.strengthened && at(0.3) >= a0 - 0.005 && at(0.1) === 0 && up.stops.every(([p, x], k) => !k || x >= up.stops[k - 1][1]), "high text on a light photo gets its darkening from just above it, the top stays clear, and it only ever darkens downward");
(async () => {
  try {
    const { chromium } = require(require.resolve("playwright", { paths: [path.join(KIT, "node_modules"), KIT] }));
    const browser = await chromium.launch({ ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
    const page = await browser.newPage();
    await page.setContent("<body></body>"); await page.addScriptTag({ content: SC.inPage });
    // A 600x400 cover painted one colour, with a label high up and a title under it, white text, a black scrim.
    const run = fill => page.evaluate(fill => { const S = 2, cv = document.createElement("canvas"); cv.width = 1200; cv.height = 800; const c = cv.getContext("2d"); c.scale(S, S);
      c.fillStyle = fill; c.fillRect(0, 0, 600, 400); const box = { left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400 };
      const t = (top, h) => ({ box: { left: 40, right: 400, top, bottom: top + h }, color: "rgb(255, 255, 255)" });
      return window.prismScrim.plan(c, S, box, [0, 0, 0], [t(110, 14), t(130, 60), t(320, 30)]); }, fill);
    const light = await run("#fbfaf6"), dark = await run("#3a3a3a");
    ok(light.strengthened && light.reached.length === 3 && light.reached.every(x => x >= SC.TARGET - 0.01), `on a light photo every piece of text reaches the target: ${JSON.stringify(light.reached)}`);
    ok(!dark.strengthened && JSON.stringify(dark.stops) === JSON.stringify(SC.BASE) && dark.reached.every(x => x >= SC.TARGET), `on a dark photo the ramp is kept exactly: ${JSON.stringify(dark.reached)}`);
    await browser.close();
  } catch (e) { ok(false, `the in-page darkening could not run: ${e.message}`); }
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`layouts: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
