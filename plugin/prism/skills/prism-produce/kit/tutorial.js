#!/usr/bin/env node
// The guided walkthrough's sample piece (/prism-tutorial): the brand's own sample (brands/<id>/tutorial/sample.json), else the
// kit's neutral one (tutorial/sample.json). Prints the sample prompt, its interview answers and what to try at each stage.
// Usage: tutorial.js [<brand>] [--json]
//        tutorial.js [<brand>] --out <workspace>   (sets up <workspace>/<slug>/ with source/, formats/, out/ and the sample notes)
//        tutorial.js [<brand>] --prompt            (the sample message exactly as a person would send it: the prompt, then every source file in full)
//        tutorial.js [<brand>] --out <workspace> --approve        (the fixed approved content.md and claims.md, the old ones kept as .v1)
//        tutorial.js [<brand>] --out <workspace> --format <name>  (the fixed layout for that format into formats/)
// A sample with `fixed` files (draft, proof comments, approved words, layouts) gives the same doc, flags and boards on every run.
const fs = require("fs"), path = require("path");
const { defaultBrand, brandList } = require("./resolve.js");
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const id = args.find((a, i) => !a.startsWith("--") && !["--out", "--format"].includes(args[i - 1])) || defaultBrand();
const b = brandList().find(x => x.id === id);
if (!b) { console.error(`[tutorial] no brand ${id}: run.sh brands lists them`); process.exit(2); }
const own = path.join(b.dir, "tutorial"), dir = fs.existsSync(path.join(own, "sample.json")) ? own : path.join(__dirname, "tutorial");
const s = JSON.parse(fs.readFileSync(path.join(dir, "sample.json"), "utf8"));
const name = JSON.parse(fs.readFileSync(path.join(b.dir, "profile.json"), "utf8")).name;
const fx = s.fixed || null, abs = f => path.join(dir, f);
const out = { brand: id, brand_name: name, sample: dir === own ? "brand" : "kit", dir, ...s, source: s.source.map(abs), project: null, created: false,
  fixed: fx && { proof: abs(fx.proof), formats: Object.keys(fx.formats || {}) } };

const ws = opt("--out");
if (ws) {
  const proj = path.resolve(ws, s.slug);
  out.project = proj;
  // A piece already set up is kept as it is, so a second run never overwrites the person's tutorial edits.
  if (!fs.existsSync(proj)) {
    for (const d of ["source", "formats", "out"]) fs.mkdirSync(path.join(proj, d), { recursive: true });
    for (const f of s.source) fs.copyFileSync(path.join(dir, f), path.join(proj, "source", path.basename(f)));
    // The fixed draft stands in for the writer and reviewer, so the proof shows the same words and flags every time.
    if (fx) { fs.copyFileSync(abs(fx.content), path.join(proj, "content.md")); fs.copyFileSync(abs(fx.claims), path.join(proj, "claims.md")); }
    fs.writeFileSync(path.join(proj, "log.md"), `# ${s.title}\n\n- ${new Date().toISOString().slice(0, 10)} · tutorial sample (${out.sample === "brand" ? "the brand's own" : "the kit's"}), brand ${id}\n- brief: ${s.prompt}\n`);
    out.created = true;
  }
}

// The person sees exactly what the writer and reviewer will read, so the flags and claims later can be checked against it.
if (args.includes("--prompt")) { console.log([s.prompt, ...out.source.map(f => fs.readFileSync(f, "utf8").trimEnd())].join("\n\n")); process.exit(0); }
const need = what => { if (!fx || !out.project) { console.error(`[tutorial] ${what} needs --out and a sample with fixed files`); process.exit(2); } };
if (args.includes("--approve")) {
  need("--approve"); const p = out.project;
  for (const [f, src] of [["content.md", fx.approved], ["claims.md", fx.approved_claims]]) { if (fs.existsSync(path.join(p, f))) fs.copyFileSync(path.join(p, f), path.join(p, f.replace(".md", ".v1.md"))); fs.copyFileSync(abs(src), path.join(p, f)); }
  console.log(`approved: ${path.join(p, "content.md")} (the fixed approved words; the draft kept as content.v1.md)`); process.exit(0);
}
if (opt("--format")) {
  need("--format"); const f = opt("--format"), src = (fx.formats || {})[f];
  if (!src) { console.error(`[tutorial] no fixed layout for ${f}: make it the usual way (fixed: ${Object.keys(fx.formats || {}).join(", ")})`); process.exit(3); }
  const to = path.join(out.project, "formats", `${f}.md`); fs.copyFileSync(abs(src), to); console.log(`format: ${to} (the fixed layout)`); process.exit(0);
}
if (args.includes("--json")) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
console.log(`brand: ${id} (${name})${id === defaultBrand() ? ", the default" : ""} · sample: ${out.sample === "brand" ? "the brand's own" : "the kit's neutral one"}`);
if (out.project) console.log(`project: ${out.project}${out.created ? " (set up, sample notes in source/)" : " (already set up, left as it is)"}`);
console.log(`title: ${s.title}\nprompt: ${s.prompt}\nsource: ${out.source.join(", ")}`);
for (const [k, v] of Object.entries(s.answers)) console.log(`answer ${k}: ${v}`);
for (const [k, v] of Object.entries(s.try || {})) console.log(`try ${k}: ${v}`);
for (const m of s.more || []) console.log(`more ${m.format}: ${m.prompt}${fx && (fx.formats || {})[m.format] ? " (fixed layout)" : ""}`);
console.log(fx ? `fixed: draft, proof comments (${out.fixed.proof}), approved words, layouts for ${out.fixed.formats.join(", ")}` : "fixed: none (the writer, reviewer and formatters run as usual)");
