// Prism's ornaments: everything a builder draws in this brand, from the design system's spectrum-core.js and tokens.
// Every function takes (ctx, B) and returns SVG or CSS; core calls them by place. The spectrum is four flat bands, always red,
// amber, green, blue; numbered things take Spectrum.hueFor(n).
const path = require("path"), fs = require("fs");
const S = B => require(path.join(B.res.dir, "snapshot", "assets", "Spectrum", "spectrum-core.js"));
const tok = (B, n, t = "light") => B.res.native[n][t];
const hues = (B, t = "light") => ({ 1: tok(B, "hue-1", t), 2: tok(B, "hue-2", t), 3: tok(B, "hue-3", t), 4: tok(B, "hue-4", t), ink: tok(B, "fg", t) });
const file = (B, rel) => "file://" + path.join(B.res.dir, "snapshot", rel);

module.exports = {
  // Design mode (lo-fi, greys only): numbered sections with the rule under the heading, the closing card's band strip,
  // and the mini spectrum as four grey bands.
  wire: {
    css: ".pr-num{font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#8A8A93}.pr-close{border-style:solid;border-top:6px solid #A9A9B1}",
    heading: ({ n }) => ({ column: true, before: `<span class="pr-num">${String(n).padStart(2, "0")}</span>`, after: `<span style="display: block; height: 3px; background: #A9A9B1"></span>` }),
    closing: () => "pr-close",
    divider: () => `<div style="display: flex; justify-content: center; gap: 0"><span style="width: 12px; height: 4px; background: #8A8A93"></span><span style="width: 12px; height: 4px; background: #A9A9B1"></span><span style="width: 12px; height: 4px; background: #C4C4CA"></span><span style="width: 12px; height: 4px; background: #DCDCE0"></span></div>`,
  },

  // Carousel: one spectrum strip along the bottom safe line; on panel n the band of hueFor(n) widens 3x.
  thread({ W, H, panels }, B) {
    const Sp = S(B), h = 12, y = H - 250 - h / 2, pw = panels.length ? panels[0].width : W;
    const rects = Sp.thread(panels.length, pw, { height: h, y, emphasis: 3 });
    return `<svg class="prism-thread" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${Sp.rectsToSVG(rects, hues(B))}</svg>`;
  },

  // Email divider: the mini spectrum, 48x4, centred in the column.
  divider({ width, theme }, B) {
    const Sp = S(B), w = 48, h = 4, H = 20;
    return `<svg width="${width}" height="${H}" viewBox="0 0 ${width} ${H}">${Sp.rectsToSVG(Sp.bands({ x: (width - w) / 2, y: (H - h) / 2, width: w, height: h }), hues(B, theme))}</svg>`;
  },
  dividerHeight: 20,

  // Deck: a 3px rule under each content slide's title, in the hue of the slide's number.
  deckRule({ width, n }, B) {
    const Sp = S(B), c = hues(B)[Sp.hueFor(n)];
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="8" viewBox="0 0 ${width} 8"><rect y="2" width="${width}" height="3" fill="${c}"/></svg>`, height: 8 };
  },
  // Deck: content slides sit on the flat ground; dark slides on dark-deep to dark-card to dark-high from the top left;
  // the title slide (dark, options.deck.title_dark) on the same ground with the fan on the right third.
  deckGrounds(ctx, B) {
    const dark = `linear-gradient(135deg,${tok(B, "dark-deep")} 0%,${tok(B, "dark-card")} 55%,${tok(B, "dark-high")} 100%)`;
    // The fan is inlined as a data URI in single quotes: grounds are rendered in a blank page (no local files) inside a style attribute.
    const fan = fs.readFileSync(path.join(B.res.dir, "snapshot", "assets", "Spectrum", "fan-dark.svg"), "utf8").replace(/<rect[^>]*\/>/, "");
    return { title: tok(B, "bg"), dark, titleDark: `url('data:image/svg+xml,${encodeURIComponent(fan)}') right center / 60% auto no-repeat, ${dark}` };
  },

  // Blog header: a flat ground (light by default, deep for announcements and series), the fan on the right third.
  headerArt({ W, H, meta, pick }, B) {
    const deep = meta.tone === "deep" || meta.type === "changelog" || meta.type === "features" || !!meta.series;
    const tone = meta.tone === "light" ? "light" : deep ? "deep" : "light";
    const ground = tok(B, `header-${tone}-1`);
    const fan = fs.readFileSync(path.join(B.res.dir, "snapshot", "assets", "Spectrum", tone === "deep" ? "fan-dark.svg" : "fan-light.svg"), "utf8")
      .replace(/<svg[^>]*>/, `<svg class="bh-art" width="${W}" height="${H}" viewBox="0 0 1920 1080" preserveAspectRatio="xMaxYMid slice">`);
    const under = tone === "deep" ? fan : fan.replace(/(<svg[^>]*>)/, `$1<rect width="1920" height="1080" fill="${ground}"/>`);
    return { under, over: "", classes: `prism-${tone}`, dark: tone === "deep" };
  },

  // Swatch: every kind of the spectrum, light and dark.
  preview(ctx, B) {
    const Sp = S(B), out = [];
    const svg = (w, h, inner) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;max-width:100%">${inner}</svg>`;
    for (const t of ["light", "dark"]) {
      const c = hues(B, t), dark = t === "dark";
      out.push({ place: "page one and closing panel", label: `source band, 6px edge to edge · ${t}`, dark, svg: svg(560, 6, Sp.rectsToSVG(Sp.bands({ width: 560, height: 6 }), c)) });
      out.push({ place: "eyebrow lead-in", label: `chip 64x6 · ${t}`, dark, svg: svg(64, 6, Sp.rectsToSVG(Sp.bands({ width: 64, height: 6 }), c, 3)) });
      out.push({ place: "chapter break and email divider", label: `stop 96x6 · mini 48x4 · ${t}`, dark, svg: svg(168, 6, Sp.rectsToSVG(Sp.bands({ width: 96, height: 6 }), c) + Sp.rectsToSVG(Sp.bands({ x: 120, y: 1, width: 48, height: 4 }), c)) });
      out.push({ place: "section headings, slide titles", label: `3px rules by number, hueFor(1..5) · ${t}`, dark, svg: svg(560, 50, [1, 2, 3, 4, 5].map((n, i) => `<rect y="${i * 10}" width="560" height="3" fill="${c[Sp.hueFor(n)]}"/>`).join("")) });
      out.push({ place: "carousel", label: `thread across 3 panels, emphasis 3x · ${t}`, dark, svg: svg(540, 12, Sp.rectsToSVG(Sp.thread(3, 180, { height: 12 }), c)) });
    }
    out.push({ place: "blog headers, title slides", label: "fan · light", svg: fs.readFileSync(path.join(B.res.dir, "snapshot", "assets", "Spectrum", "fan-light.svg"), "utf8").replace(/<svg([^>]*)>/, '<svg$1 style="display:block;width:100%;height:auto;background:' + tok(B, "bg") + '">') });
    out.push({ place: "blog headers, title slides", label: "fan · dark", dark: true, svg: fs.readFileSync(path.join(B.res.dir, "snapshot", "assets", "Spectrum", "fan-dark.svg"), "utf8").replace(/<svg([^>]*)>/, '<svg$1 style="display:block;width:100%;height:auto">') });
    return out;
  },
};
