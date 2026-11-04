// The darkening over a photo-led cover (the scrim), baked into the photo by build-sheet.js. Every cover gets the same ramp: clear
// at the top, then smoothly darker to 90% from 15% to 75% of its height. On a light photo the ramp alone leaves the text near
// the top of the title block (the label, the first title line) too faint to read, so each piece of text over the photo gets as
// much darkening as it needs to reach 4.5:1 against the bright end of the photo behind it, eased in just above it. A photo dark
// enough for the ramp keeps the ramp exactly. It aims at 4.8:1, so the JPEG the photo is baked into and the print still clear
// 4.5:1.
const TARGET = 4.8, MAX = 0.95, ABOVE = 0.04, EASE = 0.12;

// Relative luminance and contrast ratio (WCAG 2), for sRGB colours as [r, g, b] 0-255.
function lum(rgb) {
  const ch = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(rgb[0]) + 0.7152 * ch(rgb[1]) + 0.0722 * ch(rgb[2]);
}
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

// The least darkening (0 to MAX) that gives text the target contrast with the photo colour under the scrim colour; MAX when none does.
function need(text, photo, scrim, target) {
  for (let a = 0; a <= MAX + 1e-9; a += 0.005) {
    const under = [0, 1, 2].map(k => (1 - a) * photo[k] + a * scrim[k]);
    if (contrast(text, under) >= (target || TARGET)) return Math.round(a * 1000) / 1000;
  }
  return MAX;
}

// The bright end of a block of RGBA pixels (98th percentile by luminance), so one stray highlight doesn't decide it.
function brightest(data) {
  const px = [];
  const step = Math.max(1, Math.floor(data.length / 4 / 40000)) * 4;
  for (let k = 0; k + 3 < data.length; k += step) px.push([data[k], data[k + 1], data[k + 2]]);
  if (!px.length) return null;
  const L = px.map(lum), order = L.map((_, k) => k).sort((a, b) => L[a] - L[b]);
  return px[order[Math.min(order.length - 1, Math.floor(order.length * 0.98))]];
}

// The ramp every cover gets, as the gradient's stops ([position, alpha]); positions and alphas computed as they always were.
const BASE = [[0, 0], [0.15, 0]];
for (let k = 1; k <= 10; k++) { const t = k / 10; BASE.push([0.15 + 0.6 * t, +(0.9 * t * t * (3 - 2 * t)).toFixed(3)]); }
BASE.push([1, 0.9]);
function baseAt(y) {
  for (let k = 1; k < BASE.length; k++) if (y <= BASE[k][0]) { const [p0, a0] = BASE[k - 1], [p1, a1] = BASE[k]; return a0 + (a1 - a0) * (y - p0) / (p1 - p0); }
  return BASE[BASE.length - 1][1];
}

// The stops for one cover. text: each piece of text over the photo, as { top (0-1 down the cover), alpha (the darkening it
// needs) }. The ramp's own stops when they already give every piece what it needs; else stops every 1% at the larger of the
// ramp and each piece's need, which reaches full strength a little above the piece and eases in over the 12% above that.
function stops(text) {
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const req = y => Math.max(0, ...text.map(p => p.alpha * ease((y - (p.top - ABOVE - EASE)) / EASE)));
  const grid = Array.from({ length: 101 }, (_, k) => k / 100);
  if (grid.every(y => req(y) <= baseAt(y) + 0.002)) return { stops: BASE, strengthened: false };
  return { stops: grid.map(y => [y, +Math.max(baseAt(y), req(y)).toFixed(3)]), strengthened: true };
}

// In the page: window.prismScrim.plan(ctx, scale, coverBox, scrimRgb, texts) reads the photo already drawn on ctx (a canvas at
// `scale` device pixels per CSS pixel) under each text's box and returns its stops and the contrast each text ends with.
function plan(ctx, scale, box, scrim, texts) {
  const parts = [];
  for (const t of texts) {
    const x0 = Math.max(t.box.left, box.left), x1 = Math.min(t.box.right, box.right), y0 = Math.max(t.box.top, box.top), y1 = Math.min(t.box.bottom, box.bottom);
    if (x1 - x0 < 1 || y1 - y0 < 1) continue;
    const m = /rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/.exec(t.color); if (!m) continue;
    const color = [+m[1], +m[2], +m[3]];
    const img = ctx.getImageData(Math.round((x0 - box.left) * scale), Math.round((y0 - box.top) * scale), Math.max(1, Math.round((x1 - x0) * scale)), Math.max(1, Math.round((y1 - y0) * scale)));
    const photo = brightest(img.data); if (!photo) continue;
    parts.push({ top: (y0 - box.top) / box.height, alpha: need(color, photo, scrim), color, photo });
  }
  const s = stops(parts);
  const at = y => { const g = s.stops; for (let k = 1; k < g.length; k++) if (y <= g[k][0]) { const [p0, a0] = g[k - 1], [p1, a1] = g[k]; return a0 + (a1 - a0) * (y - p0) / (p1 - p0); } return g[g.length - 1][1]; };
  const reached = parts.map(p => { const a = at(p.top); return +contrast(p.color, [0, 1, 2].map(k => (1 - a) * p.photo[k] + a * scrim[k])).toFixed(2); });
  return { ...s, reached };
}

const inPage = `window.prismScrim = (() => { const TARGET = ${TARGET}, MAX = ${MAX}, ABOVE = ${ABOVE}, EASE = ${EASE}; const BASE = ${JSON.stringify(BASE)};
${lum} ${contrast} ${need} ${brightest} ${baseAt} ${stops} ${plan}
return { plan }; })();`;

module.exports = { TARGET, BASE, lum, contrast, need, brightest, baseAt, stops, plan, inPage };
