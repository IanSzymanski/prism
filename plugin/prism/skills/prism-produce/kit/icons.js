// Swaps Phosphor font icons for inline SVG paths, so PDFs carry icons as vector shapes rather than font glyphs.
// Any PDF viewer then shows the icons without needing the icon font installed. The weight is the brand's (brand.js icons).
const fs = require("fs");
const CACHE = {};
module.exports = async function iconsToSvg(page, here, B) {
  const I = B.icons;
  const used = await page.evaluate(() => [...new Set([...document.querySelectorAll(".icon")]
    .flatMap(e => [...e.classList].filter(c => /^ph-./.test(c) && !/^ph-(light|thin|bold|fill|duotone)$/.test(c)).map(c => c.slice(3))))]);
  if (!used.length) return [];
  const ALL = CACHE[I.paths] = CACHE[I.paths] || JSON.parse(fs.readFileSync(I.paths, "utf8"));
  const paths = Object.fromEntries(used.filter(n => ALL[n]).map(n => [n, ALL[n]]));
  return page.evaluate(([paths, cls]) => {
    const missing = [];
    document.head.insertAdjacentHTML("beforeend", `<style>.icon.ph-svg::before{content:none!important}.ph-svg>svg{display:inline-block;width:1em;height:1em;vertical-align:-0.0625em;fill:currentColor}</style>`);
    for (const e of document.querySelectorAll(".icon")) {
      const n = [...e.classList].find(c => /^ph-./.test(c) && !/^ph-(light|thin|bold|fill|duotone|svg)$/.test(c));
      if (!n) continue;
      if (!paths[n.slice(3)]) { missing.push(n.slice(3)); continue; }
      // Same box as the font glyph: 1024 units wide, baseline at 960.
      e.classList.add("ph-svg");
      e.innerHTML = `<svg viewBox="0 0 1024 1024" aria-hidden="true"><path d="${paths[n.slice(3)]}"/></svg>`;
    }
    return missing;
  }, [paths, I.cls]);
};
