#!/usr/bin/env node
// Swatch sheet: maps a brand onto Prism. Part one is the mapping, in the swatch's own neutral format (system fonts, black and
// grey): every core role with the design system's own name and value, ornaments by place, Office fonts, the email palette and
// its checks, unused design-system tokens and unmapped roles. Part two is one sample of every sheet layout, built in the brand
// through the normal sheet builder. Usage: swatch.js <brand> OUT.pdf   (also writes OUT-layouts.md, which design mode can open)
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const KIT = __dirname;
const id = process.argv[2], out = path.resolve(process.argv[3] || `${id}-swatch.pdf`);
if (!id) { console.error("usage: swatch.js <brand> OUT.pdf"); process.exit(2); }
const B = require("./brand.js")(null, id), R = B.res.roles, prof = JSON.parse(fs.readFileSync(path.join(B.res.dir, "profile.json"), "utf8"));
const core = JSON.parse(fs.readFileSync(path.join(KIT, "roles.json"), "utf8")).roles;
const PAL = require("./palette.js"), sim = require("./outlook-sim.js");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const themes = B.res.themes, unmapped = core.filter(r => !R[r.role]), derived = core.filter(r => R[r.role] && R[r.role].native == null);
const ver = fs.readFileSync(path.join(KIT, "VERSION"), "utf8").trim();
const name = r => `<span class="r">${r.role}</span><span class="n">${!R[r.role] ? "unmapped" : R[r.role].native != null ? esc(R[r.role].native) : `from ${esc(R[r.role].from.replace(/^prism-/, ""))}`}</span>`;
const none = r => `<div class="cell gone">${name(r)}${r.required ? `<span class="v">required: builds stop</span>` : ""}</div>`;
const H = [];
// A draft brand (onboarding, not yet shipped) says so on the sheet, so a review copy is never taken for the release.
const where = B.res.draft ? `.prism/brands/${id}/profile.json (draft, not in a release)` : `kit/brands/${id}/profile.json`;

// ---------- Part one: the mapping, neutral ----------
H.push(`<section><h1>${esc(B.name)}</h1><p class="lead">How the ${esc(B.name)} design system maps onto Prism's ${core.length} core roles: ${core.length - unmapped.length - derived.length} mapped, ${derived.length} taken from another role or core's default, ${unmapped.length} unmapped.</p>
<table class="kv"><tr><td>Profile</td><td>${esc(where)}</td></tr><tr><td>Design system</td><td>${esc((prof.source || {}).url || "none")}</td></tr>
<tr><td>Snapshot</td><td>${Object.keys(prof.snapshot.files).length} files, ${Object.keys(prof.snapshot.blobs).length} uploads pinned, taken ${esc((prof.source || {}).snapshot_taken || "")}</td></tr>
<tr><td>Themes</td><td>${themes.map(esc).join(", ")} (builds in ${esc(themes[0])})</td></tr><tr><td>Icons</td><td>Phosphor ${esc(B.icons.weight)}</td></tr>
<tr><td>Options</td><td>${esc(JSON.stringify(B.res.options))}</td></tr><tr><td>Layers</td><td>${Object.entries(B.res.layers).map(([k, v]) => `${k}: ${esc(v)}`).join(", ") || "none"}</td></tr>
<tr><td>Ornaments</td><td>${esc(prof.ornaments_module || "none")}: ${Object.keys(B.ornaments).map(esc).join(", ") || "none"}</td></tr><tr><td>Kit</td><td>${esc(ver)}</td></tr></table></section>`);

const groups = [["Text and surfaces", r => /-(surface|text|desk|wash|tint|band|code|pre|link-line)/.test(r.role) && !/dark|header|on-photo/.test(r.role)],
  ["Accent, rules and charts", r => /-(accent|rule|eyebrow|chart)/.test(r.role) && !/on-dark/.test(r.role)],
  ["Dark and photo grounds", r => /dark|on-photo/.test(r.role)], ["Header grounds", r => /header/.test(r.role)], ["Other", () => true]];
H.push(`<section><h2>Colour roles</h2><p class="note">Each chip shows the role's value in ${themes.map(esc).join(" and ")}.</p>`);
const seen = new Set();
for (const [title, f] of groups) {
  const list = core.filter(r => r.kind === "color" && !seen.has(r.role) && f(r)); list.forEach(r => seen.add(r.role));
  if (!list.length) continue;
  H.push(`<h3>${title}</h3><div class="grid">${list.map(r => R[r.role] ? `<div class="cell"><div class="chips">${themes.map(t => `<span style="background:${R[r.role].value[t]}"></span>`).join("")}</div>${name(r)}<span class="v">${themes.map(t => R[r.role].value[t]).join(" · ")}</span></div>` : none(r)).join("")}</div>`);
}
H.push(`</section><section><h2>Type roles</h2><div class="grid">${core.filter(r => r.kind === "font").map(r => R[r.role] ? `<div class="cell"><div class="sample" style="font:400 18pt/1.2 ${esc(R[r.role].value.stack)}">Aa Bb 123</div>${name(r)}<span class="v">${esc(R[r.role].value.files.map(f => f.weight).join(", "))}</span></div>` : none(r)).join("")}</div>`);
for (const r of core.filter(r => r.kind === "type")) {
  if (!R[r.role]) { H.push(none(r)); continue; }
  const s = R[r.role].value;
  H.push(`<div class="trow"><div class="${r.role} sample">${esc(s.sample || "Sources in, one draft, every format out")}</div><div>${name(r)}<span class="v">${esc(s.family)} · ${s.fontSize} / ${s.lineHeight} · ${s.fontWeight}${s.letterSpacing ? " · " + s.letterSpacing : ""}</span></div></div>`);
}
H.push(`</section><section><h2>Space, corners and shadows</h2><div class="grid one">${core.filter(r => r.kind === "space").map(r => R[r.role] ? `<div class="cell"><div class="bar" style="width:${R[r.role].value}"></div>${name(r)}<span class="v">${R[r.role].value}</span></div>` : none(r)).join("")}</div>
<div class="grid">${core.filter(r => r.kind === "radius").map(r => R[r.role] ? `<div class="cell"><div class="box" style="border-radius:${R[r.role].value}"></div>${name(r)}<span class="v">${R[r.role].value}</span></div>` : none(r)).join("")}
${core.filter(r => r.kind === "shadow").map(r => R[r.role] ? `<div class="cell"><div class="box" style="box-shadow:${R[r.role].value};border:0;margin:6pt 4pt 12pt"></div>${name(r)}</div>` : none(r)).join("")}</div></section>`);
H.push(`<section><h2>Assets</h2><div class="grid two">${core.filter(r => r.kind === "asset").map(r => R[r.role] ? `<div class="cell"><div class="frame${/on-dark|dark/.test(r.role) ? " dk" : ""}"><img src="file://${R[r.role].value.path}"></div>${name(r)}<span class="v">${esc(path.basename(R[r.role].value.path))}${R[r.role].value.own ? " · brand-owned" : R[r.role].value.blob ? " · upload " + R[r.role].value.blob.slice(0, 8) : ""}</span></div>` : none(r)).join("")}</div></section>`);

// Ornaments by the place they go, drawn by the brand's own module; core never knows the motif.
const shots = B.ornaments.preview ? B.ornaments.preview({}, B) : [];
H.push(`<section><h2>Ornaments by place</h2><p class="note">Drawn by ${esc(prof.ornaments_module || "no ornaments module")}. Core asks for an ornament by the place it goes; what fills each place is the brand's own.</p>`);
const places = [...new Set(shots.map(s => s.place || "other"))];
for (const pl of places) H.push(`<h3>${esc(pl)}</h3><div class="grid one">${shots.filter(s => (s.place || "other") === pl).map(s => `<div class="cell"><div class="frame orn${s.dark ? " dk" : ""}">${s.svg}</div><span class="v">${esc(s.label)}</span></div>`).join("")}</div>`);
if (!shots.length) H.push(`<p>None.</p>`);
const rules = (R["prism-generator-rule"] || { value: { rules: [] } }).value.rules || [];
H.push(`<h3>Placement rules</h3><ul>${rules.map(r => `<li>${esc(r.never ? `never ${r.never} ${r.of.join(", ")}` : r.skip ? `skip on ${r.skip}` : r.hue ? `hue ${r.hue} for ${r.of.join(", ")}` : `at most ${r.max} ${r.kind} per ${r.per}`)}</li>`).join("") || "<li>none</li>"}</ul>`);
H.push(`<h3>Other brand choices</h3><ul>${Object.entries(B.res.ornaments || {}).map(([k, v]) => `<li><b>${esc(k)}</b>: ${esc(typeof v === "object" ? Object.entries(v).map(([a, b]) => `${a} ${b}`).join(" · ") : v)}</li>`).join("")}</ul></section>`);

H.push(`<section><h2>Office fonts</h2><p>${B.office && B.office.fonts ? Object.entries(B.office.fonts).map(([k, v]) => `${esc(k)}: <b>${esc(v)}</b>`).join(", ") + ` (${(B.office.paths || []).length} files)` : "None: decks cannot be built in this brand."}</p></section>`);
const P = PAL.forBrand(B), surf = k => ["page", "card", "tint", "hair", "button", "accentFill"].includes(k);
H.push(`<section><h2>Email palette</h2><p>${P.reviewed ? "From the profile, reviewed." : "Core's proposal: " + esc(P.why.join("; ")) + "."}</p>
<table class="pal"><tr><th>Key</th><th>Light</th><th>Outlook dark</th><th>Own dark CSS</th></tr>${Object.entries(P.light).map(([k, v]) => { const o = surf(k) ? sim.background(v) : sim.text(v), d = P.dark[k];
  return `<tr><td>${k}</td><td><i style="background:${v}"></i>${v}</td><td><i style="background:${o}"></i>${o}</td><td>${d ? `<i style="background:${d}"></i>${d}` : ""}</td></tr>`; }).join("")}</table>
<ul class="checks">${PAL.check(P.light).map(r => `<li class="${r.ok ? "ok" : "bad"}">${r.ok ? "ok" : "fails"}: ${esc(r.msg)}</li>`).join("")}</ul></section>`);
const T = JSON.parse(fs.readFileSync(path.join(B.res.dir, "snapshot", "tokens.json"), "utf8")), used = new Set(Object.values(R).map(r => r.native));
const spare = [...Object.entries(T).filter(([, v]) => v && Array.isArray(v.tokens)).flatMap(([k, v]) => v.tokens.map(t => [k, t.name])), ...T.type.groups.flatMap(g => g.styles.map(s => ["type", s.name])), ...Object.keys(T.type.families).map(f => ["family", f])].filter(([, n]) => !used.has(n));
H.push(`<section><h2>Design system tokens no role uses</h2><p>${spare.length ? spare.map(([k, n]) => `<code>${esc(n)}</code> ${esc(k)}`).join(", ") : "None."}</p></section>`);

const css = `@page{size:letter;margin:.6in .6in .7in;@top-left{content:"Prism swatch sheet · ${esc(B.name)}";font:500 7.5pt/1 ui-monospace,Menlo,Consolas,monospace;color:#777}@bottom-right{content:counter(page);font:500 7.5pt/1 ui-monospace,Menlo,Consolas,monospace;color:#777}}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;font:400 9pt/1.45 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#111;background:#fff}
h1{font:600 26pt/1.1 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;margin:0 0 6pt}h2{font:600 14pt/1.2 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;margin:22pt 0 8pt;padding-bottom:4pt;border-bottom:1pt solid #111;break-after:avoid}
h3{font:600 9.5pt/1.3 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;margin:12pt 0 6pt;color:#444;break-after:avoid}.lead{font-size:11pt;margin:0 0 12pt}.note{color:#666;margin:0 0 8pt}
.kv,.pal{width:100%;border-collapse:collapse;font-size:8.5pt}.kv td,.pal td,.pal th{border-bottom:.5pt solid #ddd;padding:3pt 6pt 3pt 0;text-align:left;vertical-align:top}.kv td:first-child{width:1.2in;color:#666}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7pt 12pt;margin:0 0 8pt}.grid.two{grid-template-columns:1fr 1fr}.grid.one{grid-template-columns:1fr}
.cell{display:flex;flex-direction:column;gap:1pt;break-inside:avoid;font-size:7.5pt}.chips{display:flex;gap:2pt;margin-bottom:2pt}.chips span{flex:1;height:18pt;border:.5pt solid #ccc}
.r{font:500 7pt/1.3 ui-monospace,Menlo,Consolas,monospace;color:#111}.n{font:400 7pt/1.3 ui-monospace,Menlo,Consolas,monospace;color:#666}.v{font:400 6.5pt/1.3 ui-monospace,Menlo,Consolas,monospace;color:#888}
.gone{border:1pt dashed #999;padding:4pt}.gone .n{color:#b00;font-weight:600}
.trow{display:grid;grid-template-columns:3.4in 1fr;gap:10pt;align-items:baseline;border-bottom:.5pt solid #eee;padding:3pt 0;break-inside:avoid}.sample{color:#111;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.bar{height:7pt;background:#111}.box{height:34pt;border:.5pt solid #bbb;background:#fff}
.frame{border:.5pt solid #ddd;padding:8pt;background:#fff;display:flex;align-items:center;min-height:30pt}.frame.dk{background:#16161a;border-color:#16161a}.frame img{max-width:100%;max-height:70pt}.frame.orn{min-height:0}
.pal i{display:inline-block;width:10pt;height:10pt;border:.5pt solid #ccc;vertical-align:middle;margin-right:4pt}.checks{padding-left:12pt}.checks .bad{color:#b00;font-weight:600}
code{font:400 7.5pt ui-monospace,Menlo,Consolas,monospace;background:#f2f2f2;padding:0 2pt}`;
fs.mkdirSync(path.dirname(out), { recursive: true });
const base = out.replace(/\.pdf$/i, ""), mapHtml = base + "-mapping.html", mapPdf = base + "-mapping.pdf";
// The brand stylesheet loads only for its fonts and role variables: the samples render in the brand, the page around them does not.
fs.writeFileSync(mapHtml, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(B.name)} swatch sheet</title><link rel="stylesheet" href="file://${B.css}"><style>${css}</style></head><body>${H.join("\n")}</body></html>`);

// The line sample has one series per chart colour the brand defines (charts never make one up); the donut needs two.
let nSeries = 0;
while (nSeries < 5 && R[`prism-color-chart-${nSeries + 1}`]) nSeries++;
const lineSample = () => {
  const rows = [["Q1", 10, 14, 18, 22, 26], ["Q2", 12, 15, 17, 24, 27], ["Q3", 15, 17, 16, 25, 29], ["Q4", 19, 18, 15, 27, 30]], names = ["One", "Two", "Three", "Four", "Five"].slice(0, nSeries);
  if (nSeries === 1) return ["```chart", "type: line", "caption: Line, one series (the brand has one chart colour). Sample data.", ...rows.map(r => `${r[0]}: ${r[1]}`), "```", ""];
  return ["```chart", "type: line", `caption: Line, ${["", "", "two", "three", "four", "five"][nSeries]} series. Sample data.`, `series: ${names.join(", ")}`, ...rows.map(r => `${r[0]}: ${r.slice(1, nSeries + 1).join(", ")}`), "```", ""];
};
const donutSample = () => nSeries < 2 ? [] : ["```chart", "type: donut", "caption: Donut. Sample data.", "center: 62% | sample", "Yes: 62", "No: 28", "Unsure: 10", "```", ""];

// ---------- Part two: one sample of every sheet layout, in the brand ----------
const md = ["---", `brand: ${id}`, `title: Layout samples in *${B.name}*`, `pagetitle: ${B.name} layout samples`, "doctype: Swatch sheet",
  "eyebrow: Prism swatch · layouts", `subtitle: Every sheet layout in the shared component markup, built in ${B.name}.`, "author: Prism", `date: Kit ${ver}`, `legal: Generated from ${where}`, "---", "",
  "::: hero-image", "![](prism:placeholder){.fade}", ":::", "",
  "## Sections with an *accent* word", "", "A section heading and its ornament. Body text with a [link](https://example.com) and **bold** text.", "",
  "::: stats", "- **41%** sample figure with a short label", "- **Same day** sample figure two", "- **94%** sample figure three", ":::", "",
  "## A long heading that wraps onto a second line so the ornament can show how it handles length {.stack}", "", "Running text after a long heading.", "",
  "::: features", "- []{.icon .ph-shield-check} **Feature one** One sentence about it.", "- []{.icon .ph-clock} **Feature two** One sentence about it.", ":::", "",
  "::: {.features .three}", "- []{.icon .ph-users} **One** A sentence.", "- []{.icon .ph-file-text} **Two** A sentence.", "- []{.icon .ph-chart-bar} **Three** A sentence.", ":::", "",
  "::: {.callout .tint}", "#### []{.icon .ph-sparkle .accent} Tinted callout", "", "The main takeaway, one per page.", ":::", "",
  "::: callout", "#### []{.icon .ph-info} Plain callout", "", "Caveats, methodology or disclaimers.", ":::", "",
  "## Lists, columns and a quote", "", "::: checks", "- First item", "- Second item", "- Third item", ":::", "",
  "::: cols", "**First column** paragraph of sample text.", "", "**Second column** paragraph of sample text.", ":::", "",
  "> A pull quote sits apart from any ornament.", ">", "> [Name, Role]{.cite}", "",
  "::: band", "### Band with a flow", "", "One or two sentences.", "", "::: flow", "- **Step one** What happens first.", "- **Step two** What happens next.", "- **Step three** The result.", "- **Step four** And after.", ":::", ":::", "",
  "## Charts", "",
  "```chart", "type: bar", "caption: Bar, highlight and marker. Sample data.", "unit: hrs", "highlight: Apr-Jun", "marker: Apr | Change", "Jan: 14", "Feb: 13", "Mar: 14", "Apr: 9", "May: 7", "Jun: 6", "```", "",
  "```chart", "type: hbar", "caption: Horizontal bar. Sample data.", "unit: %", "highlight: B", "A: 42", "B: 68", "C: 31", "```", "",
  ...lineSample(),
  ...donutSample(),
  "## Images", "", "::: media", "![Media row: the placeholder, with the brand's photo treatment if it has one.](prism:placeholder){.fade}", "", "### Media row", "", "Text beside a landscape image.", ":::", "",
  "::: {.media .flip}", "![Flipped media row on the dark placeholder.](prism:placeholder-dark){.fade}", "", "### Flipped media row", "", "The image on the right.", ":::", "",
  "::: gallery", "![Gallery one.](prism:placeholder)", "", "![Gallery two.](prism:placeholder-dark)", ":::", "",
  "::: shadow", "![Figure with the one standout shadow.](prism:placeholder)", ":::", "",
  "| Table | Value |", "|---|---|", "| Row one | 12 |", "| Row two | 34 |", "", ": Table caption.", "",
  "![](prism:logo){.logo}", "", "---", "",
  // The closing styles every brand has: content only and the centred card here, the full-width card last, as a piece ends.
  "::: {.cta-card .plain}", `[${B.name}]{.eyebrow}`, "", "## Closing, content only", "", "No ground: the close in the page's own colours.", ":::", "",
  "::: {.cta-card .centered}", `[${B.name}]{.eyebrow}`, "", "## Closing, centred card", "", "A smaller card for a quieter close.", ":::", "",
  "::: cta-card", `[${B.name}]{.eyebrow}`, "", "## The closing card with an *accent* word", "", "One sentence for the close.", "", "A [link](https://example.com) to finish.", ":::", ""];
// The brand's own components (profile `components`): each one's sample, after the shared layouts, so the person sees every
// component the brand adds or restyles. A component is markup plus its look in the brand's layers.
const comps = Object.entries(prof.components || {});
if (comps.length) {
  md.splice(md.length - 1 - md.slice().reverse().indexOf("::: cta-card"), 0, "## Brand components", "", ...comps.flatMap(([cid, c]) => [`### ${cid}`, "", c.use || "", "", c.sample || c.markup || "", ""]));
}
const mdPath = base + "-layouts.md", layPdf = base + "-layouts.pdf";
fs.writeFileSync(mdPath, md.join("\n"));
execFileSync("node", [path.join(KIT, "build-sheet.js"), mdPath, layPdf], { stdio: "inherit" });

(async () => {
  const browser = await chromium.launch({ ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
  const page = await browser.newPage();
  await page.goto("file://" + mapHtml, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: mapPdf, preferCSSPageSize: true, printBackground: true });
  await browser.close();
  fs.unlinkSync(mapHtml);
  // One file: the mapping, then the layout samples (pikepdf, which the sheet build already uses).
  execFileSync("python3", ["-c", "import pikepdf,sys\no=pikepdf.Pdf.new()\nfor f in sys.argv[2:]: o.pages.extend(pikepdf.Pdf.open(f).pages)\no.save(sys.argv[1])", out, mapPdf, layPdf]);
  fs.unlinkSync(mapPdf); fs.unlinkSync(layPdf);
  console.log(`swatch: ${core.length - unmapped.length}/${core.length} roles mapped${unmapped.length ? `, ${unmapped.length} unmapped` : ""}; ${out}; layouts in ${mdPath}`);
})();
