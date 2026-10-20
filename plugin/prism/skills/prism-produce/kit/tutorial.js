#!/usr/bin/env node
// The guided walkthrough's sample piece (/prism-tutorial): the brand's own sample (brands/<id>/tutorial/sample.json), else the
// kit's neutral one (tutorial/sample.json). Prints the sample prompt, its interview answers and what to try at each stage.
// Usage: tutorial.js [<brand>] [--json]
//        tutorial.js [<brand>] --out <workspace>   (sets up <workspace>/<slug>/ with source/, formats/, out/ and the sample notes)
const fs = require("fs"), path = require("path");
const { defaultBrand, brandList } = require("./resolve.js");
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const id = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out") || defaultBrand();
const b = brandList().find(x => x.id === id);
if (!b) { console.error(`[tutorial] no brand ${id}: run.sh brands lists them`); process.exit(2); }
const own = path.join(b.dir, "tutorial"), dir = fs.existsSync(path.join(own, "sample.json")) ? own : path.join(__dirname, "tutorial");
const s = JSON.parse(fs.readFileSync(path.join(dir, "sample.json"), "utf8"));
const name = JSON.parse(fs.readFileSync(path.join(b.dir, "profile.json"), "utf8")).name;
const out = { brand: id, brand_name: name, sample: dir === own ? "brand" : "kit", dir, ...s, source: s.source.map(f => path.join(dir, f)), project: null, created: false };

const ws = opt("--out");
if (ws) {
  const proj = path.resolve(ws, s.slug);
  out.project = proj;
  // A piece already set up is kept as it is, so a second run never overwrites the person's tutorial edits.
  if (!fs.existsSync(proj)) {
    for (const d of ["source", "formats", "out"]) fs.mkdirSync(path.join(proj, d), { recursive: true });
    for (const f of s.source) fs.copyFileSync(path.join(dir, f), path.join(proj, "source", path.basename(f)));
    fs.writeFileSync(path.join(proj, "log.md"), `# ${s.title}\n\n- ${new Date().toISOString().slice(0, 10)} · tutorial sample (${out.sample === "brand" ? "the brand's own" : "the kit's"}), brand ${id}\n- brief: ${s.prompt}\n`);
    out.created = true;
  }
}

if (args.includes("--json")) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
console.log(`brand: ${id} (${name})${id === defaultBrand() ? ", the default" : ""} · sample: ${out.sample === "brand" ? "the brand's own" : "the kit's neutral one"}`);
if (out.project) console.log(`project: ${out.project}${out.created ? " (set up, sample notes in source/)" : " (already set up, left as it is)"}`);
console.log(`title: ${s.title}\nprompt: ${s.prompt}\nsource: ${out.source.join(", ")}`);
for (const [k, v] of Object.entries(s.answers)) console.log(`answer ${k}: ${v}`);
for (const [k, v] of Object.entries(s.try || {})) console.log(`try ${k}: ${v}`);
for (const m of s.more || []) console.log(`more ${m.format}: ${m.prompt}`);
