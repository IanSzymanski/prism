#!/usr/bin/env node
// Markdown blog post -> 16:9 header image, chart PNGs and a clean post (Markdown + HTML) for the CMS.
// Usage: node build-blog.js blog.md [outdir]
const { execFileSync } = require("child_process");
const path = require("path"), fs = require("fs"), crypto = require("crypto");
const { chromium } = require("playwright");

const here = __dirname;
const md = path.resolve(process.argv[2]);
const B = require("./brand.js")(md);
const outDir = path.resolve(process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : path.join(path.dirname(md), "blog"));
const { tagFor, named } = require("./naming.js");
fs.mkdirSync(outDir, { recursive: true });
const src = fs.readFileSync(md, "utf8");
const fmMatch = /^---\n([\s\S]*?)\n---\n?/.exec(src);
const body = fmMatch ? src.slice(fmMatch[0].length) : src;
const meta = {};
for (const line of (fmMatch ? fmMatch[1] : "").split("\n")) {
  const m = /^([\w-]+):\s*(.*)$/.exec(line);
  if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const plain = s => String(s || "").replace(/\*/g, "");
// Paths are relative to the post; `prism:` and `brand:` sources come from the brand.
const fileUrl = p => "file://" + B.src(p, path.dirname(md));

// Headers carry no title, author, tags or logo: the page already shows all four.
// A header is a brand gradient, optionally with an uploaded image faded into it (the prism-fade).
// The one exception is a recurring series such as the changelog, which carries its series name, never the post title.
const W = 1920, H = 1080;
const TAG = tagFor(md, meta);
const hasImg = !!meta["header-image"];
const slug = meta.slug || plain(meta.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Seeded random numbers: the same post always gets the same header, and no two posts get the same one.
let seed = parseInt(crypto.createHash("sha1").update(slug).digest("hex").slice(0, 8), 16);
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const between = (a, b) => a + (b - a) * rnd();
const isSeries = meta.type === "changelog" || !!meta.series;
const motif = meta.header || (isSeries ? "series" : hasImg ? (meta.type === "features" ? "screen" : "image") : "gradient");
// The brand draws the art (brands/<id>/ornaments.js headerArt) from the seeded random numbers, before the layout uses them.
// A brand without header art gets a plain ground in its first header colour.
const art = B.ornaments.headerArt ? B.ornaments.headerArt({ W, H, meta, slug, motif, pick, between }, B)
  : { under: `<svg class="bh-art" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${B.color("prism-color-surface")}"/></svg>`, over: "", classes: "" };
const tone = art.classes;

// The image sits on one side and fades into the gradient with the prism-fade ramp; `image-side` can pin it.
const side = meta["image-side"] || pick(["left", "right"]);
const imgUrl = hasImg ? fileUrl(meta["header-image"]) : "";
// A photo's crop centres on its focal point (`header-focus`, else the one images.py found); screenshots stay pinned top left.
const focus = hasImg ? B.focus(B.src(meta["header-image"], path.dirname(md)), meta["header-focus"]) : null;
const layer = motif === "image" ? `<img class="bh-image ${side}" src="${imgUrl}"${focus ? ` data-focus="${focus}"` : ""}>`
  : motif === "screen" ? `<div class="bh-shot" style="--x:${between(0.18, 0.3) * W}px;--y:${between(140, 220)}px"><img src="${imgUrl}"></div>`
  : motif === "series" ? `<div class="bh-series"><div class="bh-series-name">${plain(meta.series || "Changelog")}</div>${meta.release ? `<div class="bh-series-line">${plain(meta.release)}</div>` : ""}</div>` : "";
const headHtml = path.join(outDir, ".header.html");
fs.writeFileSync(headHtml, `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="file://${B.css}"><link rel="stylesheet" href="file://${B.stylesheet(path.join(here, "prism-sheet.css"))}"><link rel="stylesheet" href="file://${B.stylesheet(path.join(here, "prism-blog.css"))}">${[B.layer("sheet"), B.layer("blog")].filter(Boolean).map(f => `<link rel="stylesheet" href="file://${f}">`).join("")}
<body class="prism-blog"><div class="bh ${motif} ${art.classes}${art.dark ? " on-dark" : ""}">${art.under}${layer}${art.over}</div></body>`);

// Charts: the ```chart blocks become PNGs in the brand chart style (caption left to the CMS), and the post links them as images.
const charts = [...body.matchAll(/```chart\n([\s\S]*?)```/g)];
let postMd = body, n = 0;
postMd = postMd.replace(/```chart\n([\s\S]*?)```/g, (m, spec) => {
  n++; const cap = (/^caption:\s*(.*)$/m.exec(spec) || [, ""])[1];
  return `![${cap}](${named(TAG, `chart-${String(n).padStart(2, "0")}`, ".png")})`;
});
let chartHtml = null;
if (charts.length) {
  const tmp = path.join(outDir, ".charts.md");
  fs.writeFileSync(tmp, charts.map(c => c[0]).join("\n\n"));
  chartHtml = path.join(outDir, ".charts.html");
  execFileSync("pandoc", [tmp, "-s", "--metadata", "pagetitle=charts", "--css", "file://" + B.css, "--css", "file://" + B.stylesheet(path.join(here, "prism-sheet.css")),
    "--lua-filter", path.join(here, "prism-charts.lua"), "-o", chartHtml], { env: B.env() });
  fs.unlinkSync(tmp);
}

(async () => {
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"], ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("file://" + headHtml, { waitUntil: "networkidle" });
  const missing = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => decodeURI(i.src)));
  for (const m of missing) console.warn(`[blog] missing image: ${m}`);
  await page.addScriptTag({ content: require("./focus.js").inPage });
  await page.evaluate(() => window.prismFocus());
  await (await page.$(".bh")).screenshot({ path: path.join(outDir, named(TAG, "header", ".png")) });

  if (chartHtml) {
    const cp = await browser.newPage({ viewport: { width: 900, height: 800 }, deviceScaleFactor: 2 });
    await cp.goto("file://" + chartHtml, { waitUntil: "networkidle" });
    await cp.evaluate(ground => { document.fonts.ready; document.body.style.cssText = `max-width:900px;margin:0;padding:0;box-shadow:none;background:${ground}`;
      document.querySelectorAll("figure.prism-chart").forEach(f => f.style.cssText = `margin:0;padding:36px 44px 32px;background:${ground}`); document.querySelectorAll("figure.prism-chart figcaption").forEach(c => c.remove()); }, B.color("prism-color-surface"));
    const figs = await cp.$$("figure.prism-chart");
    for (const [i, f] of figs.entries()) await f.screenshot({ path: path.join(outDir, named(TAG, `chart-${String(i + 1).padStart(2, "0")}`, ".png")) });
  }
  await browser.close();
  for (const f of [headHtml, chartHtml]) if (f) fs.unlinkSync(f);

  // The post for the CMS: the body only (the CMS holds the title, author and tags), with its fields in front matter for reference.
  const fields = ["title", "author", "role", "type", "excerpt", "tags"].filter(k => meta[k]).map(k => `${k}: ${k === "title" ? plain(meta[k]) : meta[k]}`);
  fs.writeFileSync(path.join(outDir, named(TAG, "post", ".md")), `---\n${fields.join("\n")}\n---\n\n${postMd.trim()}\n`);
  fs.writeFileSync(path.join(outDir, ".body.md"), postMd.trim() + "\n");
  execFileSync("pandoc", [path.join(outDir, ".body.md"), "-f", "markdown-yaml_metadata_block", "-t", "html", "--wrap=none", "-o", path.join(outDir, named(TAG, "post", ".html"))]);
  fs.unlinkSync(path.join(outDir, ".body.md"));

  // Build stamp checked by verify.py, as for social images.
  const sha = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  const pngs = fs.readdirSync(outDir).filter(f => f.endsWith(".png"));
  fs.writeFileSync(path.join(outDir, ".prism-build.json"), JSON.stringify({ kit: fs.readFileSync(path.join(here, "VERSION"), "utf8").trim(),
    images: Object.fromEntries(pngs.map(f => [f, sha(path.join(outDir, f))])) }, null, 1));
  console.log(`wrote ${named(TAG, "header", ".png")} (${motif}, ${tone}), ${charts.length} chart image${charts.length === 1 ? "" : "s"}, ${named(TAG, "post", ".md")} and .html to ${outDir}`);
})();
