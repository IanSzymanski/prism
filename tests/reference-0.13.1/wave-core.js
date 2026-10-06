(function (root) {
  "use strict";
  var TAU = Math.PI * 2;
  function smooth(u) { return u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u); }
  function blend(a, b, t) {
    return (a > 0 && b > 0) ? a * Math.pow(b / a, t) : a + (b - a) * t;
  }
  function gain(amplitude, wavelength, focus) {
    var phi = Math.atan(TAU * focus / wavelength);
    return amplitude / (Math.exp(-(phi * wavelength / TAU) / focus) * Math.sin(phi));
  }
  function samples(x0, span, baseline, p) {
    var A = gain(p.amplitude, p.wavelength, p.focus);
    var cx = (p.cx == null) ? x0 + span / 2 : p.cx;
    var edge = p.edge || 1;
    var dir = p.flip ? -1 : 1;
    var step = Math.max(1, p.wavelength / 10);
    var pts = [];
    for (var x = x0; x < x0 + span; x += step) {
      var env = A * Math.exp(-Math.abs(x - cx) / p.focus) *
                smooth(Math.min(x - x0, span - (x - x0)) / edge);
      pts.push([x, baseline + dir * env * Math.sin(TAU * (x - cx) / p.wavelength + (p.phase || 0))]);
    }
    pts.push([x0 + span, baseline]);
    return pts;
  }
  function toPath(pts, open) {
    var d = (open ? "" : "M") + pts[0][0].toFixed(2) + "," + pts[0][1].toFixed(2);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += "C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + "," + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) +
           " " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + "," + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) +
           " " + p2[0].toFixed(2) + "," + p2[1].toFixed(2);
    }
    return d;
  }
  root.Wave = { TAU: TAU, smooth: smooth, blend: blend, gain: gain, samples: samples, toPath: toPath,
                stillFrame: { t: 0.45, phase: 0.9 } };
})(typeof window !== "undefined" ? window : globalThis);
