// Website illustrations: the format file, the single HTML block (shared CSS, finished-frame markup, one script per block),
// the brand's look (outline-only color, approved grounds, glass), the story order, the checks, phone compositions and the bench.
// Usage: node tests/illustration.test.js (needs the kit's illustration setup: Chromium and GSAP)
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ill-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const run = (a, opt = {}) => spawnSync("bash", [path.join(KIT, "run.sh"), ...a], { encoding: "utf8", ...opt });
const I = require(path.join(KIT, "build-illustration.js"));
const B = require(path.join(KIT, "brand.js"))(path.join(ROOT, "fixtures", "illustration.md"));
const S = I.settings(B);
const write = (name, md) => { const f = path.join(TMP, name + ".md"); fs.writeFileSync(f, md); return f; };
const head = (more = "") => `---\ntitle: Test\nfeature: Case monitoring\nproblem: A problem.\nanswer: An answer.\nfigures: illustrative\n${more}---\n\n`;

// 1. Parsing: modules, elements, tethers and notes; unclosed blocks are reported.
let doc = I.parse(fs.readFileSync(path.join(ROOT, "fixtures", "illustration-notes.md"), "utf8"));
ok(doc.errors.length === 0, `the notes fixture parses: ${doc.errors}`);
ok(doc.top.children.map(n => n.kind).join(",") === "card,panel,tether,notes", `top-level modules in order: ${doc.top.children.map(n => n.kind)}`);
ok(I.parse(head() + "::: {.card box=\"1 1 10\"}\nA\n").errors.some(e => /never closed/.test(e)), "an unclosed ::: is reported");

// 2. Compile: data-k beats, tether waits for both ends, story steps in order, outline tones only.
const c = I.compile(doc, S, B, path.join(ROOT, "fixtures", "illustration-notes.md"), "dark");
ok(c.errors.length === 0, `compiles: ${c.errors}`);
const fx = c.steps.map(s => s.fx);
ok(fx.join(",") === "rise,mark,rise,type,draw,type,press", `story order (mark, the first fact typed, the tether as soon as its end is there, then the approval last): ${fx}`);
ok(/data-tone="review"/.test(c.mods), "a missing field takes the review tone");
ok(/class="ca-mock__ring"/.test(c.mods) && /ca-mock__was/.test(c.mods), "the approve button has its pulse ring and its earlier text");
ok(I.schedule(c.steps, 5) <= 5.2, "the steps fill about five seconds");

// 3. Grounds: smoothstep glows over many stops, only the brand's grounds.
const g = I.ground(S.grounds.violet.dark);
ok((g.match(/radial-gradient/g) || []).length === 3 && (g.match(/%/g) || []).length > 30, "a ground is several radial glows with many stops");
ok(Object.keys(S.grounds).join(",") === "violet,grape,dusk,haze", `the brand's approved grounds: ${Object.keys(S.grounds)}`);

// 4. The fixtures build, verify, and pass every check with no warnings.
for (const f of ["illustration", "illustration-notes", "illustration-full"]) {
  const out = path.join(TMP, f);
  const r = run(["illustration", path.join(ROOT, "fixtures", f + ".md"), out]);
  ok(r.status === 0 && !/\[illustration\]/.test(r.stderr), `${f} builds clean: ${r.stderr.slice(0, 400)}`);
  const files = fs.existsSync(out) ? fs.readdirSync(out) : [];
  for (const suffix of ["-dark.html", "-light.html", "-bench.html", "-dark.png", "-light.png", "-dark-phone.png", "-light-phone.png", "-frames.png"]) ok(files.some(x => x.endsWith(suffix)), `${f}: ${suffix}`);
  ok(spawnSync("python3", [path.join(KIT, "verify.py"), out], { encoding: "utf8" }).status === 0, `${f} verifies`);
}

// 5. The block: one style, one div, one script; shared CSS identical across blocks; the brand's boot, trigger and script attribute; no GSAP inside.
const blk = n => fs.readFileSync(path.join(TMP, n, fs.readdirSync(path.join(TMP, n)).find(x => x.endsWith("-dark.html"))), "utf8");
const a = blk("illustration"), b = blk("illustration-notes");
ok((a.match(/<style>/g) || []).length === 1 && (a.match(/<script/g) || []).length === 1, "one style and one script per block");
ok(a.match(/<style>([\s\S]*?)<\/style>/)[1] === b.match(/<style>([\s\S]*?)<\/style>/)[1], "the shared CSS is identical in every block");
ok(/data-ca-mock="case-monitoring-dark"/.test(a) && /class="ca-mock ca-mock--dark ca-case-monitoring"/.test(a), "prefixed classes and the block's own data key");
ok(/<script data-cookieconsent="ignore">/.test(a) && /"CA","ready"/.test(a) && /top 75%/.test(a) && /\.js\.pre \.ca-mock__tile\{visibility:hidden\}/.test(a), "the site's boot, trigger line, consent attribute and pre state");
ok(!/GreenSock|gsap\.min/i.test(a) && a.length < 60000, `the block carries no GSAP (${a.length} bytes)`);
ok(/<path pathLength="1" d="M[\d.]+ [\d.]+C/.test(b), "tethers are baked into the markup (the finished frame without JS)");
ok(b.indexOf("<svg class=\"ca-mock__tethers") > b.lastIndexOf("class=\"ca-mock__m "), "tethers come after (over) every module");

// 6. The bench: GSAP inlined, generous room at the top, both themes, the block's source with a copy button.
const bench = fs.readFileSync(path.join(TMP, "illustration", fs.readdirSync(path.join(TMP, "illustration")).find(x => x.endsWith("-bench.html"))), "utf8");
ok(/GreenSock/.test(bench) && /ScrollTrigger/.test(bench), "the bench carries GSAP and ScrollTrigger");
ok(/\.top\{min-height:110vh/.test(bench), "room at the top so nothing plays before scrolling");
ok((bench.match(/data-ca-mock="/g) || []).length === 2 && /class="copybtn"/.test(bench), "dark and light, with the block's HTML to copy");

// 7. Refusals: a colored fill can't be written; never-words, unknown grounds, tones and tethers stop the build; numbers need figures.
let r = run(["illustration", write("never", head("ground: violet\n") + "::: {.card box=\"10 10 50\"}\nOur AI caseworker writes perfect notes\n:::\n"), path.join(TMP, "never")]);
ok(r.status === 1 && /AI caseworker/.test(r.stderr) && /perfect notes/.test(r.stderr), `never-words stop the build: ${r.stderr.slice(0, 300)}`);
r = run(["illustration", write("ground", head("ground: orange\n") + "::: {.card box=\"10 10 50\"}\nA\n:::\n"), path.join(TMP, "ground")]);
ok(r.status === 1 && /ground: orange is not one of/.test(r.stderr), "an unknown ground stops the build");
r = run(["illustration", write("tone", head() + "::: {.card #x box=\"10 10 50\"}\n[A]{.pill tone=red}\n:::\n[]{.tether from=x to=nowhere}\n"), path.join(TMP, "tone")]);
ok(r.status === 1 && /tone=red/.test(r.stderr) && /#nowhere/.test(r.stderr), "an unknown tone and a tether to nothing stop it");
r = run(["illustration", write("nums", head().replace("figures: illustrative\n", "") + "::: {.card box=\"10 10 50\"}\n[12 open cases]{.line}\n:::\n"), path.join(TMP, "nums"), "--no-render"]);
ok(/has a number/.test(r.stderr), "a number without figures: illustrative is flagged");
r = run(["illustration", write("ai", head() + "::: {.card box=\"10 10 50\"}\n[Draft text]{.line .ai}\n:::\n"), path.join(TMP, "ai"), "--no-render"]);
ok(/no \.approve/.test(r.stderr), "AI output without a person approving it is flagged");
r = run(["illustration", write("top", head() + "[Loose]{.pill}\n"), path.join(TMP, "top"), "--no-render"]);
ok(r.status === 1 && /at the top level/.test(r.stderr), "elements outside a module are refused");
r = run(["illustration", write("tiny", head() + "::: {.card box=\"2 2 30\"}\n[Name | Sub]{.row}\n:::\n"), path.join(TMP, "tiny")]);
ok(/cut off|text as small/.test(r.stderr), `a squeezed phone composition is reported: ${r.stderr.slice(0, 300)}`);

// 8. A feature page: neighbors on the same ground are refused; different grounds build one bench.
r = run(["illustration", "bench", path.join(TMP, "page", "bench.html"), path.join(ROOT, "fixtures", "illustration.md"), path.join(ROOT, "fixtures", "illustration.md")]);
ok(r.status === 1 && /same ground/.test(r.stderr), "neighbors on one ground are refused");
r = run(["illustration", "bench", path.join(TMP, "page2", "bench.html"), path.join(ROOT, "fixtures", "illustration-full.md"), path.join(ROOT, "fixtures", "illustration.md"), path.join(ROOT, "fixtures", "illustration-notes.md")]);
ok(r.status === 0 && /3 illustrations/.test(r.stdout), `a feature page bench: ${r.stderr.slice(0, 300)}`);

// 9. The number check ignores the layout's numbers.
fs.writeFileSync(path.join(TMP, "content.md"), "---\ntitle: x\n---\nNothing numeric.\n");
r = spawnSync("node", [path.join(KIT, "check-numbers.js"), path.join(TMP, "content.md"), path.join(ROOT, "fixtures", "illustration-full.md")], { encoding: "utf8" });
ok(r.status === 0, `box=, phone= and seconds aren't claims: ${r.stdout}`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
