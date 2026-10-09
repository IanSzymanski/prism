// Small kit fixes: file tags always keep the output name (O6), state finds the project from inside it and reads its version (M14),
// terms stay on one line (O4) and sheets carry their PDF details (A1).
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
} else console.log("skipped the PDF check: run `run.sh setup sheet` first");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
