// Logo positions: logo="..." on any block puts the brand's logo in one of a fixed set of places, the same everywhere.
// Usage: node tests/logo.test.js (pandoc and node; the page, deck and email checks also need Chromium, pptxgenjs and sharp)
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-logo-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const run = (cmd, a, opt = {}) => spawnSync(cmd, a, { encoding: "utf8", ...opt });
const B = require(path.join(KIT, "brand.js"))(null, "case-amplify");

// 1. The filter: inside a block (top-*, bottom-*), beside it (left, right), a post's own corner, and errors.
const pandoc = md => { const f = path.join(TMP, "in.md"); fs.writeFileSync(f, md);
  return run("pandoc", [f, "-t", "html", "--lua-filter", path.join(KIT, "prism-sheet.lua")], { env: B.env() }); };
let h = pandoc('::: {.callout logo="top-right"}\nText.\n:::\n');
ok(h.status === 0 && /<div class="callout logo-top-right">\s*<div class="prism-inlogo"><img class="prism-inlogo__light" src="file:\/\/[^"]+" alt="Case Amplify"><img class="prism-inlogo__dark"/.test(h.stdout), `top-right: the logo is the block's first child, with both versions: ${h.stderr}`);
h = pandoc('::: {.band logo="bottom"}\nText.\n:::\n');
ok(/<p>Text\.<\/p>\s*<div class="prism-inlogo">[\s\S]*<\/div>\s*<\/div>/.test(h.stdout) && /class="band logo-bottom"/.test(h.stdout), "bottom: the logo is the block's last child");
h = pandoc('::: {.media .flip logo="top-left"}\n![](x.png)\n\nText.\n:::\n');
ok(/class="media flip logo-top-left">\s*<p><img src="x.png"/.test(h.stdout), "a grid block (media) keeps its photo first; the logo goes last and CSS orders it");
h = pandoc('::: {.features logo="right"}\n- One\n:::\n');
ok(/<div class="prism-beside logo-right">\s*<div class="prism-inlogo">[\s\S]*<div class="features">/.test(h.stdout), "right: the block and its logo side by side in a row of their own");
h = pandoc(':::: {#p .post .square logo="top-right"}\n## Post\n::::\n');
ok(/class="post square logo-top-right"/.test(h.stdout) && !/prism-inlogo/.test(h.stdout), "a post's own logo moves by class; nothing is added");
for (const [md, re, what] of [['::: {.callout logo="middle"}\nT\n:::\n', /not "middle"/, "an unknown position"],
  [':::: {.post logo="left"}\nT\n::::\n', /goes in a corner/, "a post beside itself"], ['::: {.callout logo="none"}\nT\n:::\n', /for posts/, 'logo="none" outside a post']]) {
  h = pandoc(md); ok(h.status !== 0 && re.test(h.stderr), `${what} stops the build: ${h.stderr.trim().slice(0, 120)}`);
}
// A brand without an on-dark logo: only the light one goes in.
const env = B.env(); delete env.PRISM_ASSET_LOGO_ON_DARK;
fs.writeFileSync(path.join(TMP, "nd.md"), '::: {.callout logo="top"}\nT\n:::\n');
h = run("pandoc", [path.join(TMP, "nd.md"), "-t", "html", "--lua-filter", path.join(KIT, "prism-sheet.lua")], { encoding: "utf8", env });
ok(/prism-inlogo__light/.test(h.stdout) && !/prism-inlogo__dark/.test(h.stdout), "no on-dark logo: only the light one");

// 2. CSS: one size and gap, alignment per position, the dark swap, photo rules can't touch it; posts' corners.
const css = fs.readFileSync(path.join(KIT, "prism-sheet.css"), "utf8"), social = fs.readFileSync(path.join(KIT, "prism-social.css"), "utf8");
ok(/\.prism-inlogo \.prism-inlogo__light,\.prism-inlogo \.prism-inlogo__dark\{display:block;height:16pt;width:auto[^}]*aspect-ratio:auto;object-fit:contain/.test(css), "one logo height everywhere, beyond the reach of photo rules");
ok(/\.logo-top-right > \.prism-inlogo,\.logo-bottom-right > \.prism-inlogo\{justify-content:flex-end\}/.test(css) && /\.prism-inlogo\.is-dark \.prism-inlogo__dark\{display:block\}/.test(css), "right alignment and the dark swap");
ok(["top-left", "top-right", "bottom-left", "bottom-right", "none"].every(p => social.includes(`.post.post.post.logo-${p}::before`)) && /--logo-side/.test(social), "posts move their own logo to each corner, inside their margins");

// 3. In the page: the on-dark logo on a dark ground; deck and email; design mode names it.
let pageReady = true; try { require.resolve("playwright", { paths: [KIT, ...(process.env.NODE_PATH || "").split(":").filter(Boolean)] }); } catch { pageReady = false; }
if (pageReady) {
  const md = path.join(TMP, "sheet.md");
  fs.writeFileSync(md, '---\nbrand: case-amplify\ntitle: L\n---\n\n::: {.callout logo="top-left"}\nLight ground.\n:::\n\n::: {.cta-card logo="top-right"}\n## Dark card\n:::\n');
  const r = run("node", [path.join(KIT, "build-sheet.js"), md, path.join(TMP, "sheet.pdf"), "--html"]);
  const html = r.status === 0 ? fs.readFileSync(path.join(TMP, "sheet.sheet.html"), "utf8") : "";
  ok(r.status === 0 && fs.existsSync(path.join(TMP, "sheet.pdf")) && /logo-top-left/.test(html), `a sheet with logos builds: ${r.stderr.slice(0, 300)}`);
  const { chromium } = require(require.resolve("playwright", { paths: [KIT, ...(process.env.NODE_PATH || "").split(":").filter(Boolean)] }));
  (async () => {
    const b = await chromium.launch({ args: ["--allow-file-access-from-files"], ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
    const p = await b.newPage(); await p.goto("file://" + path.join(TMP, "sheet.sheet.html")); await p.emulateMedia({ media: "print" });
    const notes = await p.evaluate(require(path.join(KIT, "inlogo.js")).pick);
    const dark = await p.evaluate(() => [...document.querySelectorAll(".prism-inlogo")].map(l => l.classList.contains("is-dark")));
    await b.close();
    ok(JSON.stringify(dark) === "[false,true]" && !notes.length, `light ground keeps the logo, the dark card takes the on-dark one: ${JSON.stringify(dark)}`);

    const dk = path.join(TMP, "deck.md");
    fs.writeFileSync(dk, '---\nbrand: case-amplify\ntitle: D\nfooter: F\n---\n\n:::: {.slide .title}\n::::\n\n:::: {.slide .content logo="bottom-right"}\n## A\n\n- x\n::::\n\n:::: {.slide .closing logo="top"}\n## End\n\nexample.com\n::::\n');
    const d = run("node", [path.join(KIT, "build-deck.js"), dk, path.join(TMP, "deck.pptx")]);
    const xml = d.status === 0 ? run("unzip", ["-p", path.join(TMP, "deck.pptx"), "ppt/slides/slide2.xml"]).stdout : "";
    ok(d.status === 0 && /descr="Case Amplify"/.test(xml), `a deck slide carries the logo it asks for: ${d.stderr.slice(0, 200)}`);

    const em = path.join(TMP, "em.md");
    fs.writeFileSync(em, '---\nlayout: email\ntemplate: letter\nsubject: S\n---\n\nHello.\n\n::: {.callout logo="top-right"}\n#### Note\n\nText.\n:::\n\n::: footer\nAddress. $[LI:UNSUBSCRIBE]$\n:::\n');
    const e = run("node", [path.join(KIT, "build-email.js"), em, path.join(TMP, "em")]);
    const eh = e.status === 0 ? fs.readFileSync(path.join(TMP, "em", fs.readdirSync(path.join(TMP, "em")).find(f => /\.html$/.test(f))), "utf8") : "";
    ok((eh.match(/alt="Case Amplify"/g) || []).length >= 2 && /align="right"/.test(eh), `email adds a logo row on the right: ${e.stderr.slice(0, 200)}`);
    finish();
  })();
} else { console.log("skip: page, deck and email checks need the kit's tools (run.sh setup all)"); finish(); }

function finish() {
  const w = path.join(TMP, "w.md");
  fs.writeFileSync(w, '---\ntitle: W\n---\n\n::: {.callout logo="top-right"}\nText.\n:::\n');
  const r = run("node", [path.join(KIT, "build-wire.js"), w, "--out", path.join(TMP, "wire")]);
  const board = r.status === 0 ? fs.readFileSync(path.join(TMP, "wire", "w", "w.dc.html"), "utf8") : "";
  ok(/callout · logo top-right/.test(board), "design mode names the logo on the block's label");
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
