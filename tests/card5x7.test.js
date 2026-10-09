// 5x7 cards: page size (portrait, landscape, bleed), two sides at most, the one-sided fallback, side overflow warnings,
// the format in packages and design mode.
// Usage: node tests/card5x7.test.js (needs the kit's sheet setup: pandoc, Chromium, pikepdf)
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-5x7-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const run = (cmd, a, opt = {}) => spawnSync(cmd, a, { encoding: "utf8", ...opt });
const sheet = (name, md) => { const f = path.join(TMP, name + ".md"); if (md) fs.writeFileSync(f, md); return run("bash", [path.join(KIT, "run.sh"), "sheet", f, path.join(TMP, name + ".pdf")]); };
const pages = name => { const r = run("python3", ["-c", "import json,sys,pikepdf;p=pikepdf.open(sys.argv[1]);print(json.dumps([[round(float(x)/72,3) for x in pg.mediabox[2:]] for pg in p.pages]))", path.join(TMP, name + ".pdf")]);
  return r.status === 0 ? JSON.parse(r.stdout) : []; };

// 1. The fixtures: portrait front and back at 5 x 7 in; landscape with bleed at 7.25 x 5.25 in. Both verify.
for (const f of ["5x7", "5x7-landscape"]) fs.copyFileSync(path.join(ROOT, "fixtures", f + ".md"), path.join(TMP, f + ".md"));
let r = sheet("5x7");
ok(r.status === 0 && JSON.stringify(pages("5x7")) === "[[5,7],[5,7]]", `portrait card: two 5 x 7 in pages: ${JSON.stringify(pages("5x7"))} ${r.stderr}`);
ok(!/runs .* past/.test(r.stderr), `the fixture fits: ${r.stderr}`);
r = sheet("5x7-landscape");
ok(r.status === 0 && JSON.stringify(pages("5x7-landscape")) === "[[7.25,5.25],[7.25,5.25]]", `landscape with bleed: ${JSON.stringify(pages("5x7-landscape"))} ${r.stderr}`);
r = run("python3", [path.join(KIT, "verify.py"), path.join(TMP, "5x7.pdf"), path.join(TMP, "5x7-landscape.pdf")]);
ok(r.status === 0, `verify accepts both: ${r.stdout}`);

// 2. Two sides at most: a third stops the build with one plain line and no PDF.
r = sheet("three", "---\nlayout: 5x7\n---\n\n:::: side\nA\n::::\n\n:::: side\nB\n::::\n\n:::: side\nC\n::::\n");
ok(r.status === 1 && /\[sheet\] 5x7: a card has two sides at most .* has 3/.test(r.stderr) && !/stack traceback/.test(r.stderr) && !fs.existsSync(path.join(TMP, "three.pdf")), `three sides refused: ${r.stderr.slice(0, 300)}`);

// 3. No side blocks: the whole file is a one-sided card.
r = sheet("plain", "---\nlayout: 5x7\n---\n\n# Just a *front*\n\nA line of text.\n");
ok(r.status === 0 && JSON.stringify(pages("plain")) === "[[5,7]]", `no sides makes one front: ${JSON.stringify(pages("plain"))}`);

// 4. A side that runs long is named; pinned blocks (the statement's logo, a mailer's postage box) are not.
r = sheet("long", "---\nlayout: 5x7\n---\n\n:::: {.side .back}\n" + "## Too much\n\n" + "A sentence that keeps going. ".repeat(160) + "\n::::\n");
ok(/\[sheet\] 5x7 back: content runs [\d.]+ in past the bottom edge/.test(r.stderr), `overflow is reported by side: ${r.stderr}`);
r = sheet("pinned", "---\nlayout: 5x7\n---\n\n:::: {.side .front .statement}\n# Save the *date*\n\n::: push\n![](prism:logo){.logo}\n:::\n::::\n\n:::: {.side .back .mailer}\n## See you\n\nShort.\n\n::: indicia\nPostage paid\n:::\n::::\n");
ok(r.status === 0 && !/runs .* past/.test(r.stderr), `pinned blocks don't count as overflow: ${r.stderr}`);

// 5. Packages: 5x7 is a format with at most two pages, and its format file needs layout: 5x7.
const proj = path.join(TMP, "open-house"); fs.mkdirSync(path.join(proj, "formats"), { recursive: true });
fs.writeFileSync(path.join(proj, "content.md"), "---\ntitle: Open house\nstatus: approved\nversion: 1\n---\n\nText.\n");
const pk = (...a) => run("node", [path.join(KIT, "packages.js"), ...a]);
ok(pk("use", proj, "--new", "Mailer", "--add", "card:5x7", "--set", "card.pages=3").status === 2, "a 5x7 output can't ask for three pages");
r = pk("use", proj, "--new", "Mailer", "--add", "card:5x7", "--set", "card.pages=2");
ok(r.status === 0, `a two-page 5x7 output is fine: ${r.stderr}`);
fs.writeFileSync(path.join(proj, "formats", "card.md"), "---\ntitle: T\n---\n\nText.\n");
r = pk("check", proj); ok(r.status !== 0 && /card: a 5x7 format file needs layout: 5x7/.test(r.stdout), `layout is checked: ${r.stdout}`);
fs.writeFileSync(path.join(proj, "formats", "card.md"), "---\nlayout: 5x7\n---\n\nText.\n");
r = pk("check", proj); ok(r.status === 0 && /^OK/m.test(r.stdout), `a 5x7 format file checks OK: ${r.stdout}`);

// 6. Design mode: each side is a frame at the card's proportions, labelled with its layout.
r = run("node", [path.join(KIT, "build-wire.js"), path.join(TMP, "5x7-landscape.md"), path.join(TMP, "wire")]);
const board = r.status === 0 ? fs.readFileSync(path.join(TMP, "wire", "5x7-landscape.dc.html"), "utf8") : "";
ok(/side · front statement dark/.test(board) && /side · back mailer/.test(board) && /width: 672px; min-height: 480px/.test(board), `landscape sides drawn as 7 x 5 frames: ${r.stderr}`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
