// Logos placed inside blocks (logo="top-right" and so on): runs in the page after layout and picks the logo for each ground.
// A block whose text is light sits on a dark ground (the brand's layers pair them), so it takes the on-dark logo;
// .on-dark and .on-light on the block decide it outright. Returns notes for logos left out (no on-dark logo).
function pick() {
  const lum = c => { const [r, g, b] = (c.match(/[\d.]+/g) || []).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const out = [];
  for (const l of document.querySelectorAll(".prism-inlogo")) {
    const block = l.parentElement, forced = block.closest(".on-dark, .on-light");
    const dark = forced ? forced.classList.contains("on-dark") : lum(getComputedStyle(block).color) > 0.4;
    l.classList.toggle("is-dark", dark);
    if (dark && !l.querySelector(".prism-inlogo__dark")) out.push(`logo on a dark ground in .${[...block.classList].join(".")}: the brand has no logo for dark grounds (prism-asset-logo-on-dark), so it is left out`);
  }
  return out;
}

module.exports = { pick };
