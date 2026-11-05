// Small kit fixes: file tags always keep the output name (O6), state finds the project from inside it and reads its version (M14),
// terms stay on one line (O4), sheets carry their PDF details (A1), photos lose their location data (I4) print copies are white (O3)
// and a workspace's kit copy follows the plugin's kit (C2, C3).
// Usage: node tests/kit-small.test.js (pandoc and node are needed; the PDF check also needs the kit's sheet setup and pikepdf)
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-small-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const run = (cmd, a, opt = {}) => spawnSync(cmd, a, { encoding: "utf8", ...opt });

// 1. Tags: a slug ending with the output keeps both, so two outputs of one piece never share a name.
const proj = path.join(TMP, "ca-one-sheet"); fs.mkdirSync(path.join(proj, "formats"), { recursive: true });
fs.writeFileSync(path.join(proj, "content.md"), '---\r\ntitle: T\r\nversion: "4"\r\nchanges:\r\n  - v4 · new headline\r\n---\r\n\r\nText\r\n');
for (const f of ["sheet", "one-sheet"]) fs.writeFileSync(path.join(proj, "formats", f + ".md"), "---\ntitle: T\n---\n");
const { tagFor } = require(path.join(KIT, "naming.js"));
const t1 = tagFor(path.join(proj, "formats", "sheet.md")), t2 = tagFor(path.join(proj, "formats", "one-sheet.md"));
ok(t1 === "ca-one-sheet-sheet-v4", `the output name is kept: ${t1}`);
ok(t1 !== t2, `two outputs get two tags: ${t1}, ${t2}`);

// 2. State: run from inside the project with its slug, no stray <slug>/<slug>/.prism, and the version read through quotes and CRLF.
const out = path.join(proj, "out.pdf"); fs.writeFileSync(out, "x");
let r = run("node", [path.join(KIT, "state.js"), "ca-one-sheet", "export", "sheet", "out.pdf"], { cwd: proj });
ok(r.status === 0 && /at content v4/.test(r.stdout), `export records the content version: ${r.stdout}${r.stderr}`);
ok(!fs.existsSync(path.join(proj, "ca-one-sheet")), "no stray project folder inside the project");
const S = JSON.parse(fs.readFileSync(path.join(proj, ".prism", "state.json"), "utf8"));
ok(S.exports.sheet.files[0] === "out.pdf", `files are relative to the project: ${S.exports.sheet.files}`);
r = run("node", [path.join(KIT, "state.js"), "ca-one-sheet", "show"], { cwd: TMP });
ok(/sheet: exported v4/.test(r.stdout) && /up to date/.test(r.stdout), `the same state from the parent folder: ${r.stdout}`);

// 3. Unbroken terms: a no-wrap span in HTML, non-breaking spaces elsewhere, hyphenated words kept with the term.
const md = path.join(TMP, "u.md");
fs.writeFileSync(md, "We are SOC 2 Type II and HIPAA-compliant (SOC 2-aligned), unlike SOC 23. Two: HIPAA, HIPAA.\n");
const env = { ...process.env, PRISM_UNBROKEN: "SOC 2\nSOC 2 Type II\nHIPAA" };
const html = run("pandoc", [md, "-t", "html", "--wrap=none", "--lua-filter", path.join(KIT, "prism-unbroken.lua")], { env }).stdout;
const spans = [...html.matchAll(/<span style="white-space:nowrap">([^<]*)<\/span>/g)].map(m => m[1]);
ok(spans.join("|") === "SOC 2 Type II|HIPAA-compliant|SOC 2-aligned|HIPAA|HIPAA", `HTML spans: ${spans.join("|")}`);
ok(/unlike SOC 23\./.test(html), "a longer number is not the term");
const plain = run("pandoc", [md, "-t", "plain", "--wrap=none", "--lua-filter", path.join(KIT, "prism-unbroken.lua")], { env }).stdout;
ok(plain.includes("SOC 2 Type II") && plain.includes("SOC 2-aligned") && !plain.includes("‑"), "other formats get non-breaking spaces only");
const B = require(path.join(KIT, "brand.js"))(null, "prism");
ok(B.unbroken.includes(B.name) && B.unbroken.includes("SOC 2 Type II") && B.env().PRISM_UNBROKEN.split("\n").length === B.unbroken.length, "the brand name joins the core terms");

// 4. PDF details: title, author, subject, keywords and language from the front matter.
if (fs.existsSync(path.join(KIT, ".ready-sheet"))) {
  const sheet = path.join(proj, "formats", "sheet.md"), pdf = path.join(TMP, "s.pdf");
  fs.writeFileSync(sheet, "---\ntitle: The *paperwork* problem\nsubtitle: Why it matters.\nkeywords: [burnout, \"social work\"]\nlang: en-GB\nbrand: prism\n---\n\n## One\n\nText.\n");
  r = run("bash", [path.join(KIT, "run.sh"), "sheet", sheet, pdf]);
  const info = run("python3", ["-c", "import json,sys,pikepdf;p=pikepdf.open(sys.argv[1]);print(json.dumps({**{k:str(v) for k,v in p.docinfo.items()},'lang':str(p.Root.get('/Lang'))}))", pdf]);
  const d = info.status === 0 ? JSON.parse(info.stdout) : {};
  ok(d["/Title"] === "The paperwork problem" && d["/Author"] === B.name && d["/Subject"] === "Why it matters." && d["/Keywords"] === "burnout, social work" && d.lang === "en-GB", `PDF details: ${info.stdout}${info.stderr}${r.stderr}`);
  r = run("python3", [path.join(KIT, "verify.py"), "--brand", "prism", pdf]);
  ok(r.status === 0, `verify accepts it: ${r.stdout}`);

  // 5. Photo metadata (I4): a GPS-tagged photo that skipped images.py loses its location in the PDF. Print copy (O3): a white page,
  // in the default brand, whose surface is off-white.
  fs.mkdirSync(path.join(proj, "formats", "images"), { recursive: true });
  run("python3", ["-c", "import sys;from PIL import Image;e=Image.Exif();e[0x8825]={1:'N',2:(47.0,36.0,0.0)};Image.new('RGB',(800,450),(90,120,160)).save(sys.argv[1],exif=e.tobytes())", path.join(proj, "formats", "images", "where.jpg")]);
  fs.writeFileSync(sheet, "---\ntitle: T\n---\n\n## One\n\n![A photo](images/where.jpg)\n\nText.\n");
  // The page's colour at the bottom edge, below the header glow the print copy keeps.
  const edge = f => { const p = run("pdftoppm", ["-r", "20", "-png", "-singlefile", f, f.replace(/\.pdf$/, "")]); return p.status === 0 ? run("python3", ["-c", "import sys;from PIL import Image;i=Image.open(sys.argv[1]).convert('RGB');print(i.getpixel((i.width // 2, i.height - 2)))", f.replace(/\.pdf$/, ".png")]).stdout.trim() : null; };
  const screen = path.join(TMP, "screen.pdf"), printed = path.join(TMP, "print.pdf");
  r = run("bash", [path.join(KIT, "run.sh"), "sheet", sheet, screen]);
  const r2 = run("bash", [path.join(KIT, "run.sh"), "sheet", sheet, printed, "--print"]);
  ok(/print copy on white/.test(r2.stdout), `the print build says so: ${r2.stdout}${r2.stderr}`);
  r = run("python3", [path.join(KIT, "verify.py"), screen, printed]);
  ok(r.status === 0 && !fs.readFileSync(screen).includes("Exif"), `the photo's location data is gone: ${r.stdout}`);
  const c1 = edge(screen), c2 = edge(printed);
  if (c1 === null) console.log("skipped the print-copy colour check: pdftoppm missing");
  else { ok(c2 === "(255, 255, 255)", `the print copy's page is white: ${c2}`); ok(c1 !== c2, `the screen copy keeps the brand surface: ${c1}`); }
} else console.log("skipped the PDF check: run `run.sh setup sheet` first");

// 5. Kit sync (C2, C3): a workspace's copy follows the plugin's kit. An old copy, with an absolute NODE_PATH in env.sh,
// empty ready markers and the nested kit/ an old instruction made, is replaced whole; installed tools stay; a second sync is silent.
{
  const ws = path.join(TMP, "ws"), dst = path.join(ws, ".prism-kit"), sync = path.join(KIT, "sync.sh");
  fs.mkdirSync(path.join(dst, "kit"), { recursive: true }); fs.mkdirSync(path.join(dst, "mods", "playwright"), { recursive: true });
  fs.writeFileSync(path.join(dst, "VERSION"), "1.0.0\n"); fs.writeFileSync(path.join(dst, "run.sh"), "old");
  fs.writeFileSync(path.join(dst, "dropped.js"), "old"); fs.writeFileSync(path.join(dst, ".ready-sheet"), "");
  fs.writeFileSync(path.join(dst, "env.sh"), 'export NODE_PATH="/gone/.prism-kit/mods/playwright/node_modules"\n');
  r = run("bash", [sync, dst]);
  const want = fs.readFileSync(path.join(KIT, "VERSION"), "utf8").trim();
  ok(r.status === 0 && new RegExp(`kit: updated .* from 1\\.0\\.0 to ${want.replace(/\./g, "\\.")}`).test(r.stdout), `an old copy is updated, in one line: ${r.stdout}${r.stderr}`);
  ok(fs.readFileSync(path.join(dst, "run.sh"), "utf8") === fs.readFileSync(path.join(KIT, "run.sh"), "utf8"), "the new kit's files replace the old ones");
  ok(!fs.existsSync(path.join(dst, "dropped.js")) && !fs.existsSync(path.join(dst, "kit")), "files the new kit doesn't have, and a nested kit/, are gone");
  ok(!fs.existsSync(path.join(dst, ".ready-sheet")) && !fs.existsSync(path.join(dst, "env.sh")), "ready markers and env.sh go, so setup runs again");
  ok(fs.existsSync(path.join(dst, "mods", "playwright")), "installed tools stay");
  r = run("bash", [sync, dst]);
  ok(r.status === 0 && r.stdout === "", `a current copy syncs silently: ${r.stdout}`);
  fs.appendFileSync(path.join(dst, "brands.js"), "\n// changed\n");
  r = run("bash", [sync, dst]);
  ok(/kit: refreshed/.test(r.stdout) && !fs.readFileSync(path.join(dst, "brands.js"), "utf8").includes("// changed"), `a copy that differs is refreshed: ${r.stdout}`);
  // Ready markers name the kit's place and version: an empty (old) marker, or one from another folder, never counts.
  r = run("bash", ["-c", `KIT="${dst}"; . "${dst}/kitenv.sh"; echo "$NODE_PATH"; prism_ready sheet && echo READY; echo old > "${dst}/.ready-sheet"; prism_ready sheet && echo READY; prism_mark sheet; prism_ready sheet && echo MARKED`]);
  ok(r.stdout.startsWith(path.join(dst, "mods")) && !/READY/.test(r.stdout) && /MARKED/.test(r.stdout), `NODE_PATH comes from the kit's place and markers are stamped: ${r.stdout}${r.stderr}`);
}

// 6. The number check (C4): sign, percent, currency and scale count; point numbers, counters and the file's version don't;
// shown attributes do; allow-numbers lets a listed number through.
{
  const { strays } = require(path.join(KIT, "check-numbers.js"));
  const content = "---\ntitle: T\nversion: 7\n---\n\nTime on notes fell 40% in 2024. Staff saved 1,200 hours. Budget: $1.2 million. Reach: 40 countries.\n\n| Month | Hours |\n|---|---|\n| Jan | 14 |\n";
  const cases = [
    ["a fall written with a minus", "[−40%]{.stat}", []], ["40% from 40 countries", "## 40% more", []], ["$40M from a plain 40", "::: stat\n$40M\n:::", ["$40M"]],
    ["a bare chart value (unit: %)", "```chart\nunit: %\nJan: 40\n```", []], ["1,200 and 1200", "Saved 1,200 hours, or 1200.", []],
    ["$1.2M from $1.2 million", "[$1.2M]{.stat}", []], ["1,2 is two numbers, not 12", "Rows 1,2", ["1", "2"]], ["a new number", "We served 987654 people.", ["987654"]],
    ["a shown note", ':::: {.post note="87% faster"}\nText\n::::', ["87%"]], ["a counter note", ':::: {.post note="02 / 07"}\nText\n::::', []],
    ["a point number", "## [07]{.num} Seventh", []], ["content.md's version is not a claim", "7 new staff", ["7"]],
    ["a percent content.md doesn't have", "14% of time", ["14%"]], ["both ends of a range", "From 2019-2024", ["2019"]],
    ["allow-numbers", '---\nallow-numbers: ["2026", "$40M"]\n---\n\n© 2026, $40M', []], ["full-width digits", "９８７", ["987"]],
  ];
  for (const [name, fmt, want] of cases) { const got = strays(content, fmt).map(t => t.raw); ok(JSON.stringify(got) === JSON.stringify(want), `number check, ${name}: ${got.join(", ") || "none"}`); }
}

// 7. Builds refuse strays in a piece (C4); outputs record their brand and content version, which verify reads (C5, C7).
if (fs.existsSync(path.join(KIT, ".ready-sheet"))) {
  const piece = path.join(TMP, "harbor"), fmts = path.join(piece, "formats"), out = path.join(piece, "out");
  fs.mkdirSync(fmts, { recursive: true }); fs.mkdirSync(out);
  fs.writeFileSync(path.join(piece, "content.md"), "---\ntitle: Harbor\nbrand: prism\nversion: 3\n---\n\nTime on notes fell 41%.\n");
  const sheet = path.join(fmts, "sheet.md"), pdf = path.join(out, "s.pdf");
  fs.writeFileSync(sheet, "---\ntitle: Harbor\n---\n\n## One\n\n[41%]{.stat} and 987654 people.\n");
  r = run("bash", [path.join(KIT, "run.sh"), "sheet", sheet, pdf]);
  ok(r.status === 1 && /987654/.test(r.stderr) && /allow-numbers/.test(r.stderr) && !fs.existsSync(pdf), `a stray stops the build: ${r.stderr}`);
  fs.writeFileSync(sheet, "---\ntitle: Harbor\n---\n\n## One\n\n[41%]{.stat} less time on notes.\n");
  r = run("bash", [path.join(KIT, "run.sh"), "sheet", sheet, pdf]);
  ok(r.status === 0, `content.md's brand builds the sheet: ${r.stderr}`);
  r = run("python3", [path.join(KIT, "verify.py"), pdf]);
  ok(r.status === 0, `verify reads the brand from the file, no --brand needed: ${r.stdout}`);
  r = run("python3", [path.join(KIT, "verify.py"), "--brand", "case-amplify", pdf]);
  ok(r.status === 1 && /built in the prism brand, not case-amplify/.test(r.stdout), `another brand is named: ${r.stdout}`);
  fs.writeFileSync(path.join(piece, "content.md"), "---\ntitle: Harbor\nbrand: prism\nversion: 4\n---\n\nTime on notes fell 41%.\n");
  r = run("python3", [path.join(KIT, "verify.py"), pdf]);
  ok(r.status === 1 && /built from content v3, but content.md is v4/.test(r.stdout), `an older content version fails: ${r.stdout}`);
  r = run("python3", [path.join(KIT, "verify.py")]);
  ok(r.status === 2, "verify with nothing to check is a usage error");
} else console.log("skipped the build gate and verify stamps: run `run.sh setup sheet` first");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
