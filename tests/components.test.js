// Brand components (D18): the closing styles every brand has, a design system's new components noticed, and a component
// recorded from the interview (when, how often, rules, formats) reaching the formatters. Usage: node tests/components.test.js
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-comp-")), DRAFTS = path.join(TMP, "drafts");
process.env.PRISM_DRAFTS = DRAFTS;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const node = (...a) => spawnSync("node", a, { env: process.env, encoding: "utf8" });
const onboard = (...a) => node(path.join(KIT, "onboard.js"), ...a);

// 1. Closing styles: full card (default), centred smaller card and content only, in core CSS, the card docs and design mode.
const css = fs.readFileSync(path.join(KIT, "prism-sheet.css"), "utf8");
ok(/\.cta-card\.centered\{[^}]*max-width/.test(css), "core has the centred closing card");
ok(/\.cta-card\.plain\{[^}]*background:none[^}]*border:0/.test(css) && /\.cta-card\.plain::before,\.cta-card\.plain::after\{content:none\}/.test(css), "core has the content-only close, ground and brand ornaments removed");
ok(!/#[0-9a-f]{6}/i.test(css.split("Closing variants")[1].split("\n").slice(0, 12).join("\n")), "closing variants use roles, no colours");
ok(/\.cta-card \.centered\}|\{\.cta-card \.centered\}/.test(fs.readFileSync(path.join(KIT, "..", "references", "formats", "sheet.md"), "utf8")), "the sheet card documents the closing styles");
const md = path.join(TMP, "close.md");
fs.writeFileSync(md, "---\ntitle: Close\n---\n\n::: {.cta-card .plain}\n## Plain\n:::\n\n::: {.cta-card .centered}\n## Centred\n:::\n\n::: cta-card\n## Full\n:::\n");
const w = node(path.join(KIT, "build-wire.js"), md, "--out", path.join(TMP, "wire"));
const board = w.status === 0 ? fs.readFileSync(path.join(TMP, "wire", "close", "close.dc.html"), "utf8") : "";
ok(board.includes("closing (content only)") && board.includes("closing card, centred") && board.includes("wcentered"), `design mode draws the three closing styles: ${w.stderr.slice(0, 200)}`);

// 2. A design system's components are recorded at onboarding, and a new one is reported by the live check.
const ds = path.join(TMP, "ds"); fs.cpSync(path.join(KIT, "brands", "prism", "snapshot"), ds, { recursive: true });
for (const c of ["Callout", "Stats"]) { fs.mkdirSync(path.join(ds, "components", c), { recursive: true }); fs.writeFileSync(path.join(ds, "components", c, "README.md"), `# ${c}\n`); }
ok(onboard("start", "acme", ds).status === 0, "draft a brand");
const prof = () => JSON.parse(fs.readFileSync(path.join(DRAFTS, "acme", "profile.json"), "utf8"));
ok(JSON.stringify(prof().source.components) === JSON.stringify(["Callout", "Stats"]), "onboarding records the design system's components");
fs.mkdirSync(path.join(ds, "components", "Testimonial")); fs.writeFileSync(path.join(ds, "components", "Testimonial", "README.md"), "# Testimonial\n");
delete require.cache[require.resolve(path.join(KIT, "resolve.js"))];
const live = require(path.join(KIT, "resolve.js")).load("acme", { live: ds });
ok(live.warnings.includes("design system changed since this release: new component Testimonial"), `the live check reports a new component: ${live.warnings.filter(w => /component/.test(w)).join("; ")}`);
const shipped = path.join(TMP, "prism-ds"); fs.cpSync(path.join(KIT, "brands", "prism", "snapshot"), shipped, { recursive: true });
fs.mkdirSync(path.join(shipped, "components", "Testimonial"), { recursive: true }); fs.writeFileSync(path.join(shipped, "components", "Testimonial", "README.md"), "# T\n");
const up = onboard("update", "prism", shipped);
ok(up.status === 0 && /design-system components \(this release never recorded them; ask which are new to Prism\): Testimonial/.test(up.stdout), "an update lists components a release never recorded");
ok(JSON.stringify(JSON.parse(fs.readFileSync(path.join(DRAFTS, "prism", "profile.json"), "utf8")).source.components) === '["Testimonial"]', "the update records them");

// 3. A component from the interview: use, when, how often, rules, formats; listed for formatters and in the report.
fs.writeFileSync(path.join(TMP, "t.md"), "::: testimonial\n> A sample quote.\n\n**Name**, role\n:::");
let r = onboard("component", "acme", "testimonial", "--use", "A client's words with their name and role.", "--when", "a real quote from a named client", "--max", "1",
  "--rule", "a named person who gave permission", "--rule", "never the first block", "--formats", "sheet,social", "--markup", "::: testimonial", "--sample", path.join(TMP, "t.md"), "--from", "Testimonial");
ok(r.status === 0, `component recorded: ${r.stderr}`);
const c = prof().components.testimonial;
ok(c && c.max === 1 && c.rules.length === 2 && c.formats.join() === "sheet,social" && c.from === "Testimonial" && /A sample quote/.test(c.sample), "every interview answer is kept");
ok(/- testimonial: `::: testimonial` .*At most 1 per piece\. Rules: a named person who gave permission; never the first block\. In: sheet, social\./.test(r.stdout), "the report lists the component with its limits and rules");
const listed = JSON.parse(node(path.join(KIT, "brands.js"), "--json").stdout).find(b => b.id === "acme").components.testimonial;
ok(listed && listed.max === 1 && listed.rules.length === 2 && listed.when, "brands --json gives formatters when, max and rules");
ok(onboard("component", "acme", "x", "--use", "y", "--markup", "::: x", "--formats", "poster").status !== 0, "an unknown format is refused");
ok(onboard("component", "acme", "y", "--use", "only a use").status !== 0, "a component needs its markup");
ok(onboard("component", "acme", "testimonial", "--remove").status === 0 && !prof().components.testimonial, "--remove takes it out");
for (const f of [path.join(ROOT, "plugin", "prism", "agents", "prism-formatter.md"), path.join(KIT, "..", "references", "agents", "prism-formatter.md")]) {
  const t = fs.readFileSync(f, "utf8"); ok(/never more often than their `max`/.test(t) && /following every one of their `rules`/.test(t) && /Vary the close/.test(t), `${path.basename(path.dirname(f))} formatter keeps limits and rules and varies the close`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
