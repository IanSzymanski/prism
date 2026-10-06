// Focal-point crops for every builder: a photo's focus ("x% y%", from images.py, a library entry or written in the markup)
// is the point a cover crop centres on, as far as the image reaches. No focus keeps the centred crop.
const parse = f => String(f).split(/\s+/).map(v => Math.min(1, Math.max(0, parseFloat(v) / 100)));

// Source rectangle (pixels) of a w×h image cropped to the shape of a fw×fh frame, centred on the focus.
function crop(w, h, fw, fh, focus) {
  const [fx, fy] = parse(focus), s = Math.max(fw / w, fh / h);
  const cw = Math.min(w, Math.round(fw / s)), ch = Math.min(h, Math.round(fh / s));
  const clamp = (v, max) => Math.round(Math.min(max, Math.max(0, v)));
  return { left: clamp(fx * w - cw / 2, w - cw), top: clamp(fy * h - ch / 2, h - ch), width: cw, height: ch };
}

// The CSS object-position that shows the same crop in a frame using object-fit: cover.
function position(w, h, fw, fh, focus) {
  const r = crop(w, h, fw, fh, focus);
  const pct = (off, over) => over > 0 ? `${+(off / over * 100).toFixed(3)}%` : "50%";
  return `${pct(r.left, w - r.width)} ${pct(r.top, h - r.height)}`;
}

// Runs in a page: every <img data-focus> gets the object-position for the frame it is laid out in. Call after layout.
const inPage = `window.prismFocus = (imgs) => {
  const crop = ${crop.toString()}, position = ${position.toString()}, parse = ${parse.toString()};
  for (const i of imgs || document.querySelectorAll("img[data-focus]")) {
    if (!i.dataset.focus || !i.naturalWidth || getComputedStyle(i).objectFit !== "cover") continue;
    const b = i.getBoundingClientRect(); if (!b.width || !b.height) continue;
    i.style.objectPosition = position(i.naturalWidth, i.naturalHeight, b.width, b.height, i.dataset.focus);
  }
};`;

module.exports = { crop, position, inPage };
