#!/usr/bin/env node
// Device mockups (core, brand-free): a phone, tablet or laptop frame with a screenshot in its screen.
// One drawing serves every output: inline SVG over the picture in sheets and posts (vector in the PDF), a framed PNG
// with a transparent ground in decks, and the frame's markup for Motion films.
// Usage: node devices.js render SHOT OUT.png --device phone|tablet|laptop [--tone dark|light] [--landscape] [--focus "50% 0%"] [--width PX]
//        node devices.js html SHOT --device phone [--tone light] [--landscape] [--alt TEXT] [--focus "x% y%"]
//        node devices.js svg --device laptop [--tone light] [--landscape]
//        node devices.js list
const fs = require("fs"), path = require("path");

const DEVICES = ["phone", "tablet", "laptop"];
const TONES = {
  dark: { edge: "#4A4D55", body: "#1F2025", bezel: "#0A0A0C", base: "#2C2E34", shade: "#17181C", button: "#34363C", lens: "#1C2230" },
  light: { edge: "#B9BDC3", body: "#E2E4E8", bezel: "#0A0A0C", base: "#D3D6DB", shade: "#A3A7AE", button: "#C7CACF", lens: "#1C2230" },
};
// Screenshots usually matter most at the top (the app bar, the page's heading), so the crop keeps the top unless told otherwise.
const SHOT_FOCUS = "50% 0%";

// A rounded rectangle as a path, corners [top-left, top-right, bottom-right, bottom-left].
function rr(x, y, w, h, r) {
  const [a, b, c, d] = Array.isArray(r) ? r : [r, r, r, r];
  return `M${x + a} ${y}H${x + w - b}${b ? `A${b} ${b} 0 0 1 ${x + w} ${y + b}` : ""}V${y + h - c}${c ? `A${c} ${c} 0 0 1 ${x + w - c} ${y + h}` : ""}`
    + `H${x + d}${d ? `A${d} ${d} 0 0 1 ${x} ${y + h - d}` : ""}V${y + a}${a ? `A${a} ${a} 0 0 1 ${x + a} ${y}` : ""}Z`;
}
const ring = (outer, inner, fill) => `<path fill="${fill}" fill-rule="evenodd" d="${outer}${inner}"/>`;

// Portrait drawings in their own units; the screen is the hole the picture shows through.
function phone(c) {
  const p = 5, W = 420, H = 860, s = { x: p + 18, y: 18, w: 384, h: 824, r: 50 }, scr = rr(s.x, s.y, s.w, s.h, s.r);
  return { w: W + 2 * p, h: H, screen: s, svg: [
    // Side buttons first, so the body covers their inner half.
    `<path fill="${c.button}" d="${rr(0, 150, 8, 36, 3)}${rr(0, 214, 8, 70, 3)}${rr(0, 298, 8, 70, 3)}${rr(W + 2 * p - 8, 236, 8, 108, 3)}"/>`,
    ring(rr(p, 0, W, H, 68), scr, c.edge), ring(rr(p + 3, 3, W - 6, H - 6, 65), scr, c.body), ring(rr(p + 8, 8, W - 16, H - 16, 60), scr, c.bezel),
    // The camera island sits over the top of the screen.
    `<path fill="#000" d="${rr(p + W / 2 - 58, 34, 116, 34, 17)}"/><circle cx="${p + W / 2 + 36}" cy="51" r="7" fill="${c.lens}"/>`,
  ].join("") };
}
function tablet(c) {
  const W = 1000, H = 1404, s = { x: 40, y: 40, w: 920, h: 1324, r: 22 }, scr = rr(s.x, s.y, s.w, s.h, s.r);
  return { w: W, h: H, screen: s, svg: [
    ring(rr(0, 0, W, H, 66), scr, c.edge), ring(rr(4, 4, W - 8, H - 8, 62), scr, c.body), ring(rr(12, 12, W - 24, H - 24, 54), scr, c.bezel),
    `<circle cx="${W / 2}" cy="22" r="6" fill="${c.lens}"/>`,
  ].join("") };
}
function laptop(c) {
  const W = 1720, LW = 1512, LH = 992, lx = (W - LW) / 2, s = { x: lx + 36, y: 40, w: 1440, h: 900, r: 6 }, scr = rr(s.x, s.y, s.w, s.h, s.r);
  return { w: W, h: 1036, screen: s, svg: [
    ring(rr(lx, 0, LW, LH, [34, 34, 6, 6]), scr, c.edge), ring(rr(lx + 4, 4, LW - 8, LH - 8, [30, 30, 4, 4]), scr, c.bezel),
    `<circle cx="${W / 2}" cy="20" r="6" fill="${c.lens}"/>`,
    // The hinge, then the base: wider than the lid, with the thumb scoop in the middle of its front edge.
    `<path fill="${c.shade}" d="${rr(lx + 6, LH, LW - 12, 8, 0)}"/>`,
    `<path fill="${c.base}" d="${rr(0, LH + 6, W, 30, [4, 4, 22, 22])}"/>`,
    `<path fill="${c.shade}" d="${rr(W / 2 - 120, LH + 6, 240, 10, [0, 0, 8, 8])}${rr(60, LH + 33, W - 120, 3, 1.5)}"/>`,
  ].join("") };
}
const DRAW = { phone, tablet, laptop };

// The device's drawing and screen rectangle. A landscape phone or tablet is the portrait one turned a quarter to the left.
function geometry(device, { tone = "dark", landscape = false } = {}) {
  if (!DRAW[device]) throw new Error(`device is one of ${DEVICES.join(", ")}, not "${device}"`);
  if (!TONES[tone]) throw new Error(`device tone is one of ${Object.keys(TONES).join(", ")}, not "${tone}"`);
  const g = DRAW[device](TONES[tone]);
  if (!landscape || device === "laptop") return { device, tone, landscape: false, ...g };
  const s = g.screen;
  return { device, tone, landscape: true, w: g.h, h: g.w, screen: { x: s.y, y: g.w - s.x - s.w, w: s.h, h: s.w, r: s.r },
    svg: `<g transform="translate(0 ${g.w}) rotate(-90)">${g.svg}</g>` };
}
const svg = (g, size = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}"${size}>${g.svg}</svg>`;
const ratio = g => g.w / g.h;

// A framed PNG on a transparent ground: the screenshot cover-cropped into the screen (top kept), the frame over it.
async function render(shot, out, { device, tone, landscape, focus, width } = {}) {
  const sharp = require("sharp");
  const g = geometry(device, { tone, landscape }), m = await sharp(shot).metadata();
  // Wide enough that the screen shows the screenshot at its own size, within reason.
  const seen = require("./focus.js").crop(m.width, m.height, g.screen.w, g.screen.h, focus || SHOT_FOCUS).width;
  const W = Math.round(width || Math.min(3200, Math.max(900, seen * g.w / g.screen.w))), k = W / g.w, H = Math.round(g.h * k);
  const s = { x: Math.round(g.screen.x * k), y: Math.round(g.screen.y * k), w: Math.round(g.screen.w * k), h: Math.round(g.screen.h * k), r: Math.round(g.screen.r * k) };
  const crop = require("./focus.js").crop(m.width, m.height, s.w, s.h, focus || SHOT_FOCUS);
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}"><path d="${rr(0, 0, s.w, s.h, s.r)}"/></svg>`);
  const screen = await sharp(shot).extract(crop).resize(s.w, s.h, { fit: "fill" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const frame = Buffer.from(svg(g, ` width="${W}" height="${H}"`));
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: screen, left: s.x, top: s.y }, { input: frame, left: 0, top: 0 }]).png().toFile(out);
  return { path: out, width: W, height: H, ratio: W / H };
}

// Markup for a page: the picture in the screen (it keeps its focal-point crop) and the frame drawn over it as vector.
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const pct = (v, of) => `${+(v / of * 100).toFixed(4)}%`;
function html(src, { device, tone, landscape, alt = "", focus } = {}) {
  const g = geometry(device, { tone, landscape }), s = g.screen;
  const place = `left:${pct(s.x, g.w)};top:${pct(s.y, g.h)};width:${pct(s.w, g.w)};height:${pct(s.h, g.h)};border-radius:${pct(s.r, s.w)} / ${pct(s.r, s.h)}`;
  return `<span class="prism-device prism-device--${g.device}${g.landscape ? " is-landscape" : ""} tone-${g.tone}" style="aspect-ratio:${g.w} / ${g.h}" data-ratio="${ratio(g).toFixed(4)}">`
    + `<img class="prism-device__screen" src="${esc(src)}" alt="${esc(alt)}" data-focus="${esc(focus || SHOT_FOCUS)}" style="${place}">`
    + `<svg class="prism-device__frame" viewBox="0 0 ${g.w} ${g.h}" aria-hidden="true">${g.svg}</svg></span>`;
}

module.exports = { DEVICES, TONES, SHOT_FOCUS, geometry, svg, render, html, ratio };

if (require.main === module) {
  const a = process.argv.slice(2), cmd = a[0];
  const opt = n => { const i = a.indexOf("--" + n); return i > -1 ? a[i + 1] : undefined; };
  const o = { device: opt("device"), tone: opt("tone") || "dark", landscape: a.includes("--landscape"), focus: opt("focus"), alt: opt("alt") || "", width: opt("width") && Number(opt("width")) };
  const die = m => { console.error(`[devices] ${m}`); process.exit(1); };
  try {
    if (cmd === "list") { for (const d of DEVICES) { const g = geometry(d); console.log(`${d}: ${g.w}×${g.h}, screen ${g.screen.w}×${g.screen.h}${d === "laptop" ? "" : " (--landscape turns it)"}`); } console.log(`tones: ${Object.keys(TONES).join(", ")}`); }
    else if (cmd === "svg") process.stdout.write(svg(geometry(o.device, o)));
    else if (cmd === "html") { if (!a[1]) die("html needs the screenshot"); process.stdout.write(html(a[1], o)); }
    else if (cmd === "render") {
      if (!a[1] || !a[2] || !fs.existsSync(a[1])) die(`render SHOT OUT.png --device ${DEVICES.join("|")}: ${a[1] ? `no file ${a[1]}` : "name the screenshot and the PNG to write"}`);
      render(a[1], a[2], o).then(r => console.log(`wrote ${r.path} (${r.width}×${r.height})`)).catch(e => die(e.message));
    } else die(`usage: devices.js list | svg --device D | html SHOT --device D | render SHOT OUT.png --device D (D: ${DEVICES.join(", ")}; --tone dark|light, --landscape)`);
  } catch (e) { die(e.message); }
}
