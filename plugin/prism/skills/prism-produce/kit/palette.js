#!/usr/bin/env node
// Core rules for email and Office palettes (D8): checks any palette against the Outlook model, and proposes one from a brand's tokens.
// Usage: palette.js <brand>   prints the brand's palette (reviewed or proposed), its Outlook colours and every check.
const { text: flip, background: bgOf, oklch, CLIENT_RULES } = require("./outlook-sim.js");

const lum = h => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = [1, 3, 5].map(i => f(parseInt(h.slice(i, i + 2), 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hue = h => (oklch(h)[2] * 180 / Math.PI + 360) % 360;
const TEXT = ["ink", "body", "muted", "accent"], MIN = 4.5, DRIFT = 20;

// Every check on a light palette: contrast in light, contrast after Outlook's dark mode, surfaces, accent drift, button.
function check(p) {
  const out = [], f = (id, ok, msg) => out.push({ id, ok, msg });
  for (const s of ["page", "card"]) f(`surface-${s}`, p[s].toUpperCase() === "#FFFFFF", `${s} ${p[s]} is ${p[s].toUpperCase() === "#FFFFFF" ? "pure white" : "not pure white, so Outlook turns it mid grey instead of its dark canvas"}`);
  // What core places on each ground: every text colour on the card; on the tint, ink and body at any size and the accent only in large
  // headings (3:1 is the large-text standard). Small labels on the tint take the body colour, and muted text never sits there.
  const uses = { card: TEXT.map(k => [k, MIN]), tint: [["ink", MIN], ["body", MIN], ["accent", 3]] };
  for (const [ground, list] of Object.entries(uses)) for (const [k, min] of list) {
    const big = min < MIN ? " (large text)" : "";
    const c = contrast(p[k], p[ground]); f(`light-${k}-${ground}`, c >= min, `${k} on ${ground} in light${big}: ${c.toFixed(2)}:1`);
    const t = flip(p[k]), g = bgOf(p[ground]), d = contrast(t, g);
    f(`outlook-${k}-${ground}`, d >= min, `${k} on ${ground} in Outlook dark${big}: ${p[k]} -> ${t} on ${g}, ${d.toFixed(2)}:1`);
  }
  const drift = Math.abs(((hue(flip(p.accent)) - hue(p.accent) + 540) % 360) - 180);
  f("accent-drift", drift <= DRIFT, `accent turns ${drift.toFixed(0)} degrees in Outlook dark (limit ${DRIFT})`);
  const bl = contrast(p.buttonText, p.button), bd = contrast(flip(p.buttonText), bgOf(p.button));
  f("button-light", bl >= MIN, `button text in light: ${bl.toFixed(2)}:1`);
  f("button-outlook", bd >= MIN, `button text in Outlook dark: ${bd.toFixed(2)}:1`);
  return out;
}

// A starting palette from the brand's roles: white surfaces, text kept where it already passes, the accent darkened until it passes.
function propose(color) {
  const { hexOf } = require("./outlook-sim.js"), white = "#FFFFFF";
  const fit = (hex) => {
    let [L, C, h] = oklch(hex);
    for (let i = 0; i < 80; i++) {
      const c = hexOf(L, C, h), cand = { page: white, card: white, tint: color("prism-color-tint"), ink: c, body: c, muted: c, accent: c, button: c, buttonText: white };
      if (check(cand).filter(r => /^(light|outlook)-ink-/.test(r.id)).every(r => r.ok)) return c;
      L -= 0.01; C *= 0.97;
    }
    return hexOf(L, C, h);
  };
  const light = { page: white, card: white, tint: color("prism-color-tint"), ink: fit(color("prism-color-text-strong")), body: fit(color("prism-color-text")),
    muted: fit(color("prism-color-text-muted")), accent: fit(color("prism-color-accent")), accentFill: color("prism-color-accent"),
    hair: color("prism-color-rule-soft"), button: color("prism-color-accent"), buttonText: white };
  // The dark palette (for clients that run the email's own dark CSS) is set to Outlook's result, so the email looks alike everywhere.
  const dark = { page: bgOf(white), card: bgOf(white), tint: bgOf(light.tint), ink: flip(light.ink), body: flip(light.body), muted: flip(light.muted),
    accent: flip(light.accent), accentFill: light.accentFill, hair: bgOf(light.hair), button: light.button, buttonText: white };
  return { light, dark };
}

// The palette a build uses: the profile's reviewed one, else core's proposal; with the reasons it counts as unreviewed.
function forBrand(B) {
  const m = B.res.m365 && B.res.m365.email, why = [];
  if (!m || !m.palette) return { ...propose(B.color), fonts: m ? m.fonts : null, logoWidth: m ? m.logo_width : undefined, reviewed: false, why: ["no reviewed email palette in the profile; using core's proposal"] };
  for (const [r, v] of Object.entries(m.source_roles || {})) { const now = B.color(r); if (now.toUpperCase() !== v.toUpperCase()) why.push(`${r} changed from ${v} to ${now} since the palette was reviewed`); }
  if (m.client_rules !== CLIENT_RULES) why.push(`client rules changed (${m.client_rules} -> ${CLIENT_RULES}) since the palette was reviewed`);
  return { ...m.palette, fonts: m.fonts, logoWidth: m.logo_width, reviewed: !why.length && !!m.reviewed, why: m.reviewed ? why : ["the profile's email palette is not marked reviewed", ...why], departures: m.departures || [] };
}

module.exports = { check, propose, forBrand, contrast };

if (require.main === module) {
  const B = require("./brand.js")(null, process.argv[2] || "case-amplify"), P = forBrand(B);
  console.log(`${B.name} email palette: ${P.reviewed ? "reviewed" : "UNREVIEWED"}${P.why.length ? "\n  " + P.why.join("\n  ") : ""}`);
  for (const [k, v] of Object.entries(P.light)) console.log(`  ${k.padEnd(10)} ${v}   Outlook dark ${["page", "card", "tint", "hair", "button", "accentFill"].includes(k) ? bgOf(v) : flip(v)}`);
  for (const r of check(P.light)) console.log(`${r.ok ? "  ok  " : "  FAIL"} ${r.msg}${!r.ok && (P.departures || []).some(d => d.id === r.id) ? " (approved departure)" : ""}`);
}
