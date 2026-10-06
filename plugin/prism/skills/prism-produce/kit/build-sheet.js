#!/usr/bin/env node
// Markdown -> sheet or brochure PDF in the document's brand. Usage: node build-sheet.js sheet.md [out.pdf] [--html]
const { execFileSync } = require("child_process");
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const md = path.resolve(args.find(a => a.endsWith(".md")));
const pdf = path.resolve(args.find(a => a.endsWith(".pdf")) || md.replace(/\.md$/, ".pdf"));
const here = __dirname, B = require("./brand.js")(md), css = B.stylesheet(path.join(here, "prism-sheet.css"));
const html = md.replace(/\.md$/, ".sheet.html");
// `layout: brochure` in the front matter builds a Letter trifold instead of a portrait sheet.
const brochure = /^---[\s\S]*?^layout:\s*brochure\s*$[\s\S]*?^---/m.test(fs.readFileSync(md, "utf8"));

execFileSync("pandoc", [md, "-s", "--template", path.join(here, brochure ? "prism-brochure.html" : "prism-sheet.html"),
  "--css", "file://" + B.icons.css,
  "--css", "file://" + B.css, "--css", "file://" + css, ...(brochure ? ["--css", "file://" + B.stylesheet(path.join(here, "prism-brochure.css"))] : []),
  // The brand's presentation layers come last, so they style core's structure.
  ...[B.layer("sheet"), brochure ? B.layer("brochure") : null].filter(Boolean).flatMap(f => ["--css", "file://" + f]),
  "--lua-filter", path.join(here, "prism-sheet.lua"), "--lua-filter", path.join(here, "prism-charts.lua"), "--wrap=none",
  "-V", "prism-logo=file://" + B.asset("prism-asset-logo"), "-V", "brand-name=" + B.name, "-V", "brand-contact=" + (B.content.contact || ""), "--resource-path", path.dirname(md), "-o", html], { env: B.env() });

// Runs inside the page: tags image orientation, checks print resolution, and bakes fade and shadow
// into solid pixels on the background colour (PDF viewers blend transparency inconsistently).
async function prepareImages([printScale, ground, fadeOn]) {
  const imgs = [...document.images].filter(i => !i.closest(".prism-mast__bar"));
  await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  const orient = i => { const r = i.naturalWidth / i.naturalHeight; return r > 1.15 ? "landscape" : r < 0.87 ? "portrait" : "square"; };
  for (const i of imgs) {
    if (!i.naturalWidth) continue;
    i.classList.add("is-" + orient(i));
    const fig = i.closest("figure"); if (fig) fig.classList.add("is-" + orient(i));
  }
  // Media rows keep the image's own shape unless it is extreme (wider than 2:1 or taller than 3:5).
  document.querySelectorAll(".media").forEach(m => {
    const i = m.querySelector("img"); if (!i || !i.naturalWidth) return;
    m.classList.add("is-" + orient(i));
    const r = i.naturalWidth / i.naturalHeight;
    if (r >= 0.6 && r <= 2) i.style.aspectRatio = `${i.naturalWidth} / ${i.naturalHeight}`;
  });
  // Galleries share one shape: the images' own average when they are alike, otherwise 4:5 or 3:2 by majority.
  document.querySelectorAll(".gallery").forEach(g => {
    const list = [...g.querySelectorAll("img")].filter(i => i.naturalWidth);
    g.style.setProperty("--n", Math.min(Math.max(list.length, 1), 3));
    const ratios = list.map(i => i.naturalWidth / i.naturalHeight);
    if (!ratios.length) return;
    const alike = Math.max(...ratios) / Math.min(...ratios) <= 1.5;
    const portraits = list.filter(i => orient(i) === "portrait").length;
    g.style.setProperty("--ratio", alike ? String(ratios.reduce((a, b) => a + b) / ratios.length) : portraits > list.length / 2 ? "4 / 5" : "3 / 2");
  });
  const warnings = [];
  for (const i of imgs) {
    if (!i.naturalWidth) { warnings.push(`missing image: ${i.getAttribute("src")}`); continue; }
    const inches = i.getBoundingClientRect().width / 96 * printScale;
    const dpi = i.naturalWidth / inches;
    if (dpi < 150 && !/\.svg(\?|$)/i.test(i.getAttribute("src") || "")) warnings.push(`low resolution: ${i.getAttribute("src")} prints at ${Math.round(dpi)} dpi (aim for 200+)`);
  }
  const bg = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c; } return ground; };
  for (const i of imgs.filter(i => i.naturalWidth && ((fadeOn && i.classList.contains("fade")) || i.classList.contains("shadow")))) {
    const box = i.getBoundingClientRect(), W = box.width, H = box.height, S = 3;
    const cs = getComputedStyle(i), radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const a = document.createElement("canvas"); a.width = Math.round(W * S); a.height = Math.round(H * S);
    const c = a.getContext("2d"); c.scale(S, S);
    c.beginPath(); c.roundRect(0, 0, W, H, radius); c.clip();
    const ir = i.naturalWidth / i.naturalHeight, br = W / H;
    let sw, sh, sx, sy;
    if (ir > br) { sh = i.naturalHeight; sw = sh * br; sx = (i.naturalWidth - sw) / 2; sy = 0; }
    else { sw = i.naturalWidth; sh = sw / br; sx = 0; sy = (i.naturalHeight - sh) / 2; }
    c.drawImage(i, sx, sy, sw, sh, 0, 0, W, H);
    if (fadeOn && i.classList.contains("fade")) {
      // Same smoothstep ramp as .prism-fade on the site, pointing toward the text in a media row.
      const media = i.closest(".media"), dir = media ? (media.classList.contains("flip") ? "left" : "right") : "bottom";
      const g = dir === "bottom" ? c.createLinearGradient(0, 0, 0, H) : dir === "right" ? c.createLinearGradient(0, 0, W, 0) : c.createLinearGradient(W, 0, 0, 0);
      const start = dir === "bottom" ? 0.58 : 0.5;
      g.addColorStop(0, "#000"); g.addColorStop(start, "#000");
      for (let k = 1; k <= 10; k++) { const t = k / 10; g.addColorStop(start + (1 - start) * t, `rgba(0,0,0,${1 - t * t * (3 - 2 * t)})`); }
      c.globalCompositeOperation = "destination-in"; c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // Room for the shadow: it reaches 12px up, 32px sideways and 50px down, so the canvas only grows that far.
    const hasShadow = i.classList.contains("shadow"), T = hasShadow ? 14 : 0, X = hasShadow ? 32 : 0, B = hasShadow ? 52 : 0;
    const f = document.createElement("canvas"); f.width = Math.round((W + 2 * X) * S); f.height = Math.round((H + T + B) * S);
    const d = f.getContext("2d");
    d.fillStyle = bg(i.parentElement); d.fillRect(0, 0, f.width, f.height);
    if (hasShadow) {
      // Two stacked shadows, a tight one under a wide one: the site's .prism-shadow values.
      for (const [y, blur, alpha] of [[18, 30, 0.13], [2, 4, 0.09]]) {
        d.save(); d.shadowColor = `rgba(8,6,17,${alpha})`; d.shadowBlur = blur * S; d.shadowOffsetY = y * S;
        d.drawImage(a, X * S, T * S); d.restore();
      }
    }
    d.drawImage(a, X * S, T * S);
    i.src = f.toDataURL("image/jpeg", 0.9);
    Object.assign(i.style, { width: `calc(100% + ${2 * X}px)`, height: "auto", maxWidth: "none", margin: `${-T}px ${-X}px ${-B}px`, borderRadius: "0", objectFit: "fill", aspectRatio: "auto" });
    await i.decode();
  }
  return warnings;
}

// Marks the PDF as built by this kit (Creator field), so verify.py can tell it from a PDF made any other way.
// Appends a standard incremental update: a new Info object, an xref entry and a trailer pointing back to the old one.
function stamp(file) {
  const buf = fs.readFileSync(file), s = buf.toString("latin1");
  const tr = s.slice(s.lastIndexOf("trailer"));
  const size = +/\/Size\s+(\d+)/.exec(tr)[1], root = /\/Root\s+(\d+\s+\d+\s+R)/.exec(tr)[1];
  const prev = +/startxref\s+(\d+)/.exec(s.slice(s.lastIndexOf("startxref")))[1];
  const info = /\/Info\s+(\d+)\s+\d+\s+R/.exec(tr);
  const old = info ? (new RegExp(`\\n${info[1]} 0 obj\\s*<<([\\s\\S]*?)>>\\s*endobj`).exec(s) || [])[1] || "" : "";
  const title = (/\/Title\s*(\((?:\\.|[^\\)])*\))/.exec(old) || [, "()"])[1];
  const ver = fs.readFileSync(path.join(here, "VERSION"), "utf8").trim();
  const obj = `\n${size} 0 obj\n<</Title ${title}\n/Creator (Prism ${ver})\n/Producer (Skia/PDF via prism-kit)\n/Keywords (prism)>>\nendobj\n`;
  const at = buf.length + 1, xref = buf.length + Buffer.byteLength(obj, "latin1");
  const tail = `xref\n${size} 1\n${String(at).padStart(10, "0")} 00000 n \ntrailer\n<</Size ${size + 1}\n/Root ${root}\n/Info ${size} 0 R\n/Prev ${prev}>>\nstartxref\n${xref}\n%%EOF\n`;
  fs.appendFileSync(file, obj + tail, "latin1");
}

(async () => {
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"], ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
  // Viewport matches the printed layout width (Letter at 90%, or a trifold at 100%), so images are measured at their real size.
  const page = await browser.newPage({ viewport: { width: brochure ? 1056 : 907, height: 1200 } });
  await page.goto("file://" + html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });
  const missingIcons = await require("./icons.js")(page, here, B);
  // The photo fade is a brand treatment (options.images.fade); a brand without it shows photos as they are.
  const warnings = await page.evaluate(prepareImages, [brochure ? 1 : 0.9, B.color("prism-color-surface"), B.option("images.fade", false)]);
  for (const n of missingIcons) warnings.push(`no Phosphor icon "${n}"`);
  // Brochure panels clip instead of flowing on, so report any panel or column whose content runs past its bottom edge.
  if (brochure) warnings.push(...await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".spread").forEach((sp, si) => sp.querySelectorAll(":scope > .panel:not(:has(> .col)), .panel > .col").forEach(el => {
      const box = el.getBoundingClientRect(), limit = Math.min(box.bottom, sp.getBoundingClientRect().bottom) - parseFloat(getComputedStyle(el).paddingBottom);
      const end = Math.max(...[...el.children].map(c => c.getBoundingClientRect().bottom));
      if (end > limit + 2) {
        const panels = [...sp.querySelectorAll(":scope > .panel")], p = el.closest(".panel");
        const where = `page ${si + 1}, panel ${panels.indexOf(p) + 1}${el.classList.contains("col") ? ` column ${[...p.querySelectorAll(":scope > .col")].indexOf(el) + 1}` : ""}`;
        out.push(`brochure ${where}: content runs ${((end - limit) / 96).toFixed(2)} in past the panel bottom; cut words or an image`);
      }
    }));
    return out;
  }));
  for (const w of warnings) console.warn("[sheet] " + w);
  // Sheets print at 90% (every size in prism-sheet.css was tuned at that scale); brochures print at true size.
  await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true, scale: brochure ? 1 : 0.9 });
  await browser.close();
  if (!args.includes("--html")) fs.unlinkSync(html);
  // Whole-line text runs, so copy, search and screen readers get words rather than letters; skipped with a note if pikepdf is missing.
  try { execFileSync("python3", [path.join(here, "tidy_pdf.py"), pdf], { stdio: ["ignore", "ignore", "pipe"] }); }
  catch (e) { console.warn("[sheet] text left letter by letter (pikepdf missing): run `run.sh setup sheet`, then rebuild"); }
  stamp(pdf);
  // Page count from the PDF itself, so no PDF tools are needed to check fit.
  const pages = (fs.readFileSync(pdf, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`wrote ${pdf} (${pages} page${pages === 1 ? "" : "s"})`);
})();
