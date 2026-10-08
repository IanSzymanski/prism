#!/usr/bin/env node
// QR codes for the qr block, drawn as one SVG path so PDFs carry them as vector shapes.
// Usage: node qr.js "https://example.com/demo" prints the SVG (the Lua filter calls this).
const qrcode = require("./vendor/qrcode-generator/qrcode.js");
qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

const QUIET = 4;  // modules of blank margin every scanner expects around the code

// Smallest code that holds the text at level M (about 15% of the code can be damaged and still scan).
function encode(text, level = "M") {
  const q = qrcode(0, level);
  q.addData(String(text));
  q.make();
  const n = q.getModuleCount();
  return { n, dark: (r, c) => q.isDark(r, c) };
}

// Each row's runs of dark modules become one rectangle, so the path stays short.
function modules({ n, dark }, at = QUIET) {
  let d = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (!dark(r, c)) continue;
      let w = 1;
      while (c + w < n && dark(r, c + w)) w++;
      d += `M${c + at} ${r + at}h${w}v1h-${w}z`;
      c += w - 1;
    }
  return d;
}

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Black on white by default; sheets recolour the classes for bg="black" or "transparent". ground: null leaves it transparent.
function svg(text, { ground = "#fff", ink = "#000", level } = {}) {
  const code = encode(text, level), size = code.n + 2 * QUIET;
  return `<svg class="prism-qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code: ${esc(text)}" data-modules="${size}">` +
    (ground ? `<rect class="prism-qr__ground" width="${size}" height="${size}" fill="${ground}"/>` : "") +
    `<path class="prism-qr__modules" fill="${ink}" d="${modules(code)}"/></svg>`;
}

// Runs in the page after layout: modules printed under ~0.4 mm (print only, scale given) and contrast with what is behind the code.
function check(scale) {
  return [...document.querySelectorAll(".qr")].flatMap(q => {
    const u = q.querySelector("img.prism-qr");
    // An uploaded code is printed as it is; only its shape can be checked.
    if (u) return u.naturalWidth && Math.abs(u.naturalWidth / u.naturalHeight - 1) > 0.05 ? [`uploaded qr code ${u.getAttribute("src").split("/").pop()} isn't square: crop it to the code and its margin`] : [];
    const s = q.querySelector("svg.prism-qr"); if (!s) return [];
    const out = [], mm = s.getBoundingClientRect().width / 96 * scale * 25.4 / +s.dataset.modules;
    if (scale && mm < 0.4) out.push(`qr code for ${q.dataset.url} prints its modules at ${mm.toFixed(2)} mm (0.4 mm or more scans reliably): use a shorter address or {.qr .large}`);
    // Modules need strong contrast with what is behind them (the code's ground, or the page when transparent).
    const rgb = c => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number), lum = c => { const [r, g, b] = rgb(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const g = s.querySelector(".prism-qr__ground"), gf = g && getComputedStyle(g).fill;
    let ground = gf && gf !== "none" ? gf : null;
    for (let e = q; !ground && e; e = e.parentElement) { const st = getComputedStyle(e); if (st.backgroundImage !== "none") return out; if (!/rgba\(.*, 0\)|transparent/.test(st.backgroundColor)) ground = st.backgroundColor; }
    const r = ratio(getComputedStyle(s.querySelector(".prism-qr__modules")).fill, ground || "rgb(255, 255, 255)");
    if (r < 4) out.push(`qr code for ${q.dataset.url}: its modules are ${r.toFixed(1)}:1 against their ground (4:1 or more scans reliably): use bg="white" or bg="black"`);
    return out;
  });
}

module.exports = { encode, svg, check, QUIET };

if (require.main === module) {
  const text = process.argv[2];
  if (!text) { console.error("usage: node qr.js <text>"); process.exit(1); }
  process.stdout.write(svg(text));
}
