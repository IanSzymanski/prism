// Alternate layouts (D4): core's sheet layouts, a brand's own winning over core's, what each needs, the builds, and the
// note on the design-mode board. Usage: node tests/layouts.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-lay-")), DRAFTS = path.join(TMP, "drafts");
process.env.PRISM_DRAFTS = DRAFTS;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const node = (...a) => spawnSync("node", a, { env: process.env, encoding: "utf8" });
const run = (...a) => spawnSync("bash", [path.join(KIT, "run.sh"), ...a], { env: process.env, encoding: "utf8" });

// 1. Core layouts, listed for any brand.
let r = run("layouts", "--json"); const core = r.status === 0 ? JSON.parse(r.stdout) : {};
ok(["standard", "photo-led", "stat-first", "sidebar"].every(k => core[k] && core[k].from === "core"), `core lists standard and three alternates: ${r.stderr}`);
ok(core["photo-led"].needs.includes("image") && core["stat-first"].needs.join() === "stat,stat-label" && core.sidebar.needs.join() === "rail", "each layout says what it needs");

// 2. A brand's own: same id replaces core's, a new id adds one, null switches core's off; "standard" can't be replaced.
fs.mkdirSync(DRAFTS, { recursive: true }); fs.cpSync(path.join(KIT, "brands", "prism"), path.join(DRAFTS, "acme"), { recursive: true });
const pf = path.join(DRAFTS, "acme", "profile.json"), prof = JSON.parse(fs.readFileSync(pf, "utf8")); delete prof.default; fs.writeFileSync(pf, JSON.stringify(prof));
const ob = (...a) => node(path.join(KIT, "onboard.js"), "layout", "acme", ...a);
ok(ob("photo-led", "--name", "Acme photo-led", "--use", "Photo in a frame", "--needs", "image").status === 0, "onboard records a brand layout");
ok(ob("quote-led", "--name", "Quote-led", "--use", "A big quote leads", "--needs", "rail").status === 0 && ob("sidebar", "--off").status === 0, "onboard adds a new layout and switches one off");
r = run("layouts", "--brand", "acme", "--json"); const acme = r.status === 0 ? JSON.parse(r.stdout) : {};
ok(acme["photo-led"].from === "acme" && acme["photo-led"].name === "Acme photo-led" && acme["quote-led"] && !acme.sidebar && acme["stat-first"].from === "core", `brand first, then core: ${r.stderr}`);
ok(ob("standard", "--name", "X", "--use", "Y").status !== 0, "standard can't be replaced");
ok(ob("bad", "--name", "Bad", "--use", "U", "--needs", "poster").status !== 0 && !JSON.parse(fs.readFileSync(pf, "utf8")).layouts.sheet.bad, "an unknown need is refused, nothing written");
ob("sidebar", "--remove"); r = run("layouts", "--brand", "acme", "--json"); ok(JSON.parse(r.stdout).sidebar.from === "core", "removing the brand's entry brings core's back");

// 3. Builds: each core layout on one page, the right structure; a missing need or an unknown layout stops with the reason.
const base = (fm, body = "") => `---\ntitle: How *Harbor Point* got its afternoons back\npagetitle: Harbor Point\ndoctype: Case study\nlegal: Fictional\nhero: small\n${fm}---\n\n${body}## At a glance\n\n::: stats\n- **41%** less time\n- **94%** approved\n:::\n\n## What changed\n\nDrafts start from the visit.\n\n::: {.cta-card .small}\n## Close\n:::\n`;
fs.mkdirSync(path.join(TMP, "images")); fs.copyFileSync(path.join(KIT, "brands", "prism", "snapshot", "assets", "Logos", "prism-logo.svg"), path.join(TMP, "images", "cover.svg"));
const docs = {
  "photo-led": base("layout: photo-led\nimage: images/cover.svg\n"),
  "stat-first": base("layout: stat-first\nstat: 41%\nstat-label: less time on case notes\n"),
  sidebar: base("layout: sidebar\n", "::: rail\n### In short\n\n> Ours again.\n:::\n\n"),
};
for (const [k, md] of Object.entries(docs)) {
  const f = path.join(TMP, `${k}.md`); fs.writeFileSync(f, md);
  r = run("sheet", f, path.join(TMP, `${k}.pdf`), "--html");
  const html = fs.existsSync(f.replace(/\.md$/, ".sheet.html")) ? fs.readFileSync(f.replace(/\.md$/, ".sheet.html"), "utf8") : "";
  ok(r.status === 0 && /\(1 page\)/.test(r.stdout) && html.includes(`layout-${k}`), `${k} builds on one page: ${r.stderr.slice(0, 300)}`);
  if (k === "photo-led") ok(/class="prism-cover__img" src="images\/cover\.svg"/.test(html), "photo-led draws the cover from image:");
  if (k === "stat-first") ok(/prism-lead__n">41%/.test(html) && /less time on case notes/.test(html), "stat-first draws the lead figure and label");
  if (k === "sidebar") ok(/class="prism-split"[\s\S]*class="prism-rail"[\s\S]*Ours again[\s\S]*class="prism-main"[\s\S]*At a glance/.test(html) && html.indexOf("cta-card") > html.indexOf("prism-main"), "sidebar puts the rail beside the story and the close below");
}
const f2 = path.join(TMP, "bad.md");
fs.writeFileSync(f2, base("layout: stat-first\nstat: 41%\n")); r = run("sheet", f2, path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /needs stat-label: in the front matter/.test(r.stderr), `a missing need stops the build: ${r.stderr}`);
fs.writeFileSync(f2, base("layout: sidebar\n")); r = run("sheet", f2, path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /needs a ::: rail block/.test(r.stderr), "a sidebar without a rail stops");
fs.writeFileSync(f2, base("layout: poster\n")); r = run("sheet", f2, path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /no layout "poster"/.test(r.stderr), "an unknown layout stops with the list");
fs.writeFileSync(f2, base("brand: acme\nlayout: sidebar\n", "::: rail\nx\n:::\n\n")); ob("sidebar", "--off"); r = run("sheet", f2, path.join(TMP, "bad.pdf"));
ok(r.status === 1 && /no layout "sidebar" for acme/.test(r.stderr), "a layout the brand switched off is refused"); ob("sidebar", "--remove");

// 4. Design mode: the sheet's board names its layout and the others; the lead figure is editable like the title.
r = run("wire", path.join(TMP, "stat-first.md"), path.join(TMP, "photo-led.md"), path.join(KIT, "..", "..", "..", "..", "..", "fixtures", "deck.md"), "--out", path.join(TMP, "wire"));
const board = n => fs.readFileSync(path.join(TMP, "wire", n, `${n}.dc.html`), "utf8");
ok(r.status === 0 && /Layout: <b>Stat-first<\/b> · Other layouts: Standard, Photo-led, Sidebar\. Ask in chat/.test(board("stat-first")), `the board notes the layout and the others: ${r.stderr.slice(0, 200)}`);
ok(/data-block="meta\.stat"/.test(board("stat-first")) && /Cover photo: images\/cover\.svg/.test(board("photo-led")), "the board draws each layout's lead");
ok(!/wlayout"/.test(board("deck")), "decks get no sheet layout note");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`layouts: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
