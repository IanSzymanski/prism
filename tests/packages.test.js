// Packages (F4): core definitions, a brand's own, a piece's package with changes, the format-file and page checks,
// the claims check across outputs, and the one zip. Usage: node tests/packages.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-pkg-")), DRAFTS = path.join(TMP, "drafts");
process.env.PRISM_DRAFTS = DRAFTS;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const pk = (...a) => spawnSync("node", [path.join(KIT, "packages.js"), ...a], { env: process.env, encoding: "utf8" });

// 1. Core packages are valid and brand-free.
const core = JSON.parse(fs.readFileSync(path.join(KIT, "packages.json"), "utf8")).packages;
ok(core["case-study"] && core["demo-follow-up"], "core ships the case study and demo follow-up packages");
const cs = core["case-study"].outputs, by = Object.fromEntries(cs.map(o => [o.id, o]));
ok(by.social.posts === 2 && by.story.stories === 1 && by.sheet.pages === 1 && by["case-study"].min_pages === 2 && by.blog && by.deck && by["html-email"], "case study: 2 posts, 1 story, blog, deck, one-pager, multipage PDF, email");
let r = pk("list", "--json"); ok(r.status === 0 && JSON.parse(r.stdout)["case-study"].from === "core", `list: ${r.stderr}`);
r = pk("show", "case-study"); ok(r.status === 0 && /story \(social, 1 story\)/.test(r.stdout), "show names each output with its counts");
ok(pk("show", "nope").status === 2, "an unknown package stops");

// 2. A brand adds, replaces and removes packages in its profile; a bad definition stops with the reason.
fs.mkdirSync(DRAFTS, { recursive: true }); fs.cpSync(path.join(KIT, "brands", "prism"), path.join(DRAFTS, "acme"), { recursive: true });
const pf = path.join(DRAFTS, "acme", "profile.json"), prof = JSON.parse(fs.readFileSync(pf, "utf8"));
const setPkgs = p => { prof.packages = p; delete prof.default; fs.writeFileSync(pf, JSON.stringify(prof)); };
setPkgs({ "launch": { name: "Launch package", outputs: [{ id: "social", format: "social", posts: 3 }, { id: "html-email", format: "html-email" }] }, "demo-follow-up": null });
r = pk("list", "--brand", "acme", "--json"); const acme = r.status === 0 ? JSON.parse(r.stdout) : {};
ok(acme.launch && acme.launch.from === "acme" && !acme["demo-follow-up"] && acme["case-study"], `brand packages add and remove: ${r.stderr}`);
setPkgs({ "bad": { name: "Bad", outputs: [{ id: "x", format: "poster" }, { id: "y", format: "deck", pages: 2 }, { id: "z", format: "social" }] } });
r = pk("list", "--brand", "acme");
ok(r.status === 2 && /poster/.test(r.stderr) && /pages doesn't apply to deck/.test(r.stderr) && /needs posts or stories/.test(r.stderr), `bad definitions are refused: ${r.stderr}`);
setPkgs({});

// 3. A piece takes a package, with changes the person asked for.
const proj = path.join(TMP, "harbor-point"); fs.mkdirSync(path.join(proj, "formats"), { recursive: true }); fs.mkdirSync(path.join(proj, "out"));
fs.writeFileSync(path.join(proj, "content.md"), "---\ntitle: Harbor Point\nstatus: approved\nversion: 3\n---\n\n## Results\n\n- **41%** less time on notes\n- **94%** of drafts approved\n");
fs.writeFileSync(path.join(proj, "claims.md"), "| # | Claim | Source | Status |\n|---|---|---|---|\n| 1 | 41% less time on notes | interview | VERIFIED |\n| 2 | 94% of drafts approved | interview | VERIFIED |\n| 3 | Supervisors kept sign-off | notes | FROM SOURCE |\n");
r = pk("use", proj, "case-study", "--drop", "deck", "--set", "social.posts=3", "--add", "carousel");
const rec = JSON.parse(fs.readFileSync(path.join(proj, "package.json"), "utf8"));
ok(r.status === 0 && !rec.outputs.some(o => o.id === "deck") && rec.outputs.find(o => o.id === "social").posts === 3 && rec.outputs.some(o => o.id === "carousel" && o.format === "carousel"), `use applies drop, set and add: ${r.stderr}`);
ok(/exports: \[social, story, blog, sheet, case-study, html-email, carousel\]/.test(r.stdout) && /package: case-study/.test(r.stdout), "use prints the front matter lines");
ok(pk("use", proj, "case-study", "--set", "deck.pages=2").status === 2, "a count that doesn't fit the format is refused");
r = pk("use", proj, "case-study", "--set", "case-study.pages=4"); ok(r.status === 0 && JSON.parse(fs.readFileSync(path.join(proj, "package.json"), "utf8")).outputs.find(o => o.id === "case-study").pages === 4 && !/min_pages/.test(fs.readFileSync(path.join(proj, "package.json"), "utf8").split('"case-study"')[2] || ""), "pages replaces min_pages");
pk("use", proj, "case-study");

// 4. The check: every format file there, posts and stories counted (carousel panels aside), layouts right.
const W = (n, s) => fs.writeFileSync(path.join(proj, "formats", n + ".md"), s);
const post = (id, cls = "") => `:::: {#${id} .post .square${cls}}\n## 41% less\n\n::: caption\nCopy.\n:::\n::::\n\n`;
W("social", "---\ntitle: S\n---\n\n" + post("a") + post("b") + "::::::: {#c .carousel}\n" + post("p1") + post("p2") + ":::::::\n");
W("story", "---\ntitle: S\n---\n\n" + post("s1", " .story"));
W("blog", "---\ntitle: B\nslug: harbor-story\n---\n\nText with 41%.\n"); W("deck", "---\ntitle: D\n---\n\n:::: {.slide .title}\n::::\n");
W("sheet", "---\ntitle: One\n---\n\n## 94% approved\n"); W("case-study", "---\ntitle: Full\n---\n\n## Results\n");
W("html-email", "---\nlayout: email\nsubject: S\n---\n\nHello 41%.\n");
r = pk("check", proj); ok(r.status === 0, `a complete package checks OK: ${r.stdout}`);
W("social", "---\ntitle: S\n---\n\n" + post("a")); W("html-email", "---\nsubject: S\n---\n");
r = pk("check", proj); ok(r.status === 1 && /social: 1 posts, the package asks for 2/.test(r.stdout) && /needs layout: email/.test(r.stdout), `wrong counts and layouts are caught: ${r.stdout}`);
W("social", "---\ntitle: S\n---\n\n" + post("a") + post("b")); W("html-email", "---\nlayout: email\nsubject: S\n---\n\nHello 41%.\n");

// 5. Built: page counts against the package, and nothing missing.
const { tagFor } = require(path.join(KIT, "naming.js"));
const fakePdf = (f, n) => fs.writeFileSync(f, "%PDF-1.4\n" + Array.from({ length: n }, () => "<< /Type /Page >>").join("\n") + "\n<< /Type /Pages >>\n");
const tag = id => tagFor(path.join(proj, "formats", id + ".md"));
r = pk("check", proj, "--built"); ok(r.status === 1 && /sheet: not built yet/.test(r.stdout), "unbuilt outputs are reported");
fakePdf(path.join(proj, "out", tag("sheet") + ".pdf"), 2); fakePdf(path.join(proj, "out", tag("case-study") + ".pdf"), 1);
fs.writeFileSync(path.join(proj, "out", tag("deck") + ".pptx"), "x");
for (const [id, files] of [["social", ["-a.png", "-b.png", "-captions.md"]], ["story", ["-s1.png", "-captions.md"]], ["html-email", [".html", ".txt", "-images.zip"]]]) {
  fs.mkdirSync(path.join(proj, "out", id, "_guides"), { recursive: true }); for (const f of files) fs.writeFileSync(path.join(proj, "out", id, tag(id) + f), "x");
  fs.writeFileSync(path.join(proj, "out", id, "_guides", tag(id) + "-g.png"), "x"); }
fs.mkdirSync(path.join(proj, "out", "blog")); fs.writeFileSync(path.join(proj, "out", "blog", "harbor-story-blog-v3-header.png"), "x");
r = pk("check", proj, "--built");
ok(r.status === 1 && /sheet: 2 pages, the package asks for 1/.test(r.stdout) && /case-study: 1 page, the package asks for at least 2/.test(r.stdout) && !/blog: not built/.test(r.stdout), `page counts are checked; the blog is found by its slug: ${r.stdout}`);
fakePdf(path.join(proj, "out", tag("sheet") + ".pdf"), 1); fakePdf(path.join(proj, "out", tag("case-study") + ".pdf"), 4);
r = pk("check", proj, "--built"); ok(r.status === 0, `a built package checks OK: ${r.stdout}`);

// 6. Claims: a number one output states and content.md doesn't is caught; the table says which outputs carry each claim.
r = pk("claims", proj, "--json"); let c = JSON.parse(r.stdout);
ok(r.status === 0 && c.claims.find(x => x.n === 1).in.includes("blog") && c.claims.find(x => x.n === 2).in.join() === "sheet" && c.claims.find(x => x.n === 3).in === null, `claims are traced to outputs: ${r.stdout.slice(0, 300)}`);
W("deck", "---\ntitle: D\n---\n\n:::: {.slide .stats}\n## 38% less\n::::\n");
r = pk("claims", proj); ok(r.status === 1 && /deck: 38 not in content\.md/.test(r.stdout), `an edit in one output that changes a claim is caught: ${r.stdout}`);
W("deck", "---\ntitle: D\n---\n\n:::: {.slide .title}\n::::\n");

// 7. One zip: a folder per output, the guides left out, a contents list; refused while an output is unbuilt.
fs.writeFileSync(path.join(proj, "out", "acme-fonts.zip"), "x");
r = pk("zip", proj); const zip = path.join(proj, "out", tagFor(path.join(proj, "formats", "case-study.md"), { output: "case-study" }) + ".zip");
const names = r.status === 0 ? spawnSync("python3", ["-c", "import sys,zipfile;print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))", zip], { encoding: "utf8" }).stdout.trim().split("\n") : [];
ok(r.status === 0 && path.basename(zip) === "harbor-point-case-study-v3.zip", `zip named after the piece and package: ${r.stderr}${path.basename(zip)}`);
ok(names.includes("social/" + tag("social") + "-a.png") && names.includes("sheet/" + tag("sheet") + ".pdf") && names.includes("blog/harbor-story-blog-v3-header.png") && names.includes("CONTENTS.txt") && names.includes("acme-fonts.zip"), `zip holds every output by folder: ${names.join(", ")}`);
ok(!names.some(n => n.includes("_guides")), "story guides stay out of the zip");
fs.rmSync(path.join(proj, "out", tag("deck") + ".pptx")); r = pk("zip", proj); ok(r.status === 2 && /not built yet: deck/.test(r.stderr), "zip refuses while an output is unbuilt");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`packages: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
