// Sheet modifiers: a photo in the title area, filling the page, no closing line, plain flow steps, rounded QR codes, the QR margin
// in a closing card, and how design mode, the number check and the library read them. Usage: node tests/sheet-modifiers.test.js
// (needs pandoc and the kit's Chromium; run.sh sets them up on first use)
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-mods-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const run = (...a) => spawnSync("bash", [path.join(KIT, "run.sh"), ...a], { encoding: "utf8" });
const pages = f => (fs.readFileSync(f, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;

const sheet = (name, fm, body) => { const f = path.join(TMP, name + ".md"); fs.writeFileSync(f, `---\ntitle: A *test* sheet\npagetitle: Test\nhero: x-small\nsubtitle: One sentence about the piece.\n${fm}---\n\n${body}`); return f; };
const BODY = `## What it does

::: {.flow .plain}
- **Draft** The tool drafts.
- **Review** Staff review.
- **Approve** Staff approve.
:::

## Why it matters

A short paragraph.

::::: {.cta-card .x-small}
::: {.qr .small .rounded url="https://example.com"}
## Find out *more*

Visit example.com.
:::
:::::
`;
const build = (md, ...a) => { const pdf = md.replace(/\.md$/, ".pdf"), r = run("sheet", md, pdf, "--html", ...a);
  return { r, pdf, html: fs.existsSync(md.replace(/\.md$/, ".sheet.html")) ? fs.readFileSync(md.replace(/\.md$/, ".sheet.html"), "utf8") : "" }; };

// 1. Core CSS: the modifiers exist and use roles, not colours.
const css = fs.readFileSync(path.join(KIT, "prism-sheet.css"), "utf8");
ok(/\.flow\.plain li\{border-top:0/.test(css), "core has plain flow steps");
ok(/\.qr\.rounded [^{]*\{border-radius:var\(--prism-radius-button\)/.test(css), "rounded QR codes take the brand's button radius");
ok(/\.cta-card > \.qr\{margin:0\}/.test(css), "a QR code in the closing card adds no margin of its own");
ok(/\.prism-mast__grid\{[^}]*grid-template-columns:var\(--mast-split,1fr 1fr\)/.test(css), "the title area splits text and photo, 1fr 1fr by default");

// 2. Every modifier on, in the default brand (which fades photos): one page, photo in the title area, no closing line.
const all = build(sheet("all", "mast-image: prism:placeholder\nmast-image-alt: A \"placeholder\" photo\nmast-split: 3fr 2fr\nmast-focus: 50% 30%\nfill: page\ncolophon: off\n", BODY));
ok(all.r.status === 0 && pages(all.pdf) === 1, `the modifier sheet builds on one page: ${all.r.stderr.slice(-300)}`);
ok(/<header class="prism-mast has-image">/.test(all.html) && /class="prism-mast__grid" style="--mast-split:3fr 2fr"/.test(all.html), "the title area carries the photo and its split");
ok(/<figure class="prism-mast__media"><img class="fade" src="file:\/\/[^"]+\.png" alt="A &quot;placeholder&quot; photo" data-focus="50% 30%">/.test(all.html), "the photo is resolved, fades, keeps its focus and an escaped alt");
ok(/<body class="hero-x-small fill-page">/.test(all.html), "fill: page marks the body");
ok(!/prism-colophon/.test(all.html), "colophon: off drops the closing line");
ok(!/runs past one page|nothing to space/.test(all.r.stderr), `fill: page spaces a one-pager without a warning: ${all.r.stderr.slice(-300)}`);

// 3. None of them: the sheet is built as before.
const none = build(sheet("none", "brand: prism\nauthor: Someone\n", BODY));
ok(none.r.status === 0 && !/has-image|prism-mast__grid|fill-page/.test(none.html) && /<footer class="prism-colophon">/.test(none.html) && /prism-meta/.test(none.html), "a sheet without modifiers, in a brand without sheet options, has no title photo or fill and keeps its byline and closing line");

// 3b. The brand's own sheet options (options.sheet): no byline, no closing line, the orphan and variety checks.
const ca = build(sheet("ca", "author: Someone\ndate: May 2026\n", BODY));
ok(ca.r.status === 0 && !/prism-meta/.test(ca.html) && !/prism-colophon/.test(ca.html), `the default brand's sheets drop the byline and the closing line: ${ca.r.stderr.slice(-200)}`);
const on = build(sheet("on", "colophon: on\n", BODY));
ok(/<footer class="prism-colophon">/.test(on.html), "colophon: on keeps the closing line in a brand that drops it");
const CARDS = n => `## Section ${n}\n\n::: features\n- []{.icon .ph-check} **One** A card.\n- []{.icon .ph-check} **Two** A card.\n:::\n\n`;
const same = build(sheet("same", "", [1, 2, 3].map(CARDS).join("")));
ok(/\[sheet\] variety: 3 sections use cards/.test(same.r.stderr) && /both lead with cards back to back/.test(same.r.stderr), `three card sections in a row are reported: ${same.r.stderr.slice(-300)}`);
ok(!/variety/.test(ca.r.stderr), "a varied sheet passes the variety check");
const orph = build(sheet("orph", "title: Word word word word word word word word word word word word word word word word word word word lonely\n", "## Text\n\nShort.\n"));
ok(/title orphan fixed/.test(orph.r.stderr) || !/title orphan/.test(orph.r.stderr), `a title that would end on one word is fixed in place: ${orph.r.stderr.slice(-300)}`);
ok(/\.features\.four ul\{grid-template-columns:repeat\(4,1fr\)/.test(css) && /\.steps ol\{[^}]*break-inside:avoid/.test(css), "core has 1x4 cards and stacked steps kept on one page");

// 4. Options and limits: no fade, a bad split, fill on a sheet that runs over, an unknown fill.
const nofade = build(sheet("nofade", "mast-image: prism:placeholder\nmast-fade: false\nmast-split: \"1fr; color red\"\nfill: everything\n", BODY));
ok(nofade.r.status === 0 && /<img class="" src=/.test(nofade.html), "mast-fade: false leaves the photo unfaded");
ok(/mast-split "1fr; color red" is not a column split/.test(nofade.r.stderr) && !/--mast-split/.test(nofade.html), "a split that isn't one is ignored with a warning");
ok(/fill: everything is not an option/.test(nofade.r.stderr), "an unknown fill value is reported");
const long = build(sheet("long", "fill: page\n", (BODY.split("::::: ")[0] + "\nA longer paragraph that keeps going for a while to fill space on the page.\n\n").repeat(9)));
ok(long.r.status === 0 && pages(long.pdf) > 1 && /fill: page left as it is: the sheet runs past one page/.test(long.r.stderr), "fill: page never stretches a sheet that runs over");
const prism = build(sheet("prism", "brand: prism\nmast-image: prism:placeholder\n", BODY));
ok(prism.r.status === 0 && /has-image/.test(prism.html), `the modifiers work in a brand that doesn't fade photos: ${prism.r.stderr.slice(-200)}`);

// 5. Brochures and cards ignore them.
const bro = path.join(TMP, "bro.md"); fs.writeFileSync(bro, fs.readFileSync(path.join(ROOT, "fixtures", "brochure.md"), "utf8").replace(/^---\n/, "---\nmast-image: prism:placeholder\ncolophon: off\n"));
const b = run("sheet", bro, bro.replace(/\.md$/, ".pdf"), "--html");
ok(b.status === 0 && !/prism-mast__media/.test(fs.readFileSync(bro.replace(/\.md$/, ".sheet.html"), "utf8")), "a brochure ignores the sheet modifiers");

// 6. Design mode, the number check and the library.
const w = spawnSync("node", [path.join(KIT, "build-wire.js"), path.join(TMP, "all.md"), path.join(TMP, "wire")], { encoding: "utf8" });
const board = w.status === 0 ? fs.readFileSync(path.join(TMP, "wire", "all.dc.html"), "utf8") : "";
ok(/grid-template-columns: 3fr 2fr/.test(board) && /Image: A &quot;placeholder&quot; photo/.test(board), `design mode draws the title-area photo beside the title: ${w.stderr.slice(0, 200)}`);
ok(/flow ×3, no rules/.test(board) && /qr code, right, rounded/.test(board) && /wxsmall/.test(board), "design mode names plain flows, rounded codes and the closing card's size");
const { numbers } = require(path.join(KIT, "check-numbers.js"));
ok(!numbers("---\nmast-focus: 50% 30%\nmast-split: 3fr 2fr\n---\nText.").size, "layout numbers in the modifiers are not claims");
const lib = fs.readFileSync(path.join(KIT, "library.js"), "utf8");
ok(/\^mast-image:/.test(lib), "the library fetch finds a mast-image library photo");

if (!process.env.KEEP) fs.rmSync(TMP, { recursive: true, force: true }); else console.log(TMP);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
