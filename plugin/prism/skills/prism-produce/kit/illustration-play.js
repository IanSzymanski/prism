// The script each illustration block carries, inlined by build-illustration.js as (this function)(key, prefix, config).
// The markup is the finished frame; this writes the first frame, then plays once when the block reaches the trigger line.
function (K, P, C) {
  var root = document.querySelector("[data-" + P + '="' + K + '"]');
  if (!root || root.getAttribute("data-ready")) return;
  root.setAttribute("data-ready", "1");
  var tile = root.querySelector("." + P + "__tile");
  var all = function (s, el) { return Array.prototype.slice.call((el || tile).querySelectorAll(s)); };
  var byK = function (k) { return all('[data-k~="' + k + '"]'); };

  // Tethers follow the modules they join: measured from the layout on screen, drawn in the visible svg.
  function fit() {
    var svg = all("svg." + P + "__tethers").filter(function (s) { return getComputedStyle(s).display !== "none"; })[0];
    if (!svg) return;
    var T = tile.getBoundingClientRect(), k = 1000 / T.width, H = Math.round(T.height * k);
    svg.setAttribute("viewBox", "0 0 1000 " + H);
    all("g[data-a]", svg).forEach(function (g) {
      var a = tile.querySelector('[data-id="' + g.getAttribute("data-a") + '"]'), b = tile.querySelector('[data-id="' + g.getAttribute("data-b") + '"]');
      if (!a || !b) return;
      var box = function (e) { var r = e.getBoundingClientRect(); return { l: (r.left - T.left) * k, t: (r.top - T.top) * k, r: (r.right - T.left) * k, b: (r.bottom - T.top) * k }; };
      var A = box(a), B = box(b), sides = (g.getAttribute("data-sides") || "").split(" ");
      var hg = Math.max(B.l - A.r, A.l - B.r), vg = Math.max(B.t - A.b, A.t - B.b), acx = (A.l + A.r) / 2, bcx = (B.l + B.r) / 2;
      var sa = sides[0], sb = sides[1];
      if (!sa) { if (hg > vg) { sa = bcx > acx ? "r" : "l"; } else { sa = (B.t + B.b) > (A.t + A.b) ? "b" : "t"; } }
      if (!sb) sb = { r: "l", l: "r", b: "t", t: "b" }[sa];
      var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
      var pt = function (X, s, O) {
        var pad = 24;
        if (s === "r" || s === "l") return { x: s === "r" ? X.r : X.l, y: clamp((O.t + O.b) / 2, X.t + pad, X.b - pad), dx: s === "r" ? 1 : -1, dy: 0 };
        return { x: clamp((O.l + O.r) / 2, X.l + pad * 2, X.r - pad * 2), y: s === "b" ? X.b : X.t, dx: 0, dy: s === "b" ? 1 : -1 };
      };
      var p = pt(A, sa, B), q = pt(B, sb, A), rr = 6;
      var c1 = { x: p.x + p.dx * rr, y: p.y + p.dy * rr }, c2 = { x: q.x + q.dx * rr, y: q.y + q.dy * rr };
      var s0 = { x: c1.x + p.dx * rr, y: c1.y + p.dy * rr }, s1 = { x: c2.x + q.dx * rr, y: c2.y + q.dy * rr };
      var L = sa === sb ? 60 : Math.max(40, Math.hypot(s1.x - s0.x, s1.y - s0.y) * 0.45), f = function (n) { return Math.round(n * 10) / 10; };
      g.querySelector("path").setAttribute("d", "M" + f(s0.x) + " " + f(s0.y) + "C" + f(s0.x + p.dx * L) + " " + f(s0.y + p.dy * L) + " " + f(s1.x + q.dx * L) + " " + f(s1.y + q.dy * L) + " " + f(s1.x) + " " + f(s1.y));
      var cs = g.querySelectorAll("circle");
      cs[0].setAttribute("cx", f(c1.x)); cs[0].setAttribute("cy", f(c1.y)); cs[1].setAttribute("cx", f(c2.x)); cs[1].setAttribute("cy", f(c2.y));
      cs[0].setAttribute("r", rr); cs[1].setAttribute("r", rr);
    });
  }
  root.prismFit = fit;

  var g = window.gsap;
  var still = !g || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (still) { fit(); return; }
  fit();
  var resized; window.addEventListener("resize", function () { clearTimeout(resized); resized = setTimeout(fit, 150); });

  var u = tile.getBoundingClientRect().width / 100, tl = g.timeline({ paused: true });
  var FX = {
    rise: function (s, el) { tl.from(el, { autoAlpha: 0, y: 2.2 * u, duration: 0.7, ease: "power3.out" }, s.at); },
    fade: function (s, el) { tl.from(el, { autoAlpha: 0, duration: 0.6, ease: "power1.out" }, s.at); },
    pop: function (s, el) { tl.from(el, { autoAlpha: 0, scale: 0.82, duration: 0.45, ease: "back.out(2)" }, s.at); },
    brighten: function (s, el) {
      tl.from(all("." + P + "__glass", el[0]).slice(0, 1), { opacity: 0, duration: 0.5, ease: "power1.inOut" }, s.at);
      tl.from(all("." + P + "__pill", el[0]), { autoAlpha: 0, scale: 0.85, duration: 0.45, ease: "back.out(2)" }, s.at + 0.2);
    },
    mark: function (s, el) { tl.from(all("." + P + "__band", el[0]), { scaleX: 0, autoAlpha: 0, duration: 0.6, ease: "power2.inOut" }, s.at); },
    type: function (s, el) { var w = all("." + P + "__w", el[0]); tl.from(w, { autoAlpha: 0, duration: 0.08, stagger: Math.min(0.07, 1.2 / Math.max(1, w.length)), ease: "none" }, s.at); },
    draw: function (s, el) {
      el.forEach(function (gr) {
        var path = gr.querySelector("path"), cs = gr.querySelectorAll("circle");
        g.set(path, { strokeDasharray: 1, strokeDashoffset: 1, visibility: "hidden" });
        tl.set(path, { visibility: "visible" }, s.at);
        tl.to(path, { strokeDashoffset: 0, duration: 0.75, ease: "sine.inOut" }, s.at);
        tl.from(cs[0], { autoAlpha: 0, duration: 0.2 }, s.at);
        tl.from(cs[1], { autoAlpha: 0, duration: 0.25 }, s.at + 0.65);
      });
    },
    swap: function (s, el) {
      var e = el[0], now = e.getAttribute("data-tone"), was = e.getAttribute("data-was-tone");
      var first = function () { e.classList.add("is-was"); if (was) e.setAttribute("data-tone", was); };
      var last = function () { e.classList.remove("is-was"); if (now) e.setAttribute("data-tone", now); else e.removeAttribute("data-tone"); };
      first();
      tl.to(e, { autoAlpha: 0.15, duration: 0.18, ease: "power1.in" }, s.at);
      tl.call(last, null, s.at + 0.18);
      tl.to(e, { autoAlpha: 1, duration: 0.3, ease: "power1.out" }, s.at + 0.2);
    },
    press: function (s, el) {
      var e = el[0];
      tl.to(e, { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" }, s.at);
      if (e.querySelector("." + P + "__was")) FX.swap({ at: s.at + 0.1 }, el);
      tl.fromTo(all("." + P + "__ring", e), { opacity: 0.9, scale: 1 }, { opacity: 0, scale: 1.25, duration: 0.7, ease: "power2.out" }, s.at + 0.2);
    },
  };
  C.steps.forEach(function (s) {
    var el = byK(s.k);
    if (!el.length) return;
    (FX[s.fx] || FX.fade)(s, el);
    if (s.kids && s.kids.length) tl.from(s.kids.map(byK).reduce(function (a, b) { return a.concat(b); }, []), { autoAlpha: 0, y: 0.8 * u, duration: 0.5, stagger: 0.08, ease: "power2.out" }, s.at + 0.2);
  });
  // Once played, no transform is left behind: the last frame is the markup's.
  tl.eventCallback("onComplete", function () { g.set(all("[data-k]").concat(all("[data-k] *")), { clearProps: "transform" }); });
  root.prismTimeline = tl;

  // Plays once: the played flag records it, whatever the scroll position says later.
  function play() { if (root.getAttribute("data-played")) return; root.setAttribute("data-played", "1"); tl.play(0); }
  var ST = window.ScrollTrigger;
  if (ST) { g.registerPlugin(ST); ST.create({ trigger: root, start: C.start, once: true, onEnter: play, onLeave: play }); return; }
  var line = parseFloat((C.start.split(" ")[1] || "75%")) / 100;
  var check = function () { if (root.getBoundingClientRect().top <= innerHeight * line) { play(); removeEventListener("scroll", check); } };
  addEventListener("scroll", check, { passive: true }); check();
}
