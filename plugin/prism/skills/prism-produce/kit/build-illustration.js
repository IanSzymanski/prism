#!/usr/bin/env node
// Website illustration: an animated, stylized UI mockup for a feature page, as one HTML block (dark and light) plus a bench page.
// Usage: node build-illustration.js formats/illustration.md [outdir] [--no-render]
//        node build-illustration.js bench out/bench.html formats/a.md formats/b.md ...   (a feature page of several, alternating sides)
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const here = __dirname;
const { tagFor, kebab } = require("./naming.js");
const VERSION = fs.readFileSync(path.join(here, "VERSION"), "utf8").trim();
const SIZES = { tile: [1, 0.8], wide: [1.6, 0.8], tall: [0.8, 0.75], full: [16 / 9, 9 / 16] };
const FX = ["rise", "fade", "pop", "brighten", "mark", "type", "draw", "swap", "press", "none"];
const TONES = ["urgent", "stable", "review", "accent", "neutral", "done"];
const LEAVES = ["row", "ghost", "line", "title", "label", "quote", "field", "pill", "tags", "bars", "button", "list", "space"];
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<em>$1</em>");
const plain = s => String(s || "").replace(/\*+/g, "");

// ---- The brand's illustration settings (profile `illustration`), with core defaults from its roles ----
function settings(B) {
  let prof = {};
  try { prof = JSON.parse(fs.readFileSync(path.join(B.res.dir, "profile.json"), "utf8")).illustration || {}; } catch (e) { }
  const c = n => B.color(n), has = n => B.has(n);
  const rgb = h => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(h) || [0, "ff", "ff", "ff"]; return [1, 2, 3].map(i => parseInt(m[i], 16)); };
  const a = (h, x) => `rgba(${rgb(h).join(",")},${x})`;
  const paper = c("prism-color-surface"), ink = c("prism-color-text-strong"), acc = c("prism-color-accent");
  const onDark = has("prism-color-eyebrow-on-dark") ? c("prism-color-eyebrow-on-dark") : paper;
  const hdr = (t, i) => has(`prism-color-header-${t}-${i}`) ? c(`prism-color-header-${t}-${i}`) : (t === "deep" ? c("prism-color-dark-surface") : paper);
  const core = {
    prefix: "prism-ill", feature_prefix: "prism-ill-", start: "top 75%", script_attrs: {}, boot: {},
    seconds: { tile: 5, wide: 5, tall: 5, full: 6 }, max_words: 14, never: [], rules: [],
    themes: {
      dark: { ink: paper, "ink-2": a(paper, 0.78), "ink-3": a(paper, 0.55), glass: "rgba(255,255,255,.07)", edge: "rgba(255,255,255,.14)", "glass-hi": "rgba(255,255,255,.13)", "edge-hi": "rgba(255,255,255,.26)",
        "glass-key": "rgba(255,255,255,.11)", "edge-key": "rgba(255,255,255,.10)", "glass-mark": "rgba(255,255,255,.14)", "edge-mark": "rgba(255,255,255,.30)", ph: "rgba(255,255,255,.07)", shadow: "none",
        "t-accent": onDark, "t-neutral": a(paper, 0.6), "t-urgent": onDark, "t-stable": onDark, "t-review": onDark, "t-done": onDark, page: c("prism-color-dark-deep") },
      light: { ink, "ink-2": c("prism-color-text"), "ink-3": a(ink, 0.5), glass: "rgba(255,255,255,.42)", edge: "rgba(255,255,255,.85)", "glass-hi": "rgba(255,255,255,.62)", "edge-hi": "rgba(255,255,255,.95)",
        "glass-key": "rgba(255,255,255,.55)", "edge-key": "rgba(255,255,255,.9)", "glass-mark": "rgba(255,255,255,.7)", "edge-mark": a(acc, 0.35), ph: a(ink, 0.06), shadow: `0 .6em 2em ${a(acc, 0.08)}`,
        "t-accent": acc, "t-neutral": a(ink, 0.55), "t-urgent": acc, "t-stable": acc, "t-review": acc, "t-done": acc, page: paper },
    },
    grounds: {
      brand: {
        dark: { base: `linear-gradient(135deg, ${hdr("deep", 2)} 0%, ${hdr("deep", 1)} 100%)`, glows: [{ color: hdr("deep", 4), at: "0% 0%", size: "110% 95%", alpha: 0.8 }, { color: hdr("deep", 3), at: "100% 100%", size: "100% 90%", alpha: 0.6 }] },
        light: { base: paper, glows: [{ color: hdr("light", 4), at: "0% 0%", size: "110% 95%", alpha: 0.9 }, { color: hdr("light", 3), at: "100% 100%", size: "100% 90%", alpha: 0.7 }] },
      },
    },
  };
  const out = { ...core, ...prof, themes: { dark: { ...core.themes.dark, ...((prof.themes || {}).dark || {}) }, light: { ...core.themes.light, ...((prof.themes || {}).light || {}) } } };
  out.grounds = prof.grounds || core.grounds;
  out.fromBrand = !!Object.keys(prof).length;
  return out;
}

// A radial glow that fades on a smoothstep curve over many stops, so grounds blend with no edge.
function ground(g) {
  const rgb = h => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(h); return m ? [1, 2, 3].map(i => parseInt(m[i], 16)) : [255, 255, 255]; };
  const layers = (g.glows || []).map(w => {
    const stops = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, s = t * t * (3 - 2 * t); stops.push(`rgba(${rgb(w.color).join(",")},${+((w.alpha ?? 1) * (1 - s)).toFixed(3)}) ${Math.round(t * 1000) / 10}%`); }
    return `radial-gradient(${w.size || "110% 100%"} at ${w.at || "0% 0%"}, ${stops.join(", ")})`;
  });
  return [...layers, /gradient\(/.test(g.base) ? g.base : `linear-gradient(${g.base},${g.base})`].join(", ");
}

// ---- The format file ----
function attrs(s) {
  const o = { cls: [], id: "", a: {} };
  for (const m of String(s || "").matchAll(/(\.[\w-]+)|(#[\w-]+)|([\w-]+)=("[^"]*"|'[^']*'|[^\s}]+)/g)) {
    if (m[1]) o.cls.push(m[1].slice(1)); else if (m[2]) o.id = m[2].slice(1); else o.a[m[3]] = m[4].replace(/^["']|["']$/g, "");
  }
  return o;
}
function parse(src) {
  src = src.replace(/\r\n/g, "\n");
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(src), meta = {};
  for (const l of (fm ? fm[1] : "").split("\n")) { const m = /^([\w-]+):\s*(.*?)\s*(#.*)?$/.exec(l); if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
  const lines = (fm ? src.slice(fm[0].length) : src).split("\n");
  const top = { kind: "root", children: [] }, stack = [top], errors = [];
  lines.forEach((raw, i) => {
    const l = raw.trim(), at = `line ${i + 1 + (fm ? fm[0].split("\n").length - 1 : 0)}`, cur = stack[stack.length - 1];
    if (!l || /^<!--.*-->$/.test(l)) return;
    let m;
    if ((m = /^:{3,}\s*(.*)$/.exec(l))) {
      if (!m[1]) { if (stack.length > 1) stack.pop(); else errors.push(`${at}: a closing ::: with nothing open`); return; }
      const A = m[1].startsWith("{") ? attrs(m[1].replace(/^\{|\}$/g, "")) : { cls: [m[1].trim()], id: "", a: {} };
      const n = { kind: A.cls[0] || "group", ...A, children: [], at };
      cur.children.push(n); stack.push(n); return;
    }
    if (cur.kind === "notes") return;
    if ((m = /^\[(.*)\]\{(.*)\}$/.exec(l))) { const A = attrs(m[2]); cur.children.push({ kind: A.cls[0] || "line", ...A, text: m[1], at }); return; }
    if ((m = /^#{1,3}\s+(.*?)(?:\s*\{(.*)\})?$/.exec(l))) { const A = attrs(m[2]); cur.children.push({ kind: "title", ...A, text: m[1], at }); return; }
    if ((m = /^[-*]\s+(.*)$/.exec(l))) {
      const last = cur.children[cur.children.length - 1];
      if (last && last.kind === "list" && last.fromMd) last.items.push(m[1]); else cur.children.push({ kind: "list", cls: ["list"], id: "", a: {}, items: [m[1]], fromMd: true, at });
      return;
    }
    cur.children.push({ kind: "line", cls: ["line"], id: "", a: {}, text: l, at });
  });
  if (stack.length > 1) errors.push(`${stack[stack.length - 1].at}: a ::: block is never closed`);
  return { meta, top, errors };
}

// ---- Markup ----
function compile(doc, S, B, md, theme) {
  const P = S.prefix, errors = [], warns = [], steps = [], texts = [], ids = new Set();
  let k = 0, curMod = 0, lastOwn = [];
  const reveal = {};
  const icons = JSON.parse(fs.readFileSync(B.icons.paths, "utf8"));
  const icon = (n, cls) => { if (!icons[n]) { errors.push(`no icon "${n}" in the brand's icon set`); return ""; } return `<svg class="${P}__${cls || "ico"}" viewBox="0 0 1024 1024" aria-hidden="true"><path d="${icons[n]}"/></svg>`; };
  const tone = (t, where) => { if (!t) return ""; if (!TONES.includes(t)) { errors.push(`${where}: tone=${t} (use ${TONES.join(", ")})`); return ""; } return ` data-tone="${t}"`; };
  const word = s => `<span class="${P}__w">${s}</span>`;
  const words = s => inline(s).split(/(\s+)/).map(w => /^\s+$/.test(w) || !w ? w : word(w)).join("");
  const nowWas = (n, html) => n.a.was ? `<span class="${P}__now">${html}</span><span class="${P}__was">${inline(n.a.was)}</span>` : html;
  const avatar = (v, name, n) => {
    const t = tone(n.a["avatar-tone"], n.at);
    if (v && /\.(png|jpe?g|webp)$|^brand:|^prism:/i.test(v)) {
      const file = B.src(v, path.dirname(md));
      if (!fs.existsSync(file)) { errors.push(`${n.at}: no image ${v}`); return ""; }
      const b64 = execFileSync("python3", ["-I", "-c", "import sys,io,base64\nfrom PIL import Image,ImageOps\nim=ImageOps.fit(Image.open(sys.argv[1]).convert('RGB'),(192,192))\nb=io.BytesIO();im.save(b,'JPEG',quality=84);print(base64.b64encode(b.getvalue()).decode())", file]).toString().trim();
      return `<span class="${P}__av"${t}><img src="data:image/jpeg;base64,${b64}" alt=""></span>`;
    }
    const ini = v || plain(name).split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return `<span class="${P}__av"${t}><span>${esc(ini)}</span></span>`;
  };
  // Each element lists its beats in data-k: its entrance with the module, and its own step later in the story.
  function own(n, defFx, ks) {
    const fx = n.a.fx || defFx;
    if (!fx || fx === "none") return;
    if (!FX.includes(fx)) { errors.push(`${n.at}: fx=${fx} (use ${FX.join(", ")})`); return; }
    const id = ++k; steps.push({ k: id, fx, at: n.a.at != null ? +n.a.at : null, words: n.wordCount || 0, where: n.at });
    ks.push(id); lastOwn.push(id);
  }
  const kAttr = ks => ks.length ? ` data-k="${ks.join(" ")}"` : "";
  const idOf = n => { if (!n.id) return ""; if (ids.has(n.id)) errors.push(`${n.at}: #${n.id} is used twice`); ids.add(n.id); return ` data-id="${n.id}"`; };
  let leaf = function (n, kids) {
    const has = c => n.cls.includes(c), text = n.text || "", ks = [];
    if (!["list", "tags", "space", "ghost", "bars"].includes(n.kind)) texts.push({ text: plain(text), at: n.at, was: n.a.was });
    // Popped and pressed elements arrive on their own beat; the rest arrive with their module.
    const enter = () => { const id = ++k; kids.push(id); ks.push(id); };
    const wc = has("wide-only") ? " is-wide" : "";
    const wasTone = n.a.was ? ` data-was-tone="${n.a["was-tone"] || ""}"` : "";
    switch (n.kind) {
      case "row": {
        const [name, sub] = text.split("|").map(s => s.trim()), key = has("key");
        enter(); if (key) own(n, "brighten", ks);
        if (n.a.was && !n.a.pill) errors.push(`${n.at}: was= on a row changes its pill; add pill=`);
        const pks = []; if (n.a.was) own({ ...n, a: { fx: "swap", at: n.a["was-at"] } }, "swap", pks);
        const pill = n.a.pill ? `<span class="${P}__pill"${kAttr(pks)}${tone(n.a.tone, n.at)}${wasTone}>${nowWas(n, inline(n.a.pill))}</span>` : "";
        if (n.a.pill) texts.push({ text: n.a.pill, at: n.at });
        return `<div class="${P}__row${key ? " is-key" : ""}${wc}"${kAttr(ks)}${idOf(n)}>${key ? `<span class="${P}__glass"></span>` : ""}${avatar(n.a.avatar, name, n)}<span class="${P}__who"><span class="${P}__name">${inline(name)}</span>${sub ? `<span class="${P}__sub">${inline(sub)}</span>` : ""}</span>${pill}</div>`;
      }
      case "ghost": { enter(); const nb = +(n.a.bars || 2); return `<div class="${P}__ghost${wc}"${kAttr(ks)}${idOf(n)}><i></i><b>${[62, 40, 52].slice(0, nb).map(w => `<span class="${P}__bar" style="--bw:${w}%"></span>`).join("")}</b></div>`; }
      case "bars": { enter(); const ws = (n.a.w || "90 70 80").split(/[\s,]+/); return `<div class="${P}__bars${wc}"${kAttr(ks)}${idOf(n)}>${ws.slice(0, +(n.a.n || ws.length)).map(w => `<span class="${P}__bar" style="--bw:${w}%"></span>`).join("")}</div>`; }
      case "title": case "label": case "quote": case "line": {
        const type = has("type") || has("ai"), mark = has("mark");
        n.wordCount = plain(text).split(/\s+/).filter(Boolean).length;
        if (n.a.fx === "pop") own(n, "pop", ks); else { enter(); if (type) own(n, "type", ks); else if (!mark) own(n, null, ks); }
        const bks = []; if (mark) own(n, "mark", bks);
        const cites = (n.a.cite || "").split(/[\s,]+/).filter(Boolean).map(x => `<span class="${P}__cite"${tone(n.a["cite-tone"], n.at)}>${esc(x)}</span>`).join("");
        const body = (type ? words(text) : inline(text)) + cites;
        const cls = (n.asText ? "text" : n.kind) + (has("strong") ? " is-strong" : "") + wc;
        if (mark) return `<div class="${P}__${cls}${n.kind === "line" ? "" : ` ${P}__has-band`}"${kAttr(ks)}${idOf(n)}><span class="${P}__band"${kAttr(bks)}></span><span class="${P}__txt">${body}</span></div>`;
        return `<div class="${P}__${cls}"${kAttr(ks)}${idOf(n)}>${body}</div>`;
      }
      case "field": {
        const [label, value] = text.split("|").map(s => s.trim()), miss = has("missing");
        enter(); if (n.a.fx) own(n, null, ks);
        return `<div class="${P}__field${miss ? " is-missing" : ""}${wc}"${kAttr(ks)}${idOf(n)}${tone(n.a.tone || (miss ? "review" : ""), n.at)}><span class="${P}__label">${inline(label)}</span><div>${inline(value || "")}</div></div>`;
      }
      case "pill": {
        if (n.a.fx === "pop") own(n, "pop", ks); else { enter(); own(n, n.a.was ? "swap" : null, ks); }
        return `<span class="${P}__pill"${kAttr(ks)}${idOf(n)}${tone(n.a.tone, n.at)}${wasTone}>${nowWas(n, inline(text))}</span>`;
      }
      case "tags": { enter(); const items = text.split(",").map(s => s.trim()).filter(Boolean); items.forEach(t => texts.push({ text: t, at: n.at })); return `<div class="${P}__tags${wc}"${kAttr(ks)}${idOf(n)}>${items.map(t => `<span${tone(n.a.tone, n.at)}>${inline(t)}</span>`).join("")}</div>`; }
      case "button": {
        const approve = has("approve");
        if (approve || n.a.fx) { enter(); own(n, approve ? "press" : null, ks); } else enter();
        const ic = n.a.icon || (approve ? "check" : ""), label = (ic ? icon(ic) : "") + nowWas(n, inline(text));
        return `<span class="${P}__btn"${kAttr(ks)}${idOf(n)}${tone(n.a.tone || (approve ? "accent" : ""), n.at)}${wasTone}>${approve ? `<span class="${P}__ring"></span>` : ""}${label}</span>`;
      }
      case "list": {
        enter(); const items = n.items || text.split("|");
        items.forEach(t => texts.push({ text: plain(t), at: n.at }));
        return `<div class="${P}__list${wc}"${kAttr(ks)}${idOf(n)}${tone(n.a.tone, n.at)}>${items.map(t => `<div><i></i><span>${inline(t.trim())}</span></div>`).join("")}</div>`;
      }
      case "space": return `<div class="${P}__sp"></div>`;
    }
    errors.push(`${n.at}: unknown element .${n.kind} (use ${LEAVES.join(", ")})`);
    return "";
  };
  // Remember which steps bring each named element on screen, so a tether waits for both of its ends.
  const leafOf = leaf;
  leaf = (n, kids) => { lastOwn = []; const h = leafOf(n, kids); if (n.id) reveal[n.id] = [curMod, ...lastOwn]; return h; };
  const body = (ch, kids) => ch.map(n => n.children ? group(n, kids) : leaf(n, kids)).join("");
  function group(n, kids) {
    if (n.kind === "notes") return "";
    const kid = ++k; kids.push(kid);
    return `<div class="${P}__row-end"${idOf(n)} data-k="${kid}">${body(n.children, [])}</div>`;
  }
  const box = (v, where) => { const p = String(v || "").trim().split(/\s+/).map(Number); if (p.length < 3 || p.some(isNaN)) { errors.push(`${where}: box="x y w" in percent of the tile`); return [0, 0, 50]; } return p; };
  let mods = "", tethers = [];
  for (const n of doc.top.children) {
    if (n.kind === "notes") continue;
    if (n.kind === "tether") {
      const [a, b] = [n.a.from, n.a.to];
      const id = ++k; steps.push({ k: id, fx: n.a.fx || "draw", at: n.a.at != null ? +n.a.at : null, where: n.at });
      tethers.push({ a, b, k: id, sides: n.a.sides || "", psides: n.a["phone-sides"] || n.a.sides || "", tone: n.a.tone, at: n.at, wide: n.cls.includes("wide-only"), pinned: n.a.at != null });
      continue;
    }
    if (!["panel", "card"].includes(n.kind)) { errors.push(`${n.at}: .${n.kind} at the top level; put it in a ::: panel or ::: card (or draw a .tether)`); continue; }
    const [x, y, w, h] = box(n.a.box, n.at), ph = n.a.phone ? box(n.a.phone, n.at) : null;
    const kids = [], id = ++k;
    curMod = id; if (n.id) reveal[n.id] = [id];
    steps.push({ k: id, fx: n.a.fx || "rise", at: n.a.at != null ? +n.a.at : null, kids, where: n.at });
    const style = `--x:${x};--y:${y};--w:${w}${h ? `;height:${h}cqh` : ""}${ph ? `;--x2:${ph[0]};--y2:${ph[1]};--w2:${ph[2]}` : ""}`;
    const cls = `${P}__m ${P}__${n.kind}${n.cls.includes("wide-only") ? " is-wide" : ""}`;
    let inner;
    if (n.kind === "panel") {
      const ch = n.children.slice(), parts = [];
      if (n.a.title) { parts.push(`<div class="${P}__title"${(() => { const t = ++k; kids.push(t); return ` data-k="${t}"`; })()}>${inline(n.a.title)}</div>`); texts.push({ text: n.a.title, at: n.at }); }
      let run = [];
      const flush = () => { if (run.length) parts.push(`<div class="${P}__stack">${body(run, kids)}</div>`); run = []; };
      ch.forEach((c, i) => {
        if (["row", "ghost"].includes(c.kind) || (c.kind === "title" && i === 0 && !n.a.title)) { flush(); parts.push(leaf(c, kids)); }
        else run.push(c);
      });
      flush();
      inner = parts.join("");
    } else {
      const one = n.children.length === 1 && n.children[0].kind === "line";
      inner = `${n.a.icon ? icon(n.a.icon) : ""}<div class="${P}__body">${n.children.map(c => c.children ? group(c, kids) : leaf(one ? { ...c, asText: true } : c, kids)).join("")}</div>${n.cls.includes("arrow") ? icon("arrow-right", "arrow") : ""}`;
    }
    mods += `<div class="${cls}"${idOf(n)} data-k="${id}" style="${style}">${inner}</div>`;
  }
  for (const t of tethers) for (const e of [t.a, t.b]) if (!ids.has(e)) errors.push(`${t.at}: tether to #${e}, which no element has`);
  for (const t of tethers) {
    if (t.pinned) continue;
    const i = steps.findIndex(s => s.k === t.k), [st] = steps.splice(i, 1);
    const need = [...(reveal[t.a] || []), ...(reveal[t.b] || [])];
    const last = Math.max(-1, ...need.map(x => steps.findIndex(s => s.k === x)));
    steps.splice(last + 1, 0, st);
  }
  const svg = view => `<svg class="${P}__tethers ${P}-${view}" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">${tethers.filter(t => view === "wide" || !t.wide).map(t => `<g data-k="${t.k}" data-a="${t.a}" data-b="${t.b}"${(view === "wide" ? t.sides : t.psides) ? ` data-sides="${view === "wide" ? t.sides : t.psides}"` : ""}${tone(t.tone, t.at)}><path pathLength="1" d=""/><circle r="6"/><circle r="6"/></g>`).join("")}</svg>`;
  return { mods, svgs: tethers.length ? svg("wide") + svg("phone") : "", steps, texts, errors, warns, ids };
}

// Starts follow the file's order and fill about the piece's seconds; at= pins a step's start.
function schedule(steps, seconds) {
  const dur = s => ({ rise: Math.max(0.7, s.kids && s.kids.length ? 0.7 + 0.08 * (s.kids.length - 1) : 0.7), fade: 0.6, pop: 0.45, brighten: 0.7, mark: 0.6, type: Math.min(1.4, 0.3 + (s.words || 4) * 0.07), draw: 0.95, swap: 0.5, press: 0.9 }[s.fx] || 0.6);
  const T = seconds - 0.25, total = steps.reduce((a, s) => a + dur(s), 0);
  const gap = steps.length > 1 ? Math.min(0.55, Math.max(0, (T - total) / (steps.length - 1))) : 0;
  const squeeze = total > T && steps.length > 1 ? (T - dur(steps[steps.length - 1])) / (total - dur(steps[steps.length - 1])) : 1;
  let t = 0.15, end = 0;
  for (const s of steps) {
    s.at = s.at != null && !isNaN(s.at) ? s.at : +t.toFixed(2);
    t = s.at + dur(s) * squeeze + gap;
    end = Math.max(end, s.at + dur(s));
  }
  return end;
}

function blockHtml({ P, S, key, theme, full, style, alt, compiled, css }) {
  const cfg = { start: S.start, steps: compiled.steps.map(s => ({ k: s.k, fx: s.fx, at: s.at, kids: s.kids && s.kids.length ? s.kids : undefined })) };
  const play = fs.readFileSync(path.join(here, "illustration-play.js"), "utf8").replace(/^\/\/.*\n/gm, "").trim();
  const ready = (S.boot && S.boot.ready) || "";
  const boot = `(function(){var run=function(){(${play})(${JSON.stringify(key)},${JSON.stringify(P)},${JSON.stringify(cfg)})};` +
    (ready ? `var r=window,p=${JSON.stringify(ready.split("."))};for(var i=0;i<p.length&&r;i++)r=r[p[i]];if(typeof r==="function"){r(run);return}` : "") +
    `if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run()})();`;
  const sattrs = Object.entries(S.script_attrs || {}).map(([a, v]) => ` ${a}="${esc(v)}"`).join("");
  return `<!-- ${alt.title} · ${theme} · website illustration built by Prism ${VERSION} -->
<style>${css}</style>
<div class="${P} ${P}--${theme}${full ? ` ${P}--full` : ""} ${S.feature_prefix}${key.replace(/-(dark|light)$/, "")}" data-${P}="${key}" data-prism="${VERSION}" style="${style}">
<div class="${P}__tile" role="img" aria-label="${esc(alt.text)}">${compiled.mods}${compiled.svgs}</div>
</div>
<script${sattrs}>${boot}</script>
`;
}

function sharedCss(S, B) {
  const P = S.prefix, vars = t => `{${Object.entries(S.themes[t]).filter(([n]) => n !== "page").map(([n, v]) => `--${n}:${v}`).join(";")}}`;
  const font = n => B.role(n).stack;
  let css = fs.readFileSync(path.join(here, "prism-illustration.css"), "utf8")
    .replace("__THEME_DARK__", vars("dark")).replace("__THEME_LIGHT__", vars("light"))
    .replace(/__SERIF__/g, font("prism-font-serif")).replace(/__SANS__/g, font("prism-font-sans")).replace(/__MONO__/g, font("prism-font-mono"))
    .replace("__PRE__", S.boot && S.boot.pre ? `${S.boot.pre} .__P____tile{visibility:hidden}` : "");
  css = css.replace(/__P__/g, P);
  return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, "").replace(/\s*([{};,])\s*/g, "$1").replace(/;}/g, "}");
}

function fontFaces(B, embed) {
  const out = [];
  for (const n of ["prism-font-serif", "prism-font-sans", "prism-font-mono"]) for (const f of B.role(n).files || []) {
    const src = embed ? `data:font/ttf;base64,${fs.readFileSync(f.path).toString("base64")}` : "file://" + f.path;
    out.push(`@font-face{font-family:"${f.family}";src:url(${src}) format("truetype");font-weight:${f.weight};font-style:normal;font-display:block}`);
  }
  return out.join("\n");
}

function gsapFiles() {
  const tries = [path.join(here, "mods", "gsap", "node_modules", "gsap", "dist"), path.join(here, "node_modules", "gsap", "dist")];
  try { tries.unshift(path.dirname(require.resolve("gsap/dist/gsap.min.js"))); } catch (e) { }
  const d = tries.find(x => fs.existsSync(path.join(x, "gsap.min.js")));
  return d ? [path.join(d, "gsap.min.js"), path.join(d, "ScrollTrigger.min.js")] : null;
}

// ---- One illustration: both blocks, checks, stills ----
async function buildOne(md, outDir, opts = {}) {
  md = path.resolve(md);
  const B = require("./brand.js")(md), S = settings(B), P = S.prefix;
  const doc = parse(fs.readFileSync(md, "utf8")), meta = doc.meta;
  const errors = [...doc.errors], warns = [];
  if (!S.fromBrand) warns.push(`${B.name} has no illustration settings in its profile; core defaults used`);
  const size = meta.size || "tile";
  if (!SIZES[size]) errors.push(`size: ${size} (use ${Object.keys(SIZES).join(", ")})`);
  const ratio = (v, d) => { const m = /^\s*([\d.]+)\s*(?:[/:]\s*([\d.]+))?\s*$/.exec(v || ""); return m ? +m[1] / +(m[2] || 1) : d; };
  const [ar, ar2] = [ratio(meta.aspect, (SIZES[size] || SIZES.tile)[0]), ratio(meta["phone-aspect"], (SIZES[size] || SIZES.tile)[1])];
  const full = size === "full", seconds = +(meta.seconds || S.seconds[size] || 5);
  const gname = meta.ground || Object.keys(S.grounds)[0];
  if (!S.grounds[gname]) errors.push(`ground: ${gname} is not one of ${B.name}'s illustration grounds (${Object.keys(S.grounds).join(", ")})`);
  for (const k of ["title", "feature", "problem", "answer"]) if (!meta[k]) errors.push(`front matter needs ${k}: (${{ title: "the mockup's name", feature: "the feature it shows", problem: "what goes wrong without it", answer: "what the feature does about it" }[k]})`);
  const key = kebab(meta.key || meta.feature || meta.title || "illustration");
  const TAG = tagFor(md, meta);
  const css = sharedCss(S, B);
  const out = { tag: TAG, key, meta, blocks: {}, ground: gname, size, errors, warns };
  let firstCompiled;
  for (const theme of ["dark", "light"]) {
    const c = compile(doc, S, B, md, theme);
    if (theme === "dark") { errors.push(...c.errors); firstCompiled = c; }
    const end = schedule(c.steps, seconds);
    if (theme === "dark") out.seconds = +end.toFixed(2);
    const g = (S.grounds[gname] || Object.values(S.grounds)[0])[theme];
    const style = `--g:${ground(g)};--ar:${+ar.toFixed(4)};--ar2:${+ar2.toFixed(4)}${meta["phone-scale"] ? `;--t2:${+meta["phone-scale"]}` : ""}`;
    out.blocks[theme] = { key: `${key}-${theme}`, compiled: c, style, html: null };
  }
  const alt = { title: plain(meta.title), text: plain(meta.alt || `${meta.feature}: ${meta.answer}`) };
  // Copy: the brand's never-words, one key fact per element, numbers only when the piece says they're illustrative.
  for (const t of firstCompiled.texts) {
    for (const s of [t.text, t.was].filter(Boolean)) {
      for (const nv of S.never || []) if (s.toLowerCase().includes(nv.toLowerCase())) errors.push(`${t.at}: "${nv}" is never used in ${B.name} copy`);
      const n = s.split(/\s+/).filter(Boolean).length;
      if (n > S.max_words) warns.push(`${t.at}: ${n} words; keep one key fact per element (${S.max_words} words at most)`);
      if (/\d/.test(s.replace(/\b\d{1,2}:\d{2}\b/g, "")) && meta.figures !== "illustrative") warns.push(`${t.at}: "${s}" has a number; mockup data is fictional, so add figures: illustrative (and never show it as a real result)`);
    }
  }
  for (const nv of S.never || []) for (const k of ["title", "feature", "problem", "answer", "heading", "copy"]) if ((meta[k] || "").toLowerCase().includes(nv.toLowerCase())) errors.push(`${k}: "${nv}" is never used in ${B.name} copy`);
  const src = fs.readFileSync(md, "utf8");
  if (S.ai_review && /\.(ai|type)\b/.test(src) && !/\.approve\b/.test(src)) warns.push(`AI output (.ai) but no .approve button: end on a person reviewing or approving it`);
  if (out.seconds > seconds + 0.6) warns.push(`the animation runs ${out.seconds} s, not about ${seconds}: fewer steps or pin starts with at=`);
  if (errors.length) return out;
  fs.mkdirSync(outDir, { recursive: true });
  const mk = theme => { const b = out.blocks[theme]; return blockHtml({ P, S, key: b.key, theme, full, style: b.style, alt, compiled: b.compiled, css }); };
  for (const theme of ["dark", "light"]) out.blocks[theme].html = mk(theme);
  if (opts.render === false) return out;
  await render(out, B, S, outDir, opts);
  return out;
}

// A page with one block at a set width, the brand's fonts loaded from disk, GSAP only when asked.
function stage(B, block, width, page, withGsap, pad) {
  const g = withGsap ? gsapFiles() : null;
  return `<!doctype html><meta charset="utf-8"><style>${fontFaces(B, false)}
html,body{margin:0;background:${page}}#w{width:${width}px;padding:${pad ? "1600px 20px 3000px" : "20px"}}</style>${g ? g.map(f => `<script src="file://${f}"></script>`).join("") : ""}<div id="w">${block}</div>`;
}

async function render(out, B, S, outDir, opts) {
  const { chromium } = require("playwright");
  const exe = process.env.PRISM_CHROMIUM;
  const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ["--font-render-hinting=none", "--force-color-profile=srgb"] });
  const P = S.prefix, tmp = path.join(outDir, ".stage"); fs.mkdirSync(tmp, { recursive: true });
  const W = { wide: out.size === "full" ? 1280 : 900, phone: 360 };
  const files = {}, shots = [];
  const open = async (html, width, o = {}) => {
    const f = path.join(tmp, `s${Math.random().toString(36).slice(2, 8)}.html`); fs.writeFileSync(f, html);
    const page = await browser.newPage({ viewport: { width: width + 40, height: out.size === "full" ? Math.round(width * (width > 500 ? 9 / 16 : 16 / 9)) : 900 }, deviceScaleFactor: o.scale || 1, reducedMotion: o.reduce ? "reduce" : "no-preference" });
    await page.goto("file://" + f); await page.evaluate(() => document.fonts.ready);
    return page;
  };
  // Bake the tethers for the wide and the phone composition, so the markup alone is the finished frame.
  for (const theme of ["dark", "light"]) {
    const b = out.blocks[theme];
    for (const view of ["wide", "phone"]) {
      if (!b.compiled.svgs) break;
      const page = await open(stage(B, b.html, W[view], S.themes[theme].page, false), W[view]);
      const svg = await page.evaluate(([P, view]) => { const s = document.querySelector(`svg.${P}-${view}`); return s ? s.outerHTML : ""; }, [P, view]);
      await page.close();
      const re = new RegExp(`<svg class="${P}__tethers ${P}-${view}"[\\s\\S]*?</svg>`);
      b.html = b.html.replace(re, svg.replace(/ style="[^"]*"/g, ""));
    }
  }
  // Checks on the finished frame: nothing past the tile, no clipped names, no colored fill, type large enough on a phone.
  for (const view of ["wide", "phone"]) {
    const page = await open(stage(B, out.blocks.dark.html, W[view], S.themes.dark.page, false), W[view], { scale: 2 });
    const res = await page.evaluate(P => {
      const tile = document.querySelector(`.${P}__tile`), T = tile.getBoundingClientRect(), r = [];
      for (const m of tile.querySelectorAll(`.${P}__m`)) {
        if (getComputedStyle(m).display === "none") continue;
        const R = m.getBoundingClientRect(), name = m.getAttribute("data-id") || m.className.split(" ")[1].split("__")[1];
        if (R.bottom > T.bottom + 1 || R.right > T.right + 1 || R.left < T.left - 1 || R.top < T.top - 1) r.push(["warn", `${name} runs past the tile`]);
      }
      for (const e of tile.querySelectorAll(`.${P}__name, .${P}__text, .${P}__line`)) if (e.scrollWidth > e.clientWidth + 1 && e.offsetParent) r.push(["warn", `"${e.textContent.trim().slice(0, 40)}" is cut off`]);
      for (const e of tile.querySelectorAll(`.${P}__pill, .${P}__btn, .${P}__tags>span`)) { const m = e.closest(`.${P}__m`), a = e.getBoundingClientRect(), b = m.getBoundingClientRect(); if (e.offsetParent && a.right > b.right - 2) r.push(["warn", `"${e.textContent.trim().slice(0, 40)}" runs to the edge of its module`]); }
      for (const e of tile.querySelectorAll("*")) {
        if (e.closest(`.${P}__m`) === e || e === tile) continue;
        const c = getComputedStyle(e).backgroundColor.match(/[\d.]+/g);
        if (c && (c[3] === undefined || +c[3] > 0.02)) { const [R, G, Bl] = c.map(Number); if (Math.max(R, G, Bl) - Math.min(R, G, Bl) > 24) r.push(["error", `colored fill on ${e.className.baseVal ?? e.className}: color goes on outlines only`]); }
        if (e instanceof SVGGeometryElement && e.closest(`svg.${P}__tethers`) && getComputedStyle(e).fill !== "none") r.push(["error", "a tether shape is filled"]);
      }
      let min = 99; for (const e of tile.querySelectorAll(`.${P}__name, .${P}__line, .${P}__text, .${P}__sub`)) if (e.offsetParent) min = Math.min(min, parseFloat(getComputedStyle(e).fontSize));
      if (min < 10) r.push(["warn", `text as small as ${min.toFixed(1)} px: give the phone its own composition (phone="x y w", .wide-only) or phone-scale:`]);
      return r;
    }, P);
    for (const [lvl, m] of res) (lvl === "error" ? out.errors : out.warns).push(`${view}: ${m}`);
    await page.close();
  }
  // Stills of the finished frame, then the motion: it must end exactly on that frame and stay still.
  const still = async (theme, view, o = {}) => {
    const page = await open(stage(B, out.blocks[theme].html, W[view], S.themes[theme].page, o.gsap, o.pad), W[view], { scale: 2, reduce: o.reduce });
    const el = await page.$(`.${P}__tile`);
    const r = { page, el };
    if (o.keep) return r;
    const buf = await el.screenshot(); await page.close(); return buf;
  };
  for (const [theme, view] of [["dark", "wide"], ["light", "wide"], ["dark", "phone"], ["light", "phone"]]) {
    const name = `${out.tag}-${theme}${view === "phone" ? "-phone" : ""}.png`;
    fs.writeFileSync(path.join(outDir, name), await still(theme, view)); shots.push(name);
  }
  const g = gsapFiles();
  if (!g) out.warns.push("GSAP is not installed in the kit (run.sh setup illustration): motion not checked");
  else {
    const finished = path.join(tmp, "finished.png"); fs.writeFileSync(finished, await still("dark", "wide"));
    const reduced = path.join(tmp, "reduced.png"); fs.writeFileSync(reduced, await still("dark", "wide", { gsap: true, reduce: true }));
    const { page, el } = await still("dark", "wide", { gsap: true, keep: true, pad: true });
    const state = () => page.evaluate(P => { const r = document.querySelector(`.${P}`); return { played: r.getAttribute("data-played"), top: r.getBoundingClientRect().top, vh: innerHeight }; }, P);
    const info = await page.evaluate(P => { const r = document.querySelector(`.${P}`); const tl = r.prismTimeline; return tl ? { dur: tl.duration() } : null; }, P);
    if (!info) out.errors.push("the block's script did not build its timeline");
    else {
      out.seconds = +info.dur.toFixed(2);
      // Below the trigger line nothing plays; once the block's top crosses it, it plays once.
      const line = parseFloat((S.start.split(" ")[1] || "75%")) / 100;
      let st = await state();
      await page.evaluate(([y]) => window.scrollTo(0, y), [st.top - st.vh * (line + 0.08)]); await page.waitForTimeout(250);
      st = await state();
      if (st.played) out.errors.push(`the block played before its top reached the trigger line (${S.start})`);
      await page.evaluate(([y]) => window.scrollTo(0, window.scrollY + y), [st.top - st.vh * (line - 0.05)]); await page.waitForTimeout(250);
      st = await state();
      if (!st.played) out.errors.push(`the block did not play when its top reached the trigger line (${S.start})`);
      const frames = [];
      for (const p of [0, 0.2, 0.4, 0.6, 0.8]) { await page.evaluate(([P, p]) => void document.querySelector(`.${P}`).prismTimeline.progress(p).pause(), [P, p]); const f = path.join(tmp, `f${p}.png`); fs.writeFileSync(f, await el.screenshot()); frames.push(f); }
      // The end must match the markup's finished frame, then nothing moves.
      await page.evaluate(([P]) => void document.querySelector(`.${P}`).prismTimeline.progress(1), [P]);
      await page.waitForTimeout(100);
      const end1 = path.join(tmp, "end1.png"); fs.writeFileSync(end1, await el.screenshot());
      await page.waitForTimeout(600);
      const end2 = path.join(tmp, "end2.png"); fs.writeFileSync(end2, await el.screenshot());
      frames.push(end1);
      await page.close();
      const diff = (a, b) => +execFileSync("python3", ["-I", "-c", "import sys\nfrom PIL import Image, ImageChops, ImageStat\na=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB').resize(a.size)\nprint(sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3)", a, b]).toString();
      if (diff(finished, end1) > 0.6) out.errors.push(`the animation ends ${diff(finished, end1).toFixed(2)} off the markup's finished frame`);
      if (diff(end1, end2) > 0.05) out.errors.push("something keeps moving after the animation ends");
      if (diff(finished, reduced) > 0.05) out.errors.push("reduced motion does not show the finished frame");
      const strip = `${out.tag}-frames.png`;
      execFileSync("python3", ["-I", "-c", "import sys\nfrom PIL import Image\nfs=[Image.open(f).convert('RGB') for f in sys.argv[2:]]\nw=360;fs=[f.resize((w,int(f.height*w/f.width))) for f in fs]\nim=Image.new('RGB',(len(fs)*(w+12)-12,fs[0].height),(255,255,255))\nfor i,f in enumerate(fs): im.paste(f,(i*(w+12),0))\nim.save(sys.argv[1])", path.join(outDir, strip), ...frames]);
      shots.push(strip);
    }
  }
  await browser.close();
  if (!process.env.PRISM_KEEP_STAGE) fs.rmSync(tmp, { recursive: true, force: true });
  // Files: the two blocks, the bench, the stills.
  for (const theme of ["dark", "light"]) { const f = `${out.tag}-${theme}.html`; fs.writeFileSync(path.join(outDir, f), out.blocks[theme].html); files[f] = 1; }
  const bench = `${out.tag}-bench.html`;
  fs.writeFileSync(path.join(outDir, bench), benchHtml([out], B, S, { both: true }));
  files[bench] = 1;
  out.errors.push(...await benchCheck(path.join(outDir, bench)));
  out.files = Object.keys(files); out.shots = shots;
  const crypto = require("crypto"), h = f => crypto.createHash("sha256").update(fs.readFileSync(path.join(outDir, f))).digest("hex");
  fs.writeFileSync(path.join(outDir, ".prism-build.json"), JSON.stringify({ kit: VERSION, format: "illustration", main: `${out.tag}-dark.html`, brand: B.id,
    images: Object.fromEntries(shots.map(f => [f, h(f)])), files: Object.fromEntries(out.files.map(f => [f, h(f)])) }, null, 1));
}

// ---- The bench: generous room at the top, then each mockup beside its heading and copy, sides alternating ----
function benchHtml(items, B, S, o = {}) {
  const g = gsapFiles(), P = S.prefix;
  const T = S.themes, font = n => B.role(n).stack;
  const rows = [];
  items.forEach((it, i) => {
    for (const theme of o.both ? ["dark", "light"] : [it.theme || it.meta.theme || "dark"]) {
      const flip = (rows.length % 2 === 1), full = it.size === "full", m = it.meta;
      const copy = `<div class="copy"><p class="eyebrow">${esc(plain(m.feature))}${m.figures === "illustrative" ? " · Illustrative" : ""}</p><h2>${inline(m.heading || m.title)}</h2><p>${inline(m.copy || m.answer)}</p>
<details><summary>HTML block (${theme})</summary><button type="button" class="copybtn">Copy block</button><pre><code>${esc(it.blocks[theme].html)}</code></pre></details></div>`;
      rows.push(`<section class="row ${theme}${flip ? " flip" : ""}${full ? " full" : ""}" style="--page:${T[theme].page};--ink:${T[theme].ink};--ink-2:${T[theme]["ink-2"]}">
${full ? `${it.blocks[theme].html}<div class="grid">${copy}</div>` : `<div class="grid"><div class="mock">${it.blocks[theme].html}</div>${copy}</div>`}
</section>`);
    }
  });
  const title = items.length === 1 ? plain(items[0].meta.title) : "Feature page";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} bench</title>
<style>${fontFaces(B, true)}
:root{--dark:${T.dark.page};--paper:${T.light.page};color-scheme:light}
html,body{margin:0;overflow-x:hidden}
body{background:var(--dark);color:${T.dark.ink};font-family:${font("prism-font-sans")}}
.top{min-height:110vh;display:flex;flex-direction:column;justify-content:flex-end;padding:0 16px 14vh;box-sizing:border-box;max-width:1240px;margin:0 auto}
.top p{max-width:34em;line-height:1.5;opacity:.75}
.eyebrow{font-family:${font("prism-font-mono")};font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.7;margin:0 0 12px}
h1,h2{font-family:${font("prism-font-serif")};font-weight:500;letter-spacing:-.01em;margin:0 0 16px}
h1{font-size:clamp(34px,5vw,56px);line-height:1.1}
h2{font-size:clamp(28px,3.2vw,40px);line-height:1.15}
.row{background:var(--page);color:var(--ink);padding:120px 0}
.row.full{padding:0 0 80px}
.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px;align-items:center;max-width:1240px;margin:0 auto;padding:0 16px}
.mock{grid-column:1 / span 7;grid-row:1}.copy{grid-column:9 / span 4;grid-row:1}
.flip .mock{grid-column:6 / span 7}.flip .copy{grid-column:1 / span 4}
.full .copy{grid-column:1 / span 6;padding-top:48px}
.copy>p{color:var(--ink-2);font-size:18px;line-height:1.55;margin:0 0 20px}
details{font-size:13px;color:var(--ink-2)}summary{cursor:pointer;font-family:${font("prism-font-mono")};letter-spacing:.08em;text-transform:uppercase;font-size:11px}
pre{max-height:240px;overflow:auto;white-space:pre-wrap;word-break:break-all;font-size:11px;line-height:1.4;padding:12px;border-radius:8px;border:1px solid currentColor;opacity:.85}
.copybtn,.tools button{font:inherit;font-size:12px;color:inherit;background:transparent;border:1px solid currentColor;border-radius:999px;padding:6px 14px;cursor:pointer;margin:10px 0}
.tools{position:fixed;right:16px;bottom:16px;display:flex;gap:8px;z-index:9;color:${T.dark.ink}}
.tools button{background:${T.dark.page};margin:0}
#line{position:fixed;left:0;right:0;top:75%;border-top:1px dashed ${T.dark["t-accent"]};z-index:8;display:none;pointer-events:none}
#line.on{display:block}
.end{height:60vh}
@media (max-width:1024px){.grid{grid-template-columns:minmax(0,1fr)}.mock,.copy,.flip .mock,.flip .copy,.full .copy{grid-column:1;grid-row:auto}.copy{padding-top:24px}.row{padding:72px 0}}
</style>
${g ? g.map(f => `<script>${fs.readFileSync(f, "utf8")}</script>`).join("\n") : ""}
</head><body>
<header class="top"><p class="eyebrow">Prism bench · ${esc(B.name)} · website illustration${items.length > 1 ? "s" : ""}</p><h1>${esc(title)}</h1>
<p>Scroll down. Each mockup plays once when its top reaches the trigger line (${esc(S.start)}), then holds its finished frame. With reduced motion, or without JavaScript, the finished frame shows at once.</p></header>
${rows.join("\n")}
<div class="end"></div>
<div id="line"></div>
<div class="tools"><button type="button" onclick="document.getElementById('line').classList.toggle('on')">Trigger line</button><button type="button" onclick="window.scrollTo(0,0);setTimeout(function(){location.reload()},60)">Replay</button></div>
<script>document.querySelectorAll(".copybtn").forEach(function(b){b.addEventListener("click",function(){var t=b.parentNode.querySelector("code").textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent="Copied"},function(){var r=document.createRange();r.selectNodeContents(b.parentNode.querySelector("code"));getSelection().removeAllRanges();getSelection().addRange(r);b.textContent="Selected: copy it"})})})</script>
</body></html>
`;
}

// The bench at a phone and a desktop width: never a sideways scroll.
async function benchCheck(file) {
  const { chromium } = require("playwright"), exe = process.env.PRISM_CHROMIUM, errs = [];
  const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}) });
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto("file://" + file); await page.evaluate(() => document.fonts.ready);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 0) errs.push(`the bench scrolls sideways by ${over} px at ${width} px wide`);
    await page.close();
  }
  await browser.close();
  return errs;
}

function report(o) {
  for (const w of o.warns) console.warn(`[illustration] ${w}`);
  for (const e of o.errors) console.error(`[illustration] ERROR ${e}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "bench") {
    const outFile = path.resolve(args[1]), mds = args.slice(2).filter(a => !a.startsWith("--"));
    if (!mds.length) { console.error("usage: build-illustration.js bench out/bench.html formats/a.md formats/b.md ..."); process.exit(2); }
    const items = [];
    for (const md of mds) { const o = await buildOne(md, path.join(path.dirname(outFile), path.basename(md, ".md")), {}); report(o); if (o.errors.length) process.exit(1); items.push(o); }
    // Neighbors never share a ground.
    let bad = 0;
    for (let i = 1; i < items.length; i++) if (items[i].ground === items[i - 1].ground) { console.error(`[illustration] ERROR ${items[i - 1].tag} and ${items[i].tag} sit next to each other on the same ground (${items[i].ground}); give one another ground`); bad++; }
    if (bad) process.exit(1);
    const B = require("./brand.js")(path.resolve(mds[0]));
    fs.writeFileSync(outFile, benchHtml(items, B, settings(B)));
    const errs = await benchCheck(outFile);
    for (const e of errs) console.error(`[illustration] ERROR ${e}`);
    if (errs.length) process.exit(1);
    console.log(`bench: ${outFile} (${items.length} illustrations)`);
    return;
  }
  const md = args[0];
  if (!md) { console.error("usage: build-illustration.js formats/illustration.md [outdir] [--no-render]"); process.exit(2); }
  const outDir = path.resolve(args[1] && !args[1].startsWith("--") ? args[1] : path.join(path.dirname(path.resolve(md)), "illustration"));
  const o = await buildOne(md, outDir, { render: !args.includes("--no-render") });
  report(o);
  if (o.errors.length) process.exit(1);
  console.log(`illustration: ${o.tag} (${o.size}, ground ${o.ground}, ${o.seconds} s) -> ${outDir}`);
  for (const f of [...(o.files || []), ...(o.shots || [])]) console.log(`  ${f}`);
}

module.exports = { parse, compile, schedule, settings, ground, buildOne, benchHtml };
if (require.main === module) main().catch(e => { console.error(e.stack || e); process.exit(1); });
