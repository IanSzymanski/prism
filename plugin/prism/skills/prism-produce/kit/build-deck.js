#!/usr/bin/env node
// Markdown -> editable PowerPoint in the document's brand. Usage: node build-deck.js deck.md [out.pptx]
const { execFileSync } = require("child_process");
const path = require("path"), fs = require("fs");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const { chromium } = require("playwright");

const here = __dirname;
const md = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3] || md.replace(/\.md$/, ".pptx"));

// Brand values from the profile, as PowerPoint hex (no #). Solid colours only, as in prism-sheet.css.
const B = require("./brand.js")(md), hx = (n, t) => B.color(n, t).replace(/^#/, "");
const C = { paper: hx("prism-color-surface"), ink: hx("prism-color-text-strong"), body: hx("prism-color-text"), muted: hx("prism-color-text-muted"), line: hx("prism-color-rule-soft"),
  accent: hx("prism-color-accent"), eyebrowOnDark: hx("prism-color-eyebrow-on-dark"), accentOnDark: hx("prism-color-accent", "dark"), onDark: hx("prism-color-text", "dark"), muteBar: hx("prism-color-text-faint"),
  grid: hx("prism-color-chart-grid"), axis: hx("prism-color-rule"), inkOnDark: hx("prism-color-text-strong", "dark") };
// chart-1, then as many of chart-2 to -5 as the brand defines; a chart needing more says so instead of reusing a colour.
const SERIES = [];
for (let i = 1; i <= 5 && B.has(`prism-color-chart-${i}`); i++) SERIES.push(hx(`prism-color-chart-${i}`));
const needSeries = n => { if (n > SERIES.length) { console.error(`[deck] a chart has ${n} series and ${B.name} defines ${SERIES.length} chart colours (prism-color-chart-1 to -${SERIES.length}); cut the series or map more chart colours`); process.exit(1); } };
// Placement rules for the brand's ornaments (profile generator rules), e.g. skip the title rule on media slides.
const ORN_RULES = (B.res.roles["prism-generator-rule"] || { value: { rules: [] } }).value.rules || [];
// Office copies of the brand fonts, named by the profile. Install them to edit or view decks in PowerPoint.
if (!B.office || !B.office.fonts) { console.error(`[deck] brand ${B.id} names no Office fonts (profile "office.fonts")`); process.exit(1); }
const F = B.office.fonts;
const SW = 13.333, SH = 7.5, MX = 0.75, CW = SW - 2 * MX;

// ---------- Markdown -> pandoc AST ----------
const ast = JSON.parse(execFileSync("pandoc", [md, "-t", "json"], { maxBuffer: 1 << 26 }).toString());
const meta = {};
for (const [k, v] of Object.entries(ast.meta)) meta[k] = v.t === "MetaInlines" ? v.c : v.c;

// `display` is for headings, titles and quotes: *emphasis* there is brand colour; in body text it stays italic.
function runs(inl, st = {}, dark = false, display = false) {
  const out = [];
  for (const n of inl || []) {
    if (n.t === "Str") out.push({ text: n.c, options: { ...st } });
    else if (n.t === "Space" || n.t === "SoftBreak") out.push({ text: " ", options: { ...st } });
    else if (n.t === "Emph") out.push(...runs(n.c, display ? { ...st, color: dark ? C.accentOnDark : C.accent } : { ...st, italic: true }, dark, display));
    else if (n.t === "Strong") out.push(...runs(n.c, { ...st, bold: true, color: st.color || (dark ? "FFFFFF" : C.ink) }, dark, display));
    else if (n.t === "Link") out.push(...runs(n.c[1], st, dark, display));
    else if (n.t === "Quoted") out.push({ text: "“", options: st }, ...runs(n.c[1], st, dark, display), { text: "”", options: st });
    else if (n.t === "Span" && !n.c[0][1].some(c => c.startsWith("ph-"))) out.push(...runs(n.c[1], st, dark, display));
  }
  return merge(out);
}
// Joins neighbouring runs that share formatting, so each paragraph is a few runs instead of one per word.
function merge(list) {
  const out = [];
  for (const r of list) {
    const last = out[out.length - 1];
    if (last && JSON.stringify(last.options) === JSON.stringify(r.options)) last.text += r.text;
    else out.push({ text: r.text, options: { ...r.options } });
  }
  return out;
}
const trimRuns = r => { while (r.length && !r[0].text.trim()) r.shift(); if (r.length) r[0] = { ...r[0], text: r[0].text.trimStart() }; return r; };
const plain = inl => runs(inl).map(r => r.text).join("").trim();
const iconOf = inl => { for (const n of inl || []) if (n.t === "Span") { const c = n.c[0][1].find(x => x.startsWith("ph-") && x !== "ph-light"); if (c) return c.slice(3); } return null; };
function splitStrong(inl) {
  const i = inl.findIndex(n => n.t === "Strong");
  if (i < 0) return { head: "", rest: inl };
  return { head: plain(inl[i].c), rest: inl.slice(i + 1) };
}
const itemInlines = item => (item[0] && (item[0].t === "Plain" || item[0].t === "Para")) ? item[0].c : [];

// ---------- Chart spec (same syntax as prism-charts.lua) ----------
const KEYS = new Set(["type", "caption", "unit", "max", "highlight", "marker", "labels", "center", "series", "height"]);
function parseChart(text) {
  const spec = { type: "bar" }, rows = [];
  for (let line of text.split("\n")) {
    line = line.replace(/\s+#.*$/, "").trim();
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    if (KEYS.has(k)) spec[k] = m[2];
    else rows.push({ label: k, vals: m[2].split(",").map(s => ({ s: s.trim(), n: parseFloat(s.replace(/[^\d.\-]/g, "")) })) });
  }
  return { spec, rows };
}
function highlighted(spec, rows) {
  const h = spec.highlight;
  if (!h) return rows.map(() => true);
  if (h === "last") return rows.map((_, i) => i === rows.length - 1);
  const [a, b] = h.split("-").map(s => s && s.trim());
  const from = rows.findIndex(r => r.label === a);
  const to = b ? rows.findIndex(r => r.label === b) : (h.includes("-") ? rows.length - 1 : from);
  return rows.map((_, i) => i >= from && i <= to);
}

// ---------- Generated images ----------
const cache = path.join(path.dirname(out), ".deck-assets");
fs.mkdirSync(cache, { recursive: true });
// Rule, icons and backgrounds never change between decks, so they are made once and kept with the kit.
// Rendered rules, icons and backgrounds are cached per brand, named by a hash of what drew them, so a changed brand never reuses old art.
const shared = path.join(here, "cache", "brand", B.id, "deck");
fs.mkdirSync(shared, { recursive: true });
const key = s => require("crypto").createHash("sha1").update(s).digest("hex").slice(0, 10);
async function png(name, svg, width) {
  const p = path.join(shared, name.replace(/\.png$/, `-${key(svg + width)}.png`));
  if (fs.existsSync(p)) return p;
  await sharp(Buffer.from(svg), { density: 300 }).resize({ width }).png().toFile(p);
  return p;
}
// The rule under a content slide's title, from the brand's ornaments (deckRule); it may differ by slide number.
async function ruleImage(n) {
  const W = Math.round(CW * 96);
  const r = B.ornaments.deckRule ? B.ornaments.deckRule({ width: W, n }, B) : null;
  if (!r) return null;
  return { path: await png("rule.png", r.svg, W * 3), h: r.height / 96 };  // drawn at 96 dpi
}
// Icons are drawn from the bundled Phosphor Light font, so no icon package is needed.
// Chromium starts only when something is missing from the cache.
let BROWSER;
const browser = async () => BROWSER || (BROWSER = await chromium.launch({ ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) }));
async function iconImage(name, hex) {
  const out = path.join(shared, `icon-${B.icons.weight}-${name}-${hex}.png`);
  if (fs.existsSync(out)) return out;
  const page = await (await browser()).newPage({ viewport: { width: 300, height: 300 } });
  const html = path.join(shared, `icon-${process.pid}.html`);
  fs.writeFileSync(html, `<link rel="stylesheet" href="file://${B.icons.css}">
    <body style="margin:0;background:transparent"><i id="i" class="${B.icons.cls} ph-${name}" style="font-size:256px;color:#${hex};display:block;width:256px;height:256px;line-height:256px"></i></body>`);
  await page.goto("file://" + html);
  await page.evaluate(() => document.fonts.ready);
  const known = await page.$eval("#i", e => getComputedStyle(e, "::before").content !== "none");
  if (!known) { console.warn(`[deck] no Phosphor icon "${name}"`); await page.close(); fs.rmSync(html, { force: true }); return null; }
  await (await page.$("#i")).screenshot({ path: out, omitBackground: true });
  await page.close(); fs.rmSync(html, { force: true });
  return out;
}
// The title slide's ground and the dark slides' ground, from the brand's ornaments (deckGrounds); plain role colours otherwise.
const GROUNDS = B.ornaments.deckGrounds ? B.ornaments.deckGrounds({}, B) : { title: B.color("prism-color-surface"), dark: B.color("prism-color-dark-surface") };
const WASH_CSS = GROUNDS.title, DARK_CSS = GROUNDS.dark;
const DARK_TITLE_CSS = GROUNDS.titleDark || DARK_CSS;
const WASH = path.join(shared, `wash-${key(WASH_CSS)}.png`), DARK = path.join(shared, `dark-${key(DARK_CSS)}.png`), DARK_TITLE = path.join(shared, `dark-title-${key(DARK_TITLE_CSS)}.png`);
async function backgrounds() {
  if ([WASH, DARK, DARK_TITLE].every(f => fs.existsSync(f))) return;
  const p = await (await browser()).newPage({ viewport: { width: 1920, height: 1080 } });
  const shot = async (css, name) => {
    await p.setContent(`<body style="margin:0"><div style="width:1920px;height:1080px;background:${css}"></div></body>`);
    await p.screenshot({ path: name });
  };
  await shot(WASH_CSS, WASH);
  await shot(DARK_CSS, DARK);
  if (DARK_TITLE !== DARK) await shot(DARK_TITLE_CSS, DARK_TITLE);
  await p.close();
}


// Paragraphs, lists and ### subheads as one text box. Each is its own PowerPoint paragraph; type shrinks as text grows.
function textBlocks(slide, blocks, box, maxSize = 20) {
  const parts = [];
  for (const b of blocks) {
    if (b.t === "Para" || b.t === "Plain") { if (!b.c.some(x => x.t === "Image")) parts.push({ r: runs(b.c) }); }
    else if (b.t === "Header" && b.c[0] >= 3) parts.push({ r: runs(b.c[2]).map(x => ({ ...x, options: { ...x.options, bold: true, color: C.ink, fontFace: F.serif } })), head: true });
    else if (b.t === "BulletList") b.c.forEach(it => parts.push({ r: runs(itemInlines(it)), bullet: true }));
    else if (b.t === "OrderedList") b.c[1].forEach(it => parts.push({ r: runs(itemInlines(it)), bullet: { type: "number" } }));
  }
  const chars = parts.reduce((a, p) => a + p.r.map(x => x.text).join("").length, 0);
  const area = box.w * box.h / (CW * 4.6);
  const size = Math.min(maxSize, chars * (1 / area) > 900 ? 12 : chars / area > 600 ? 14 : chars / area > 350 ? 16 : 20);
  const out = [];
  parts.forEach((p, i) => {
    const r = trimRuns(p.r);
    if (!r.length) return;
    if (p.head) r.forEach((x, k) => { r[k] = { ...x, options: { ...x.options, fontSize: Math.round(size * 1.3) } }; });
    if (p.bullet) r[0] = { ...r[0], options: { ...r[0].options, bullet: p.bullet === true ? { indent: 18 } : { type: "number", indent: 18 } } };
    r[r.length - 1].options = { ...r[r.length - 1].options, breakLine: i < parts.length - 1 };
    out.push(...r);
  });
  if (out.length) slide.addText(out, T({ ...box, fontSize: size, lineSpacingMultiple: 1.2, paraSpaceAfter: size * 0.6 }));
  if (out.length) checkFit("body text", parts.map(p => p.r.map(x => x.text).join("")).join("\n"), box.w - (parts.some(p => p.bullet) ? 0.3 : 0), box.h - parts.length * size * 0.6 / 72, size, 1.2);
}

// First image in a slide, from a figure or a paragraph: { src, classes }.
function findImage(blocks) {
  for (const b of blocks) {
    const inl = b.t === "Para" || b.t === "Plain" ? b.c : b.t === "Figure" ? (b.c[2][0] || {}).c || [] : [];
    const im = inl.find(x => x.t === "Image");
    if (im) return { src: B.src(im.c[2][0], path.dirname(md)), classes: im.c[0][1], focus: (im.c[0][2].find(([k]) => k === "focus") || [])[1] };
  }
  return null;
}

// Cover-crops a photo to its slide box and bakes the fade and rounded corners into solid pixels on the paper colour.
async function photoImage(img, wIn, hIn, fade, radiusIn = 0) {
  // The fade into the slide is a brand treatment (options.images.fade); a brand without it shows photos flat.
  if (!B.option("images.fade", false)) fade = null;
  if (!fs.existsSync(img.src)) { console.warn(`[deck] missing image: ${img.src}`); return null; }
  const W = Math.round(wIn * 200), H = Math.round(hIn * 200), R = Math.round(radiusIn * 200);
  const meta0 = await sharp(img.src).metadata();
  const need = Math.min(meta0.width / W, meta0.height / H);
  if (need < 0.75) console.warn(`[deck] low resolution: ${path.basename(img.src)} is small for its slide area`);
  const layers = [];
  if (fade) {
    const [x1, y1, x2, y2] = fade === "right" ? [0, 0, 1, 0] : fade === "left" ? [1, 0, 0, 0] : [0, 0, 0, 1];
    const start = 0.5;
    let stops = `<stop offset="0" stop-color="#${C.paper}" stop-opacity="0"/><stop offset="${start}" stop-color="#${C.paper}" stop-opacity="0"/>`;
    for (let k = 1; k <= 10; k++) { const t = k / 10; stops += `<stop offset="${start + (1 - start) * t}" stop-color="#${C.paper}" stop-opacity="${(t * t * (3 - 2 * t)).toFixed(3)}"/>`; }
    layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`) });
  }
  if (R) layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path fill="#${C.paper}" fill-rule="evenodd" d="M0 0H${W}V${H}H0Z M${R} 0H${W - R}A${R} ${R} 0 0 1 ${W} ${R}V${H - R}A${R} ${R} 0 0 1 ${W - R} ${H}H${R}A${R} ${R} 0 0 1 0 ${H - R}V${R}A${R} ${R} 0 0 1 ${R} 0Z"/></svg>`) });
  // Cover crop centred on the focal point; without one, sharp's own centred cover crop.
  const focus = B.focus(img.src, img.focus), base = sharp(img.src);
  const out = path.join(cache, `photo-${path.basename(img.src).replace(/\W+/g, "-")}-${W}x${H}-${fade || "none"}${focus ? "-" + focus.match(/\d+/g).join("-") : ""}.jpg`);
  if (focus) base.extract(require("./focus.js").crop(meta0.width, meta0.height, W, H, focus));
  await base.resize(W, H, { fit: "cover" }).composite(layers).flatten({ background: "#" + C.paper }).jpeg({ quality: 88 }).toFile(out);
  return out;
}

// ---------- Fit check ----------
// Rough text-fit estimate (average glyph width about half the point size), so overflow is reported without rendering the deck.
let SLIDE_N = 0, KIND = "";
const OVERFLOWS = [];
function fits(text, wIn, hIn, pt, lineMul = 1.2, serif = false) {
  const perLine = Math.max(1, Math.floor(wIn * 72 / (pt * (serif ? 0.53 : 0.5))));
  const lines = String(text).split("\n").reduce((a, t) => a + Math.max(1, Math.ceil(t.length / perLine)), 0);
  return lines * pt * lineMul / 72 <= hIn * 1.02;
}
function checkFit(what, text, wIn, hIn, pt, lineMul, serif) {
  if (!fits(text, wIn, hIn, pt, lineMul, serif)) OVERFLOWS.push(`slide ${SLIDE_N} (${KIND}): ${what} may not fit; shorten it`);
}
const textOf = r => (Array.isArray(r) ? r : [r]).map(x => typeof x === "string" ? x : x.text || "").join("");

// ---------- Slide pieces ----------
const T = o => ({ isTextBox: true, margin: 0, valign: "top", fontFace: F.sans, color: C.body, ...o });
let RULES = {};
// Media slides skip the brand rule when its profile says so (skip: media-slide): it would sit right above a photo.
const SKIP_MEDIA = ORN_RULES.some(r => r.skip === "media-slide");
function heading(slide, blocks, rule = true) {
  const h = blocks.find(b => b.t === "Header");
  if (!h) return;
  slide.addText(runs(h.c[2], {}, false, true), T({ x: MX, y: 0.55, w: CW, h: 0.75, fontFace: F.serif, fontSize: 30, bold: true, color: C.ink, valign: "bottom" }));
  checkFit("heading", plain(h.c[2]), CW, 0.75, 30, 1.2, true);
  const R = rule && RULES[SLIDE_N];
  if (R) slide.addImage({ path: R.path, x: MX, y: 1.38, w: CW, h: R.h });
  else slide.addShape("line", { x: MX, y: 1.55, w: CW, h: 0, line: { color: C.line, width: 0.75 } });
}
function footer(slide, n) {
  slide.addText(meta.footer ? plain(meta.footer) : B.name, T({ x: MX, y: 6.95, w: 8, h: 0.25, fontFace: F.mono, fontSize: 9, color: C.muted, charSpacing: 1 }));
  slide.addText(String(n).padStart(2, "0"), T({ x: SW - MX - 1, y: 6.95, w: 1, h: 0.25, fontFace: F.mono, fontSize: 9, color: C.muted, align: "right" }));
}
const paras = blocks => blocks.filter(b => b.t === "Para" && !(b.c.length === 1 && b.c[0].t === "Span"));

async function chartSlide(slide, blocks) {
  const cb = blocks.find(b => b.t === "CodeBlock" && b.c[0][1].includes("chart"));
  const { spec, rows } = parseChart(cb.c[1]);
  const box = { x: MX, y: 1.85, w: 7.7, h: 4.55 };
  const axis = { catAxisLabelFontFace: F.mono, catAxisLabelFontSize: 11, catAxisLabelColor: C.body,
    valAxisLabelFontFace: F.mono, valAxisLabelFontSize: 10, valAxisLabelColor: C.muted,
    valGridLine: { color: C.grid, size: 0.75 }, catGridLine: { style: "none" },
    catAxisLineShow: true, catAxisLineColor: C.axis, valAxisLineShow: false };
  if (spec.type === "bar" || spec.type === "hbar") {
    // Two stacked series so highlighted and muted bars can differ in colour; zeros are hidden.
    const hl = highlighted(spec, rows), labels = rows.map(r => r.label);
    const data = [
      { name: "Other", labels, values: rows.map((r, i) => hl[i] ? 0 : r.vals[0].n) },
      { name: "Highlight", labels, values: rows.map((r, i) => hl[i] ? r.vals[0].n : 0) }];
    slide.addChart("bar", data, { ...box, ...axis, barDir: spec.type === "hbar" ? "bar" : "col", barGrouping: "stacked",
      chartColors: [C.muteBar, C.accent], barGapWidthPct: 55, showLegend: false,
      showValue: true, dataLabelPosition: "inEnd", dataLabelColor: "FFFFFF", dataLabelFontFace: F.sans,
      dataLabelFontSize: 12, dataLabelFontBold: true, dataLabelFormatCode: "0.0;;;",
      valAxisMaxVal: spec.max ? +spec.max : undefined });
  } else if (spec.type === "line") {
    const names = spec.series ? spec.series.split(",").map(s => s.trim()) : ["Value"];
    if (names.length > 1) needSeries(names.length);
    const data = names.map((n, j) => ({ name: n, labels: rows.map(r => r.label), values: rows.map(r => (r.vals[j] || {}).n) }));
    slide.addChart("line", data, { ...box, ...axis, chartColors: SERIES, lineSize: 2, lineDataSymbol: "circle",
      lineDataSymbolSize: 7, showLegend: names.length > 1, legendPos: "b", legendFontFace: F.sans, legendFontSize: 12, legendColor: C.body });
  } else if (spec.type === "donut") {
    needSeries(rows.length);
    const d = { x: MX, y: 1.95, w: 4.3, h: 4.3 };
    slide.addChart("doughnut", [{ name: "Share", labels: rows.map(r => r.label), values: rows.map(r => r.vals[0].n) }],
      { ...d, holeSize: 60, chartColors: SERIES, showLegend: false, showValue: false, showPercent: false, dataLabelFontFace: F.sans, dataBorder: { pt: 1.5, color: C.paper } });
    if (spec.center) slide.addText(spec.center.split("|")[0].trim(), T({ ...d, fontFace: F.serif, fontSize: 36, bold: true, color: C.ink, align: "center", valign: "middle" }));
    const unit = spec.unit ? (spec.unit.startsWith("%") ? spec.unit : " " + spec.unit) : "";
    rows.forEach((r, i) => {
      const y = 2.55 + i * 0.62;
      slide.addShape("roundRect", { x: 5.3, y: y + 0.07, w: 0.2, h: 0.2, rectRadius: 0.04, fill: { color: SERIES[i] }, line: { color: SERIES[i] } });
      slide.addText(r.label, T({ x: 5.65, y, w: 2.2, h: 0.35, fontSize: 14, color: C.ink }));
      slide.addText(r.vals[0].s + unit, T({ x: 7.7, y, w: 0.9, h: 0.35, fontSize: 14, bold: true, color: C.ink, align: "right" }));
      slide.addShape("line", { x: 5.3, y: y + 0.45, w: 3.3, h: 0, line: { color: C.line, width: 0.75 } });
    });
  }
  const mark = spec.marker && (spec.type === "bar" || spec.type === "line") ? `  ·  ${spec.marker.split("|")[1] ? spec.marker.split("|")[1].trim() + ": " : ""}${spec.marker.split("|")[0].trim()}` : "";
  if (spec.caption) slide.addText(spec.caption + mark, T({ x: MX, y: 6.45, w: 7.7, h: 0.3, fontFace: F.mono, fontSize: 10, color: C.muted }));
  const p = paras(blocks);
  const r = p.flatMap((b, i) => { const x = runs(b.c); if (i < p.length - 1 && x.length) x[x.length - 1].options.breakLine = true; return x; });
  if (r.length) slide.addText(r,
    T({ x: 9.05, y: 2.4, w: SW - MX - 9.05, h: 3, fontSize: 20, lineSpacingMultiple: 1.2 }));
}

// ---------- Build ----------
(async () => {
  await backgrounds();
  for (let k = 1; k <= ast.blocks.filter(b => b.t === "Div" && b.c[0][1].includes("slide")).length; k++) RULES[k] = await ruleImage(k);
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = plain(meta.pagetitle || meta.title || []);
  pres.company = B.name;
  // Build stamp checked by verify.py.
  pres.subject = "Prism " + fs.readFileSync(path.join(here, "VERSION"), "utf8").trim();
  pres.theme = { headFontFace: F.serif, bodyFontFace: F.sans };

  const slides = ast.blocks.filter(b => b.t === "Div" && b.c[0][1].includes("slide"));
  let n = 0;
  for (const div of slides) {
    n++;
    const kind = div.c[0][1].find(c => c !== "slide") || "content";
    SLIDE_N = n; KIND = kind;
    const blocks = div.c[1].filter(b => !(b.t === "Div" && b.c[0][1].includes("notes")));
    const notes = div.c[1].find(b => b.t === "Div" && b.c[0][1].includes("notes"));
    const slide = pres.addSlide();
    slide.background = { color: C.paper };

    if (kind === "title") {
      const hero = meta.image ? await photoImage({ src: B.src(plain(meta.image), path.dirname(md)) }, 6.2, SH, "left") : null;
      // A brand may set its title slide on its dark ground (options.deck.title_dark): logo, eyebrow and text take the on-dark roles.
      const TD = B.option("deck.title_dark", false) && !hero;
      slide.background = hero ? { color: C.paper } : { path: TD ? DARK_TITLE : WASH };
      if (hero) slide.addImage({ path: hero, x: SW - 6.2, y: 0, w: 6.2, h: SH });
      // A brand without a logo for dark grounds gets a dark title slide without a logo, never its light-ground logo on dark.
      const logo = TD ? "prism-asset-logo-on-dark" : "prism-asset-logo";
      if (B.has(logo)) slide.addImage({ path: await B.raster(B.asset(logo), 2.58 * 300), altText: B.name, x: MX, y: 0.6, w: 2.58, h: 0.36 });
      else console.warn(`[deck] ${B.name} has no logo for dark grounds (prism-asset-logo-on-dark): the title slide has no logo`);
      if (meta.eyebrow) slide.addText(plain(meta.eyebrow), T({ x: MX, y: 2.2, w: 9, h: 0.35, fontFace: F.mono, fontSize: 13, charSpacing: 1, ...(TD ? { color: C.eyebrowOnDark } : {}) }));
      // With a photo the text column is narrower, so the title steps down a size and the subtitle moves with it.
      slide.addText(runs(meta.title, {}, TD, true), T({ x: MX, y: 2.65, w: hero ? 5.9 : 9.5, h: hero ? 2.3 : 2.1, fontFace: F.serif, fontSize: hero ? 42 : 54, bold: true, color: TD ? C.inkOnDark : C.ink, lineSpacingMultiple: 0.95 }));
      if (meta.subtitle) slide.addText(runs(meta.subtitle, {}, TD), T({ x: MX, y: hero ? 5.1 : 4.95, w: hero ? 5.6 : 8.2, h: 1, fontSize: 20, lineSpacingMultiple: 1.25, ...(TD ? { color: C.onDark } : {}) }));
    } else if (kind === "closing") {
      slide.background = { path: DARK };
      const ps = blocks.filter(b => b.t === "Para");
      const eyebrow = ps.find(b => b.c.length === 1 && b.c[0].t === "Span");
      const body = ps.filter(b => b !== eyebrow);
      if (eyebrow) slide.addText(plain(eyebrow.c), T({ x: MX, y: 2.2, w: CW, h: 0.4, fontSize: 15, bold: true, color: C.eyebrowOnDark, align: "center" }));
      const h = blocks.find(b => b.t === "Header");
      if (h) slide.addText(runs(h.c[2], { color: "FFFFFF" }, true, true), T({ x: 2, y: 2.7, w: SW - 4, h: 1.5, fontFace: F.serif, fontSize: 44, bold: true, color: "FFFFFF", align: "center", valign: "middle" }));
      body.forEach((b, i) => slide.addText(runs(b.c, {}, true), T({ x: 2.5, y: 4.4 + i * 0.95, w: SW - 5, h: 0.9, fontSize: i === body.length - 1 ? 18 : 20, color: i === body.length - 1 ? "FFFFFF" : C.onDark, align: "center", lineSpacingMultiple: 1.2 })));
    } else if (kind === "quote") {
      const q = blocks.find(b => b.t === "BlockQuote");
      const ps = q.c.filter(b => b.t === "Para");
      const cite = ps.find(b => b.c.some(x => x.t === "Span"));
      const text = ps.filter(b => b !== cite);
      slide.addText(text.flatMap(b => runs(b.c, {}, false, true)), T({ x: 1.6, y: 2.1, w: SW - 3.2, h: 2.4, fontFace: F.serif, fontSize: 40, color: C.ink, align: "center", valign: "middle", lineSpacingMultiple: 1.1 }));
      if (cite) slide.addText(plain(cite.c).toUpperCase(), T({ x: 1.6, y: 4.75, w: SW - 3.2, h: 0.35, fontFace: F.mono, fontSize: 12, charSpacing: 3, align: "center" }));
      footer(slide, n);
    } else {
      heading(slide, blocks, !(SKIP_MEDIA && kind === "media") && !div.c[0][1].includes("no-rule"));
      const list = blocks.find(b => b.t === "BulletList" || b.t === "OrderedList");
      const items = list ? (list.t === "OrderedList" ? list.c[1] : list.c) : [];
      if (kind === "stats") {
        const w = CW / items.length;
        const longest = Math.max(...items.map(it => splitStrong(itemInlines(it)).head.length));
        const size = longest <= 5 ? 66 : longest <= 8 ? 50 : longest <= 12 ? 40 : 32;
        items.forEach((it, i) => {
          const { head, rest } = splitStrong(itemInlines(it));
          slide.addText(head, T({ x: MX + i * w, y: 2.3, w: w - 0.4, h: 1.2, fontFace: F.serif, fontSize: size, bold: true, color: C.accent, valign: "bottom" }));
          slide.addText(trimRuns(runs(rest)), T({ x: MX + i * w, y: 3.75, w: w - 0.6, h: 1.2, fontSize: 18, lineSpacingMultiple: 1.2 }));
          checkFit(`stat ${i + 1} label`, textOf(runs(rest)).trim(), w - 0.6, 1.2, 18);
        });
        slide.addShape("line", { x: MX, y: 5.35, w: CW, h: 0, line: { color: C.line, width: 0.75 } });
      } else if (kind === "features") {
        const gap = 0.3, w = (CW - gap * (items.length - 1)) / items.length;
        for (const [i, it] of items.entries()) {
          const inl = itemInlines(it), x = MX + i * (w + gap);
          const { head, rest } = splitStrong(inl);
          slide.addShape("roundRect", { x, y: 2.1, w, h: 3.7, rectRadius: 0.12, fill: { color: C.paper }, line: { color: C.line, width: 0.75 } });
          const ic = iconOf(inl) && await iconImage(iconOf(inl), C.ink);
          if (ic) slide.addImage({ path: ic, x: x + 0.4, y: 2.5, w: 0.55, h: 0.55 });
          // Title and body share one text box so a wrapped title pushes the body down.
          slide.addText([{ text: head, options: { fontFace: F.serif, fontSize: 21, bold: true, color: C.ink, breakLine: true, paraSpaceAfter: 8 } }, ...trimRuns(runs(rest))],
            T({ x: x + 0.4, y: 3.3, w: w - 0.8, h: 2.3, fontSize: 16, lineSpacingMultiple: 1.2 }));
          checkFit(`card ${i + 1}`, textOf(head) + "\n" + textOf(runs(rest)).trim(), w - 0.8, 2.3 - 0.15, 17);
        }
      } else if (kind === "steps") {
        // 3 to 5 steps on one line with a dot per step, so the slide reads as a workflow.
        const k = items.length, gap = k > 3 ? 0.3 : 0.45, w = (CW - gap * (k - 1)) / k;
        const hs = k > 4 ? 20 : k > 3 ? 22 : 26, bs = k > 3 ? 15 : 18;
        slide.addShape("line", { x: MX, y: 2.2, w: CW, h: 0, line: { color: C.line, width: 0.75 } });
        items.forEach((it, i) => {
          const x = MX + i * (w + gap), { head, rest } = splitStrong(itemInlines(it));
          slide.addShape("ellipse", { x: x - 0.01, y: 2.2 - 0.07, w: 0.14, h: 0.14, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });
          slide.addText(String(i + 1).padStart(2, "0"), T({ x, y: 2.45, w, h: 0.35, fontFace: F.mono, fontSize: 14, color: C.accent, charSpacing: 2 }));
          slide.addText(head, T({ x, y: 2.95, w, h: 0.6, fontFace: F.serif, fontSize: hs, bold: true, color: C.ink }));
          slide.addText(trimRuns(runs(rest)), T({ x, y: 3.7, w, h: 1.8, fontSize: bs, lineSpacingMultiple: 1.25 }));
          checkFit(`step ${i + 1} title`, textOf(head), w, 0.6, hs, 1.2, true);
          checkFit(`step ${i + 1} text`, textOf(runs(rest)).trim(), w, 1.8, bs, 1.25);
        });
      } else if (kind === "media") {
        const img = findImage(blocks), flip = div.c[0][1].includes("flip");
        // Box width follows the photo's shape: landscape 5.6in, square 4.75in, portrait 3.8in (all 4.75in tall).
        const md0 = img && fs.existsSync(img.src) ? await sharp(img.src).metadata() : { width: 4, height: 3 };
        const ratio = md0.width / md0.height, iw = ratio > 1.15 ? 5.6 : ratio < 0.87 ? 3.8 : 4.75;
        const ix = flip ? SW - MX - iw : MX, tx = flip ? MX : MX + iw + 0.5;
        const photo = img ? await photoImage(img, iw, 4.75, img.classes.includes("fade") ? (flip ? "left" : "right") : null, 0.14) : null;
        if (photo) slide.addImage({ path: photo, x: ix, y: 1.85, w: iw, h: 4.75 });
        textBlocks(slide, blocks.filter(b => b.t !== "Figure"), { x: tx, y: 2.0, w: CW - iw - 0.5, h: 4.5, valign: "middle" }, 18);
      } else if (kind === "chart") {
        await chartSlide(slide, blocks);
      } else {
        textBlocks(slide, blocks, { x: MX, y: 2.0, w: CW, h: 4.6 });
      }
      footer(slide, n);
    }
    if (notes) slide.addNotes(notes.c[1].map(b => plain(b.c || [])).join("\n\n"));
  }
  if (BROWSER) await BROWSER.close();
  for (const o of OVERFLOWS) console.warn(`[deck] ${o}`);
  // pptxgenjs writes Arial into some hidden chart labels; swap it for the brand font so nothing off-brand appears if they are switched on.
  const JSZip = require(require.resolve("jszip", { paths: [path.dirname(require.resolve("pptxgenjs"))] }));
  const zip = await JSZip.loadAsync(await pres.write({ outputType: "nodebuffer" }));
  for (const n of Object.keys(zip.files).filter(n => /^ppt\/charts\/.+\.xml$/.test(n)))
    zip.file(n, (await zip.file(n).async("string")).replace(/typeface="Arial"/g, `typeface="${F.sans}"`));
  fs.writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("wrote " + out);
})();
