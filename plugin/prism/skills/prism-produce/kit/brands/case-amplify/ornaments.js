// Case Amplify's ornaments: everything a Prism builder draws in this brand. Core calls these by place; a missing one means none.
// Every function takes (ctx, B), B being the brand (brand.js), and returns SVG or CSS. The wave itself is the design system's
// wave-core.js, with parameters and placement rules from the profile (prism-generator-rule).
const wave = B => { const G = B.role("prism-generator-rule"); require(G.script); return G; };

// A grey wave burst of the brand's own shape, w px wide, for design mode.
function lofiWave(B, w) {
  const G = wave(B), P = G.params.default, H = 24, base = H / 2, s = w / P.span;
  const all = Wave.samples(0, w, base, { wavelength: P.wavelength * s, amplitude: Math.min(P.amplitude * s, 9), focus: P.focus * s, edge: P.edge * s, cx: w / 2 });
  // About 24 points is plenty at this size and keeps boards small to publish and read back.
  const k = Math.max(1, Math.floor(all.length / 24)), pts = all.filter((p, i) => i % k === 0 || i === all.length - 1);
  return `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" aria-hidden="true" style="flex: 0 0 auto"><path d="M${pts.map(p => p.map(v => Math.round(v * 10) / 10).join(",")).join("L")}" fill="none" stroke="#9A9AA2" stroke-width="2" stroke-linejoin="round"></path></svg>`;
}

module.exports = {
  // Carousel: one wave line across every panel, one burst per panel at its `burst` position; it turns lilac where the dark panel starts.
  thread({ W, H, panels, darkLeft }, B) {
    const G = wave(B), P = G.params.default, y = H - 250, s = 3;
    let d = `M0,${y}`;
    for (const p of panels) {
      const cx = p.left + p.width * p.burst, half = P.span / 2 * s;
      const pts = Wave.samples(cx - half, half * 2, y, { wavelength: P.wavelength * s, amplitude: P.amplitude * s, focus: P.focus * s, edge: P.edge * s, cx });
      d += " L" + Wave.toPath(pts, true);
    }
    d += ` L${W},${y}`;
    const edge = darkLeft == null ? W : darkLeft;
    return `<svg class="prism-thread" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs><linearGradient id="thr" gradientUnits="userSpaceOnUse" x1="${edge - 1}" x2="${edge + 1}" y1="0" y2="0">
      <stop offset="0" stop-color="${B.color("prism-color-rule")}"/><stop offset="1" stop-color="${B.color("prism-color-rule", "dark")}"/></linearGradient></defs>
      <path d="${d}" fill="none" stroke="url(#thr)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  },

  // Email divider: a wave stop burst centred in the content width, in the light or dark ink.
  divider({ width, theme }, B) {
    const G = wave(B), P = G.params["email-divider"], w = width;
    const pts = Wave.samples(w / 2 - P.span / 2, P.span, 20, { wavelength: P.wavelength, amplitude: P.amplitude, focus: P.focus, edge: P.edge, cx: w / 2 });
    const d = `M0,20 L${Wave.toPath(pts, true)} L${w},20`;
    return `<svg width="${w}" height="40" viewBox="0 0 ${w} 40"><path d="${d}" fill="none" stroke="${B.color("prism-color-rule", theme)}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  },
  dividerHeight: 40,

  // Deck: the wave under a content slide's title (drawn W x 34 at 96 dpi; the builder sizes it to the content width).
  deckRule({ width }, B) {
    const G = wave(B), W = width, H = 34, base = H / 2, s = 0.62, cx = 72, P = G.params.default;
    const pts = Wave.samples(cx - P.span / 2 * s, P.span * s, base, { wavelength: P.wavelength * s, amplitude: P.amplitude * s, focus: P.focus * s, edge: P.edge * s, cx });
    const d = `M0,${base}L` + Wave.toPath(pts, true) + `L${W},${base}`;
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="${B.color("prism-color-rule")}" stroke-width="${G.stroke.width}" stroke-linecap="round"/></svg>`, height: H };
  },
  // Deck: the title slide's wash and the dark slides' ground, as CSS backgrounds rendered at 1920x1080.
  deckGrounds(ctx, B) {
    const rgbA = (n, a) => { const h = B.color(n).slice(1); return `rgb(${[0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(" ")} / ${a})`; };
    return {
      title: `radial-gradient(75% 85% at 50% 0%,${B.color("prism-color-wash")} 0%,${B.color("prism-color-surface")} 100%)`,
      dark: `radial-gradient(55% 110% at 100% 100%,${rgbA("own-color-dark-glow", ".85")} 0%,${rgbA("own-color-dark-glow", "0")} 100%),
    radial-gradient(55% 110% at 0% 100%,${rgbA("own-color-dark-glow-2", ".85")} 0%,${rgbA("own-color-dark-glow-2", "0")} 100%),
    linear-gradient(180deg,${B.color("prism-color-dark-deep")} 0%,${B.color("prism-color-dark-surface")} 45%,${B.color("own-color-dark-high")} 100%)`,
    };
  },

  // Blog header art: a broad angled gradient and glow in a tone chosen by post type, and film grain. Draws from core's seeded
  // random numbers (rnd, pick, between) in a fixed order, so the same post always gets the same header.
  headerArt({ W, H, meta, pick, between }, B) {
    const TONES_BY_TYPE = {
      educational: ["light", "light", "mist"], insights: ["mist", "light", "deep"], features: ["deep", "deep", "vivid"],
      spontaneous: ["light", "mist", "deep", "vivid"], impact: ["deep", "vivid", "mist"], changelog: ["deep"],
    };
    const tone = meta.tone || pick(TONES_BY_TYPE[meta.type] || TONES_BY_TYPE.educational);
    const hdr = (t, i) => B.color(`prism-color-header-${t}-${i}`);
    const TONES = { stops: [1, 2, 3].map(i => hdr(tone, i)), deep: hdr(tone, 4) };
    const ang = between(0, 360), glowX = between(10, 90), glowY = pick([between(-30, 10), between(90, 130)]);
    const defs = `<linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="${W / 2 - Math.cos(ang * Math.PI / 180) * W * .6}" y1="${H / 2 - Math.sin(ang * Math.PI / 180) * H * .6}" x2="${W / 2 + Math.cos(ang * Math.PI / 180) * W * .6}" y2="${H / 2 + Math.sin(ang * Math.PI / 180) * H * .6}">
  <stop offset="0" stop-color="${TONES.stops[0]}"/><stop offset=".55" stop-color="${TONES.stops[1]}"/><stop offset="1" stop-color="${TONES.stops[2]}"/></linearGradient>
<radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="${W * glowX / 100}" cy="${H * glowY / 100}" r="${W * between(0.7, 1)}">
  <stop offset="0" stop-color="${TONES.deep}" stop-opacity=".75"/><stop offset="1" stop-color="${TONES.deep}" stop-opacity="0"/></radialGradient>`;
    const over = `<svg class="bh-grain" width="${W}" height="${H}"><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${Math.floor(between(1, 999))}"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .045 0"/></filter><rect width="${W}" height="${H}" filter="url(#grain)"/></svg>`;
    const under = `<svg class="bh-art" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#glow)"/></svg>`;
    return { under, over, classes: tone, dark: tone === "deep" || tone === "vivid" };
  },

  // Swatch sheet: the wave at three widths, each parameter set, and on dark.
  // Design mode (lo-fi, greys only): the section wave as a rule running from the heading to the edge with its burst at the end,
  // so a short heading shows a long rule as it will print; the dark closing card; the wave stop as the email divider.
  wire: {
    css: ".ca-dark{background:#4A4A52;border-style:solid;text-align:center}.ca-dark .wx,.ca-dark .wstrong{color:#F2F2F5}.ca-dark a.wlink{color:#F2F2F5}",
    heading(ctx, B) {
      return { after: `<span style="flex: 1 1 72px; min-width: 72px; display: flex; align-items: center"><span style="flex: 1; height: 1.5px; background: #B4B4BC"></span>${lofiWave(B, 110)}</span>` };
    },
    closing: () => "ca-dark",
    divider: (ctx, B) => `<div style="display: flex; justify-content: center">${lofiWave(B, 160)}</div>`,
  },

  preview(ctx, B) {
    const G = wave(B);
    const draw = (w, P, s, stroke) => { const H = 46, base = H / 2, cx = w * 0.7;
      const pts = Wave.samples(cx - P.span / 2 * s, P.span * s, base, { wavelength: P.wavelength * s, amplitude: P.amplitude * s, focus: P.focus * s, edge: P.edge * s, cx });
      return `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" style="display:block;max-width:100%"><path d="M0,${base}L${Wave.toPath(pts, true)}L${w},${base}" fill="none" stroke="${stroke}" stroke-width="${G.stroke.width}" stroke-linecap="round"/></svg>`; };
    const light = B.color(G.stroke.color), dark = B.color(G.stroke.color, "dark");
    return [
      ...[160, 320, 560].map(w => ({ place: "section heading", label: `wave opener · ${w}px`, svg: draw(w, G.params.default, 0.62, light) })),
      ...Object.entries(G.params).filter(([k]) => k !== "default").map(([k, P]) => ({ place: "email divider", label: `${k} · 560px`, svg: draw(560, P, 1, light) })),
      { place: "dark grounds", label: "wave on dark", dark: true, svg: draw(560, G.params.default, 0.62, dark) },
    ];
  },
};
