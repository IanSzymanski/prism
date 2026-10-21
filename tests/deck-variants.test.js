// Deck slide variations and the brand footer: .dark and .purple slides take the on-dark palette on their own ground, and a brand
// with options.deck.footer puts the slide number on the left and its logo bottom-right. Usage: node tests/deck-variants.test.js
// (needs pandoc, the kit's Chromium and the deck tools; run.sh sets them up on first use)
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-deckv-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const run = (...a) => spawnSync("bash", [path.join(KIT, "run.sh"), ...a], { encoding: "utf8" });
const EMU = 914400;

const DECK = brand => `---
title: A *test* deck
subtitle: One sentence.
footer: Test footer
${brand ? `brand: ${brand}\n` : ""}---

:::: {.slide .title}
::::

:::: {.slide .stats .dark}
## At a *glance*

- **41%** less time on notes
- **88%** done within a day
::::

:::: {.slide .quote .purple}
> The note is still *mine*.
>
> [A caseworker (fictional)]{.cite}
::::

:::: {.slide .content}
## A plain *slide*

Some text.
::::

:::: {.slide .closing}
[Eyebrow]{.eyebrow}

## The *end*

example.com
::::
`;

// Each slide's XML, read with Python's zipfile so the test needs no zip package of its own.
const slides = pptx => JSON.parse(spawnSync("python3", ["-c", `import zipfile,json,re,sys
z=zipfile.ZipFile(sys.argv[1]);n=sorted([f for f in z.namelist() if re.match(r"ppt/slides/slide\\d+\\.xml$",f)],key=lambda f:int(re.findall(r"\\d+",f)[0]))
print(json.dumps([z.read(f).decode() for f in n]))`, pptx], { encoding: "utf8" }).stdout || "[]");
const bgImage = x => { const m = /<p:bg>([\s\S]*?)<\/p:bg>/.exec(x); return !!m && /<a:blip /.test(m[1]); };
const colors = x => new Set([...x.matchAll(/<a:srgbClr val="([0-9A-F]{6})"/g)].map(m => m[1]));
const pics = x => [...x.matchAll(/<p:pic>[\s\S]*?<a:off x="(\d+)" y="(\d+)"\/>/g)].map(m => ({ x: +m[1] / EMU, y: +m[2] / EMU }));
const textAt = (x, t) => { const m = [...x.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)].find(s => s[1].includes(`<a:t>${t}</a:t>`)); const o = m && /<a:off x="(\d+)"/.exec(m[1]); return o ? +o[1] / EMU : null; };

for (const brand of [null, "prism"]) {
  const md = path.join(TMP, `deck-${brand || "default"}.md`), pptx = md.replace(/\.md$/, ".pptx");
  fs.writeFileSync(md, DECK(brand));
  const r = run("deck", md, pptx);
  ok(r.status === 0 && fs.existsSync(pptx), `${brand || "default brand"}: the deck builds: ${(r.stderr || "").slice(-300)}`);
  if (!fs.existsSync(pptx)) continue;
  const S = slides(pptx), B = require(path.join(KIT, "brand.js"))(md), hx = (n, t) => B.color(n, t).replace(/^#/, "").toUpperCase();
  const label = brand || "default brand";
  ok(S.length === 5, `${label}: five slides (${S.length})`);
  ok(bgImage(S[1]) && bgImage(S[2]), `${label}: the dark and purple slides sit on a ground image`);
  ok(!bgImage(S[3]), `${label}: a plain slide keeps the plain surface`);
  ok(colors(S[1]).has(hx("prism-color-text-strong", "dark")) || colors(S[1]).has("FFFFFF"), `${label}: the dark slide's text takes the on-dark ink`);
  ok(!colors(S[1]).has(hx("prism-color-text-strong")), `${label}: no light-ground ink on the dark slide`);
  ok(colors(S[2]).has(hx("prism-color-eyebrow-on-dark")) && !colors(S[2]).has(hx("prism-color-accent")), `${label}: emphasis on purple takes the eyebrow-on-dark colour, never the accent`);
  ok(colors(S[3]).has(hx("prism-color-text-strong")) && colors(S[3]).has(hx("prism-color-accent")), `${label}: the palette is restored after a themed slide (light ink and the accent again)`);
  const foot = B.option("deck.footer", null);
  if (foot) {
    ok(Math.abs(textAt(S[3], "04") - 0.75) < 0.05, `${label}: options.deck.footer puts the slide number on the left (${textAt(S[3], "04")})`);
    for (const k of [1, 2, 3, 4]) ok(pics(S[k]).some(p => p.x > 10 && p.y > 6.8), `${label}: slide ${k + 1} carries the logo bottom-right`);
    ok(!pics(S[0]).some(p => p.y > 6.8), `${label}: the title slide has no footer logo`);
  } else {
    ok(textAt(S[3], "04") > 10, `${label}: without options.deck.footer the number stays on the right`);
    ok(!pics(S[3]).some(p => p.y > 6.8), `${label}: without options.deck.footer there is no footer logo`);
    if (!brand) console.log("note: the default brand sets no options.deck.footer; its footer checks ran as the no-option case");
  }
}

// The format card documents the variations and the footer.
const card = fs.readFileSync(path.join(KIT, "..", "references", "formats", "deck.md"), "utf8");
ok(/\.dark/.test(card) && /\.purple/.test(card) && /options\.deck\.footer/.test(card), "deck.md documents .dark, .purple and the brand footer");

if (!process.env.KEEP) fs.rmSync(TMP, { recursive: true, force: true }); else console.log(TMP);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
