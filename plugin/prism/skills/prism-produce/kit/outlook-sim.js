// Simulates Outlook's dark mode on an email, for previews. Calibrated from screenshots of the swatch test
// (dark-mode-calibration.html) in Outlook, October 2026. Outlook ignores the email's <style> block when HTML is
// pasted, so the simulation drops it and recolours inline colours only:
//  - backgrounds: pure #FFFFFF becomes Outlook's own canvas (#292929); every other background keeps its hue and
//    chroma and moves to a mid lightness (about L 0.46 in OKLCH), whether it started light or dark;
//  - text: colours darker than about L 0.62 flip (L -> 1.06 - 0.58 L), keep about 80% of their chroma and turn about
//    14 degrees toward magenta (so a purple accent becomes pink); lighter text is left as it is;
//  - borders: light borders go dark (about L 0.38); mid and saturated ones are kept.
// Images are never recoloured. Results are approximate (within a few steps of lightness on the calibration set).
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255); };
function oklch(hex) {
  const [r, g, b] = [1, 3, 5].map(i => toLin(parseInt(hex.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}
function rgbOf(L, C, h) {
  const A = C * Math.cos(h), B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
// Back to sRGB, reducing chroma until the colour fits (what a screen can show).
function hexOf(L, C, h) {
  let c = C, v = rgbOf(L, c, h);
  while (c > 0 && v.some(x => x < -0.001 || x > 1.001)) { c -= 0.005; v = rgbOf(L, Math.max(c, 0), h); }
  return "#" + v.map(toSrgb).map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
const norm = h => { h = h.trim().toUpperCase(); return h.length === 4 ? "#" + [...h.slice(1)].map(x => x + x).join("") : h; };

function background(hex) {
  hex = norm(hex);
  if (hex === "#FFFFFF") return "#292929";
  const [L, C, h] = oklch(hex);
  return hexOf(0.455 + Math.min(C, 0.25) * 0.15, C, h);
}
function text(hex) {
  const [L, C, h] = oklch(norm(hex));
  // Flipped text keeps about 80% of its chroma, and coloured text turns about 14 degrees toward magenta.
  return L < 0.62 ? hexOf(1.06 - 0.58 * L, C * 0.8, h + (14 * Math.PI / 180) * Math.min(1, C / 0.05)) : norm(hex);
}
function border(hex) {
  const [L, C, h] = oklch(norm(hex));
  return L > 0.8 ? hexOf(0.38, C, h) : C > 0.12 ? norm(hex) : hexOf(0.455, C, h);
}

// Recolour an email's HTML: drop <style> (and the head-only overrides in it), recolour inline colours and bgcolor.
function simulate(html) {
  const HEX = "#[0-9A-Fa-f]{6}\\b|#[0-9A-Fa-f]{3}\\b";
  const fix = style => style
    .replace(new RegExp(`(background(?:-color)?\\s*:\\s*)(${HEX})`, "g"), (m, k, c) => k + background(c))
    .replace(new RegExp(`(linear-gradient\\()(${HEX})(,\\s*)(${HEX})`, "g"), (m, k, a, s, b) => k + background(a) + s + background(b))
    .replace(new RegExp(`((?:^|;)\\s*color\\s*:\\s*)(${HEX})`, "g"), (m, k, c) => k + text(c))
    .replace(new RegExp(`(border(?:-[a-z]+)?\\s*:[^;]*?)(${HEX})`, "g"), (m, k, c) => k + border(c));
  return html
    .replace(/<style>[\s\S]*?<\/style>/g, "")
    .replace(/style="([^"]*)"/g, (m, s) => `style="${fix(s)}"`)
    .replace(/bgcolor="(#[0-9A-Fa-f]{3,6})"/g, (m, c) => `bgcolor="${background(c)}"`)
    .replace(/<body([^>]*)>/, '<body$1><div style="background:#292929">')
    .replace(/<\/body>/, "</div></body>");
}
// The version of these client rules; a reviewed palette records it, and a change flags the palette for re-review.
const CLIENT_RULES = "outlook-2026-10";
module.exports = { simulate, background, text, border, oklch, hexOf, CLIENT_RULES };
