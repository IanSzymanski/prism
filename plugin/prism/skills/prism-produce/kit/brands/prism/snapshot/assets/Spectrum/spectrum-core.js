/* Prism spectrum motif: pure geometry, no DOM. Runs in Node and browsers.
   Every function returns plain shapes in the caller's units; colours are passed in, never assumed.
   Hues are numbered 1-4 (hue-1 red, hue-2 amber, hue-3 green, hue-4 blue). */
(function (root) {
  var HUES = 4;

  /* Which hue a numbered thing takes: section n, slide n, panel n. Cycles 1,2,3,4,1... */
  function hueFor(n, start) {
    start = start || 1;
    return ((start - 1 + (n - 1)) % HUES + HUES) % HUES + 1;
  }

  /* A strip of four bands laid left to right. weights scale each band's width; gap is the
     space between bands. Returns [{x, y, w, h, hue}]. The chip is 64x6, the stop 96x6,
     the email divider 48x4, the deck bar 160x8 (in that output's units). */
  function bands(o) {
    o = o || {};
    var x0 = o.x || 0, y = o.y || 0, width = o.width || 64, height = o.height || 6;
    var weights = o.weights || [1, 1, 1, 1], gap = o.gap || 0, order = o.order || [1, 2, 3, 4];
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var free = width - gap * (weights.length - 1), x = x0, out = [];
    for (var i = 0; i < weights.length; i++) {
      var w = free * weights[i] / total;
      out.push({ x: x, y: y, w: w, h: height, hue: order[i % order.length] });
      x += w + gap;
    }
    return out;
  }

  /* The carousel thread: one strip running across n panels of panelWidth. On panel i the band
     of hueFor(i) widens (emphasis, default 3x) so the strip shifts colour as you swipe.
     Returns bands in carousel coordinates (panel i spans i*panelWidth .. (i+1)*panelWidth). */
  function thread(n, panelWidth, o) {
    o = o || {};
    var out = [];
    for (var i = 1; i <= n; i++) {
      var h = hueFor(i), weights = [1, 1, 1, 1];
      weights[h - 1] = o.emphasis || 3;
      out = out.concat(bands({ x: (i - 1) * panelWidth, y: o.y || 0, width: panelWidth,
        height: o.height || 12, weights: weights }));
    }
    return out;
  }

  /* The fan: the four bands leave the glyph (an inverted triangle, point down) along its lower right edge and widen
     to the frame's right edge. Flat: no beam, no gradient. For blog headers and title slides only, on the right third.
     o: {origin:[x,y] (centre of the glyph's top edge), size (glyph height, default 120), edge (x of the frame's right edge),
     spread (height the bands fill at the edge, default 2.5x size), drop (how far the bands' centre sits below origin at the
     edge, default 0.95x size)}. Returns {glyph:[[x,y]x3], rays:[{points:[[x,y]x4], hue}]}. */
  function fan(o) {
    var ox = o.origin[0], oy = o.origin[1], gh = o.size || 120, gs = gh * 2 / Math.sqrt(3);
    var A = [ox - gs / 2, oy], B = [ox + gs / 2, oy], C = [ox, oy + gh];
    var lerp = function (p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    var ex = o.edge, span = o.spread || gh * 2.5, ey = oy + (o.drop == null ? gh * 0.95 : o.drop), exits = [], ends = [], rays = [];
    for (var k = 0; k <= HUES; k++) { exits.push(lerp(B, C, 0.30 + 0.10 * k)); ends.push([ex, ey - span / 2 + span * k / HUES]); }
    for (var i = 0; i < HUES; i++) rays.push({ points: [exits[i], exits[i + 1], ends[i + 1], ends[i]], hue: i + 1 });
    return { glyph: [A, B, C], rays: rays };
  }

  /* Shapes to SVG markup. colors: {1:'#d1495b', 2:..., 3:..., 4:..., ink:'#1b1f2a', beam:'#ffffff'}. */
  function rectsToSVG(rects, colors, r) {
    return rects.map(function (b) {
      return '<rect x="' + b.x.toFixed(2) + '" y="' + b.y.toFixed(2) + '" width="' + b.w.toFixed(2) +
        '" height="' + b.h.toFixed(2) + '"' + (r ? ' rx="' + r + '"' : '') + ' fill="' + colors[b.hue] + '"/>';
    }).join('');
  }
  function pts(a) { return a.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '); }
  function fanToSVG(g, colors) {
    var svg = g.rays.map(function (r) { return '<polygon points="' + pts(r.points) + '" fill="' + colors[r.hue] + '"/>'; }).join('');
    if (g.glyph) svg += '<polygon points="' + pts(g.glyph) + '" fill="' + colors.ink + '"/>';
    return svg;
  }

  var api = { HUES: HUES, hueFor: hueFor, bands: bands, thread: thread, fan: fan,
    rectsToSVG: rectsToSVG, fanToSVG: fanToSVG };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Spectrum = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
