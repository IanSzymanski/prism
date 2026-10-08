// QR block: the generated code, its three layouts, an uploaded code overriding it, and how decks, email and design mode draw it.
// Usage: node tests/qr.test.js (pandoc and node are needed; the deck check also needs pptxgenjs and sharp, as the kit's deck setup installs)
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-qr-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const run = (cmd, a, opt = {}) => spawnSync(cmd, a, { encoding: "utf8", ...opt });
const qr = require(path.join(KIT, "qr.js"));

// 1. The encoder: the smallest code that fits, the three finder squares, the blank margin, one merged path.
const c = qr.encode("https://example.com/demo");
ok(c.n === 25, `a short address fits a version 2 code (25 modules), got ${c.n}`);
const finder = (r0, c0) => [0, 6].every(i => [0, 1, 2, 3, 4, 5, 6].every(j => c.dark(r0 + i, c0 + j) && c.dark(r0 + j, c0 + i))) && !c.dark(r0 + 1, c0 + 1) && c.dark(r0 + 3, c0 + 3);
ok(finder(0, 0) && finder(0, c.n - 7) && finder(c.n - 7, 0), "finder squares in three corners");
const svg = qr.svg("https://example.com/demo");
ok(/viewBox="0 0 33 33"/.test(svg) && /data-modules="33"/.test(svg), "four modules of blank margin on every side");
ok((svg.match(/<path/g) || []).length === 1 && /class="prism-qr__ground" width="33" height="33" fill="#fff"/.test(svg) && /class="prism-qr__modules" fill="#000"/.test(svg), "one path, black on white, with classes the sheet recolours for bg");
ok(!/<rect/.test(qr.svg("https://example.com/demo", { ground: null })), "a transparent code has no ground");
ok(/aria-label="QR code: https:\/\/example.com\/demo"/.test(qr.svg("https://example.com/demo")), "the code is labelled for screen readers");
ok(qr.encode("https://example.com/events/2026/fall-summit?utm_source=print&utm_medium=sheet").n > c.n, "a longer address makes a denser code");
ok(/&amp;/.test(qr.svg("https://example.com/?a=1&b=2")) && !/&b=/.test(qr.svg("https://example.com/?a=1&b=2")), "addresses are escaped in the markup");

// 2. The sheet filter: code and text column, the layout classes kept, the label, errors for a missing address or upload.
const pandoc = (md, file = "in.md") => { const f = path.join(TMP, file); fs.writeFileSync(f, md);
  return run("pandoc", [f, "-t", "html", "--lua-filter", path.join(KIT, "prism-sheet.lua")]); };
let h = pandoc('::: {.qr url="https://example.com/a" label="example.com/a"}\n### Save your seat\n\nScan to register.\n:::\n');
ok(h.status === 0 && /<div class="qr" data-url="https:\/\/example.com\/a">/.test(h.stdout), `a qr block keeps its class and address: ${h.stderr}`);
ok(/<figure class="qr__code"><svg class="prism-qr"/.test(h.stdout) && /<figcaption class="qr__label">example.com\/a<\/figcaption>/.test(h.stdout), "the code is inline SVG with its label under it");
ok(/<(div|section)[^>]*class="qr__text">\s*<h3/.test(h.stdout), "the text goes in its own column");
h = pandoc('::: {.qr .left .small url="https://example.com/b"}\nText.\n:::\n\n::: {.qr .center .large url="https://example.com/c"}\n:::\n');
ok(/class="qr left small"/.test(h.stdout) && /class="qr center large"/.test(h.stdout) && !/qr__label/.test(h.stdout), "left, centre and sizes keep their classes; no label unless asked");
ok(/data-url="https:\/\/example.com\/c">\s*<figure class="qr__code">[\s\S]*?<\/figure>\s*<\/div>/.test(h.stdout), "a code with no text has no text column");
h = pandoc('::: {.qr bg="black" url="https://example.com/k"}\n:::\n\n::: {.qr bg="white" url="https://example.com/w"}\n:::\n\n::: {.qr bg="transparent" url="https://example.com/t"}\n:::\n');
ok(/class="qr bg-black"/.test(h.stdout) && /class="qr bg-white"/.test(h.stdout) && /class="qr bg-transparent"/.test(h.stdout) && !/ bg="/.test(h.stdout), "bg becomes a class");
h = pandoc('::: {.qr bg="red" url="https://example.com/r"}\n:::\n');
ok(h.status !== 0 && /white, black or transparent/.test(h.stderr), "an unknown bg stops the build");
h = pandoc("::: qr\nText.\n:::\n");
ok(h.status !== 0 && /needs the address it opens/.test(h.stderr), "a block with neither address nor upload stops the build");
h = pandoc('::: {.qr url="example.com/d"}\n:::\n');
ok(h.status === 0 && /has no scheme/.test(h.stderr), "an address without https:// is flagged");
// An uploaded code replaces the generated one, shown as it is.
fs.mkdirSync(path.join(TMP, "images"), { recursive: true }); fs.copyFileSync(path.join(KIT, "images", fs.readdirSync(path.join(KIT, "images")).find(f => /\.png$/.test(f))), path.join(TMP, "images", "qr-up.png"));
h = pandoc('::: {.qr url="https://example.com/e" image="images/qr-up.png"}\nText.\n:::\n');
ok(h.status === 0 && /<img class="prism-qr prism-qr--uploaded" src="file:\/\/[^"]*images\/qr-up.png" alt="QR code: https:\/\/example.com\/e">/.test(h.stdout) && !/<svg/.test(h.stdout), `an uploaded code overrides the generated one: ${h.stderr}`);
h = pandoc('::: {.qr image="images/qr-up.png"}\n:::\n');
ok(h.status === 0 && /prism-qr--uploaded/.test(h.stdout), "an uploaded code needs no address");
h = pandoc('::: {.qr image="images/missing.png"}\n:::\n');
ok(h.status !== 0 && /not found/.test(h.stderr), "a missing upload stops the build");

// 3. Core CSS: three layouts and sizes, an unbranded code with its own ground.
const css = fs.readFileSync(path.join(KIT, "prism-sheet.css"), "utf8"), qcss = css.split("/* QR code")[1].split("\n\n")[0];
ok(/\.qr\.left\{/.test(qcss) && /\.qr\.center\{/.test(qcss) && /\.qr\.small\{/.test(qcss) && /\.qr\.large\{/.test(qcss), "core has left, centre, small and large");
ok(/prism-qr__ground\{fill:white\}/.test(qcss) && /prism-qr__modules\{fill:black\}/.test(qcss) && !/--prism-color|--brand-|--prism-radius/.test(qcss.split(".qr__label")[0]), "the code is unbranded: black on white, no brand colours or corners");
ok(/\.qr\.bg-black \.prism-qr__ground\{fill:black\}/.test(qcss) && /\.qr\.bg-transparent \.prism-qr__ground\{fill:none\}/.test(qcss), "black and transparent grounds (white is the default)");
ok(typeof qr.check === "function" && /qr\.js"\)\.check/.test(fs.readFileSync(path.join(KIT, "build-sheet.js"), "utf8")) && /qr\.js"\)\.check/.test(fs.readFileSync(path.join(KIT, "build-social.js"), "utf8")), "sheets and social posts check each code's size and contrast");

// 4. Email links the address (a code can't be scanned from the screen it is read on); design mode draws the layout.
const em = path.join(TMP, "em.md");
fs.writeFileSync(em, '---\nlayout: email\ntemplate: letter\nsubject: QR test\n---\n\nHello.\n\n::: {.qr .left url="https://example.com/summit" label="Register for the summit"}\n### Join us\n\nRegister in a minute.\n:::\n');
const e = run("node", [path.join(KIT, "build-email.js"), em, path.join(TMP, "em-out")]);
const eh = e.status === 0 ? fs.readFileSync(path.join(TMP, "em-out", fs.readdirSync(path.join(TMP, "em-out")).find(f => /\.html$/.test(f))), "utf8") : "";
const et = e.status === 0 ? fs.readFileSync(path.join(TMP, "em-out", fs.readdirSync(path.join(TMP, "em-out")).find(f => /\.txt$/.test(f))), "utf8") : "";
ok(/Join us/.test(eh) && /href="https:\/\/example.com\/summit"[^>]*>Register for the summit &rarr;/.test(eh) && !/unknown block/.test(e.stderr), `email draws the text and links the address: ${e.stderr.slice(0, 300)}`);
ok(/Join us[\s\S]*Register in a minute\.[\s\S]*Register for the summit: https:\/\/example.com\/summit/.test(et), "the plain-text part keeps the order: text, then the link");
const wmd = path.join(TMP, "wire.md");
fs.writeFileSync(wmd, '---\ntitle: W\n---\n\n::: {.qr url="https://example.com/r"}\nRight.\n:::\n\n::: {.qr .left image="images/qr-up.png"}\nLeft.\n:::\n\n::: {.qr .center url="https://example.com/c"}\nCentre.\n:::\n');
const w = run("node", [path.join(KIT, "build-wire.js"), wmd, "--out", path.join(TMP, "wire")]);
const board = w.status === 0 ? fs.readFileSync(path.join(TMP, "wire", "wire", "wire.dc.html"), "utf8") : "";
ok(/qr code, right/.test(board) && /qr code, left/.test(board) && /qr code, centred/.test(board) && /QR: uploaded images\/qr-up.png/.test(board), `design mode draws each layout and names an upload: ${w.stderr.slice(0, 200)}`);

// 5. Decks: a qr slide, generated or uploaded.
let deckReady = true; try { require.resolve("pptxgenjs", { paths: [KIT, ...(process.env.NODE_PATH || "").split(":").filter(Boolean)] }); } catch { deckReady = false; }
if (deckReady) {
  const dk = path.join(TMP, "deck.md");
  fs.writeFileSync(dk, '---\ntitle: Q\nfooter: Test\n---\n\n:::: {.slide .title}\n::::\n\n:::: {.slide .qr url="https://example.com/s" label="example.com/s"}\n## Save your *seat*\n\nScan to register.\n::::\n\n:::: {.slide .qr .left bg="black" url="https://example.com/k"}\n## Black\n::::\n\n:::: {.slide .qr .center image="images/qr-up.png"}\n## Uploaded\n\nText.\n::::\n');
  const d = run("node", [path.join(KIT, "build-deck.js"), dk, path.join(TMP, "deck.pptx")]);
  const x = d.status === 0 ? run("unzip", ["-l", path.join(TMP, "deck.pptx")]).stdout : "";
  ok(d.status === 0 && (x.match(/ppt\/media\/image/g) || []).length >= 3, `a deck builds qr slides with a generated and an uploaded code: ${d.stderr.slice(0, 300)}`);
} else console.log("skip: deck tools not installed (run.sh setup deck)");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
