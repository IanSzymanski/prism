#!/usr/bin/env node
// Format files (sheet, blog, brochure, deck, social, story, email, carousel) -> plain wireframe artboards for Claude Design,
// plus wire.json per format, the snapshot the diff compares edits against. Content and spacing only; styling comes back from the kit.
// Slides, posts and panels are drawn as frames at their real proportions, one block per frame.
// Usage: node build-wire.js formats/deck.md wire/deck                       (one format: deck.dc.html, wire.json, the board size)
//        node build-wire.js formats/*.md --out wire --canvas wire/canvas --title "Piece design" [--stamp "Exported v3"]
//   Several formats share one browser; each goes to <out>/<format>/. --canvas also writes <dir>/project/<format>.dc.html and
//   canvas.json (kept and merged when it exists), and prints the files to publish. Photos show when wire/assets.json maps them.
const path = require("path"), fs = require("fs");

const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const canvasDir = opt("--canvas"), title = opt("--title"), stamp = opt("--stamp"), outOpt = opt("--out"), assetsOpt = opt("--assets");
const mds = args.filter(a => /\.md$/.test(a)).map(a => path.resolve(a)), loose = args.filter(a => !/\.md$/.test(a));
if (!mds.length) { console.error("usage: build-wire.js FORMAT.md [OUT_DIR] | FORMAT.md... --out wire [--canvas DIR --title T] [--stamp TEXT]"); process.exit(2); }
const outRoot = path.resolve(outOpt || (mds.length > 1 ? "wire" : loose[0] ? path.dirname(path.resolve(loose[0])) : path.join(path.dirname(mds[0]), "wire")));
const outFor = md => mds.length === 1 && loose[0] ? path.resolve(loose[0]) : path.join(outRoot, path.basename(md, ".md"));
// Uploaded photos, by the path the format file uses: {"images/visit.jpg": "/_blob/..."}; boards show them instead of grey boxes.
const assetsFile = assetsOpt ? path.resolve(assetsOpt) : path.join(outRoot, "assets.json");
const ASSETS = fs.existsSync(assetsFile) ? JSON.parse(fs.readFileSync(assetsFile, "utf8")) : {};

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The board's look, once per board as classes, so boards stay small to publish and read back. Component outlines are
// blue dashed guides with a label chip, so they never read as a card (cards are solid grey on white).
const CSS = `body{margin:0;font-family:system-ui,sans-serif;background:#F4F4F6}
.wr{box-sizing:border-box;background:#FFFFFF;color:#3A3A40}
.wr-flow{padding:64px 72px;display:flex;flex-direction:column;gap:18px}
.wr-frames{padding:56px 48px;display:flex;flex-flow:row wrap;align-content:flex-start;align-items:flex-start;gap:28px 24px}
.wr-frames>.wfull{flex:0 0 100%}
.wb{position:relative;padding:26px 20px 16px;margin-top:6px;border:1px dashed #7DA2D6;border-radius:2px;display:flex;flex-direction:column;gap:10px}
.wt{position:absolute;left:10px;top:-9px;padding:3px 7px;border-radius:4px;background:#E7EFFB;font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#3C66A8;white-space:nowrap}
.wp{position:relative;padding:4px 0}
.wrow{display:grid;gap:12px}
.wi{padding:14px 16px;border:1.5px solid #D6D6DB;border-radius:8px;background:#FFFFFF;display:flex;flex-direction:column;gap:6px}
.wimg{position:relative;overflow:hidden;background:#E6E6EA;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#77777F;font:500 13px/1.3 system-ui,sans-serif;text-align:center;padding:12px}
.wimg>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.wimg.has-photo{align-items:flex-end;color:#FFFFFF;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.wimg-i{display:block;margin:0 0 6px;padding:18px 8px;font-size:12px}
.wx{margin:0;font:400 15px/1.55 system-ui,sans-serif;color:#3A3A40}
.wh{margin:0;font:700 26px/1.2 system-ui,sans-serif;color:#1C1C24}
.wh1{font-size:34px}.wh3{font-size:19px}.wh4{font-size:13px;text-transform:uppercase;letter-spacing:.1em}
.wstrong{font-weight:700;color:#1C1C24}
.wbtn{display:inline-block;padding:9px 18px;border:1.5px solid #8A8A93;border-radius:8px;font-weight:600}
.wic{display:inline-block;width:22px;height:22px;vertical-align:-5px;margin-right:8px;color:#55555D}
.wic>svg{width:100%;height:100%;fill:currentColor;display:block}
.wic.none{box-sizing:border-box;border:1.5px solid #9A9AA2;border-radius:6px}
.wurl{display:inline-block;margin:0 4px;padding:1px 6px;border-radius:4px;background:#EEF3FB;font:500 11px/1.5 ui-monospace,Menlo,monospace;color:#3C66A8;vertical-align:1px}
a.wlink{color:inherit;text-decoration:underline;text-decoration-color:#7DA2D6}
.wf{position:relative;display:flex;flex-direction:column;gap:10px}
.wfi{position:relative;box-sizing:border-box;padding:34px 26px 22px;border:1.5px solid #B9B9C1;border-radius:10px;background:#FFFFFF;overflow:hidden}
.wfi.sq{border-radius:2px}
.wfl{position:absolute;left:12px;top:9px;font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:#8A8A93}
.wfz{display:flex;flex-direction:column;gap:14px}
.wnote{background:#F7F7F9;padding:24px 14px 12px}
.wnote .wx{font-size:13px}
.wcta{background:#EDEDF0}.wcentered{max-width:66%;margin-left:auto;margin-right:auto}
.wmeta-t{margin:0;font:700 34px/1.3 system-ui,sans-serif;color:#1C1C24}
.wmeta-e{margin:0;font:600 12px/1.3 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#6A6A73}
.wmeta-s{margin:0;font:400 17px/1.3 system-ui,sans-serif;color:#1C1C24}
.wstamp{display:inline-block;padding:4px 8px;border-radius:4px;background:#EAF6EF;font:600 11px/1 ui-monospace,Menlo,monospace;color:#2C7A4B;letter-spacing:.06em}
.wdiv{height:2px;background:#D6D6DB;margin:8px 0}`;

let ICONS = null;
const iconSvg = (B, n) => {
  if (!ICONS) { try { ICONS = JSON.parse(fs.readFileSync(B.icons.paths, "utf8")); } catch (e) { ICONS = {}; } }
  // The chosen icon itself at the brand's weight (same paths as the PDFs), so layout decisions see the real shape.
  return ICONS[n] ? `<span data-icon="${n}" class="wic"><svg viewBox="0 0 1024 1024" aria-hidden="true"><path d="${ICONS[n]}"></path></svg></span>`
    : `<span data-icon="${n}" class="wic none"></span>`;
};

function wireOne(md, B) {
  const outDir = outFor(md);
  fs.mkdirSync(outDir, { recursive: true });
  const src = fs.readFileSync(md, "utf8");
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  const meta = {};
  for (const l of (fm ? fm[1] : "").split("\n")) { const m = /^([\w-]+):\s*(.*)$/.exec(l); if (m) meta[m[1]] = m[2].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, ""); }
  let body = fm ? src.slice(fm[0].length) : src;
  // A carousel wraps its panels in one outer fence: keep that fence aside so its panels become blocks that can move.
  let wrapOpen = "", wrapClose = "";
  { const m = /^(:{5,})\s*\{[^}]*\.carousel[^}]*\}\s*$/m.exec(body);
    if (m) { const close = new RegExp("^" + m[1] + "\\s*$", "m"), rest = body.slice(m.index + m[0].length), c = close.exec(rest);
      if (c) { wrapOpen = m[0]; wrapClose = c[0]; body = body.slice(0, m.index) + rest.slice(0, c.index) + rest.slice(c.index + c[0].length); } } }
  const board = path.basename(md).replace(/\.md$/, "") + ".dc.html";
  const W_ = (B.ornaments && B.ornaments.wire) || {};

  // Split the body into top-level blocks, keeping each block's exact Markdown so moves can be applied mechanically.
  function chunks(text) {
    const lines = text.split("\n"), out = [];
    let cur = [], fence = 0, code = false;
    const flush = () => { if (cur.length && cur.some(l => l.trim())) out.push(cur.join("\n").trim()); cur = []; };
    for (const l of lines) {
      if (!fence && !code && /^```/.test(l)) { flush(); code = true; cur.push(l); continue; }
      if (code) { cur.push(l); if (/^```\s*$/.test(l)) { code = false; flush(); } continue; }
      // Fenced divs nest (pandoc closes the innermost open one), so count depth rather than matching colons.
      const f = /^(:{3,})\s*(\S.*)?$/.exec(l);
      if (f && f[2] && !fence) { flush(); fence = 1; cur.push(l); continue; }
      if (fence) { cur.push(l); if (f) fence += f[2] ? 1 : -1; if (!fence) flush(); continue; }
      if (!l.trim()) { flush(); continue; }
      if (/^: /.test(l) && out.length && /^\|/.test(out[out.length - 1])) { out[out.length - 1] += "\n\n" + l; continue; }
      cur.push(l);
    }
    flush();
    return out;
  }
  const blocks = chunks(body);

  const imgSrc = f => ASSETS[f] ? `<img src="${esc(ASSETS[f])}" alt="" style="object-position: ${esc(B.focus(B.src(f, path.dirname(md))) || "50% 50%")}">` : "";
  // A link shows its address in a chip after the text: retype the chip to change it.
  const url = u => `<span data-url="" class="wurl">${u}</span>`;
  // Inline Markdown to plain wireframe text: bold and emphasis kept, icons drawn, links with their address, footnotes dropped.
  // Addresses are set aside while emphasis is read, so merge tags such as *|UNSUB|* stay whole.
  const inline = s => { const kept = [], keep = u => `\u0000${kept.push(u) - 1}\u0000`;
    return esc(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)(\{[^}]*\})?/g, (m, alt, f) => `<span data-image="${keep(f)}" class="wimg wimg-i">Image: ${alt || f.split("/").pop()}</span>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)\{[^}]*\.button[^}]*\}/g, (m, t, u) => `<span data-button="" class="wbtn">${t}</span>${url(keep(u))}`)
    .replace(/\[\]\{\.icon \.ph-([a-z0-9-]+)[^}]*\}/g, (m, n) => iconSvg(B, n))
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/\[([^\]]*)\]\{\.[^}]*\}/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)(\{[^}]*\})?/g, (m, t, u) => `<a href="${keep(u)}" class="wlink">${t}</a>${url(keep(u))}`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\ /g, " ")
    .replace(/\u0000(\d+)\u0000/g, (m, i) => kept[i]); };
  const plainOf = s => s.replace(/\[\]\{[^}]*\}/g, "").replace(/\[\^[^\]]+\]/g, "").replace(/\[([^\]]*)\]\{[^}]*\}/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*`]|\\ /g, m => m === "\\ " ? " " : "").replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();

  const tag = t => `<span data-wire-tag="" class="wt">${esc(t)}</span>`;
  const listItems = s => s.split("\n").filter(l => /^\s*(-|\d+\.)\s/.test(l)).map(l => l.replace(/^\s*(-|\d+\.)\s+/, ""));
  const paras = s => s.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const imgBox = (alt, file, h) => { const ph = imgSrc(file);
    return `<div data-image="${esc(file)}" class="wimg${ph ? " has-photo" : ""}" style="height: ${h}px">${ph}<span style="position: relative">Image: ${esc(alt || path.basename(file))}</span></div>`; };

  // Frame size (real px) and display scale for slides, posts and panels; null means the block flows like a sheet.
  function frameOf(first) {
    const c = first.match(/\.[\w-]+/g) || [];
    const has = k => c.includes("." + k);
    if (has("slide")) return { w: 1280, h: 720, k: 816 / 1280, z: 1, kind: "slide", label: (c.find(x => !/^\.(slide|no-rule|flip)$/.test(x)) || ".content").slice(1) };
    if (has("panel") && meta.layout === "brochure") { const n = has("full") ? 3 : has("wide") ? 2 : 1;
      return { w: 352 * n, h: 816, k: 1, z: 0.78, kind: "panel", label: (c.find(x => /^\.(flap|back|cover|wide|full)$/.test(x)) || ".inside").slice(1), cols: n }; }
    if (has("panel")) return { w: 1080, h: 1350, k: 0.42, z: 1, kind: "panel", label: has("cover") ? "cover" : has("end") ? "end" : "panel", tight: true };
    if (has("post")) {
      const [w, h] = has("email") ? [1200, has("short") ? 300 : has("tall") ? 520 : 420] : has("story") ? [1080, 1920] : has("portrait") ? [1080, 1350] : has("wide") ? [1200, 627] : [1080, 1080];
      const k = has("email") ? 816 / 1200 : has("story") ? 0.4 : 0.46;
      return { w, h, k, z: 1, kind: has("email") ? "email" : has("story") ? "story" : "post", label: `${w}×${h}` };
    }
    return null;
  }
  let frameNo = 0, section = 0;
  function renderFrame(b, id, f) {
    frameNo++;
    const lines = b.split("\n"), inner = lines.slice(1, /^:{3,}\s*$/.test(lines[lines.length - 1]) ? -1 : undefined).join("\n");
    const parts = chunks(inner), side = [], on = [];
    parts.forEach(p => (/^:{3,}\s*\{?\s*\.?(notes|caption)\b/.test(p) ? side : on).push(p));
    // Inner blocks are drawn with the sheet renderer, then renamed so the diff reads them as items of this frame.
    const W = Math.round(f.w * f.k), H = Math.round(f.h * f.k);
    const part = (p, i, style = "") => `<div data-item="${id}.${i}"${style ? ` style="${style}"` : ""}>${render(p, "x").replace(/data-(block|item)="[^"]*"/g, "data-part=\"\"")}</div>`;
    let body;
    if (/\.split\b/.test(lines[0]) && on.some(p => /^!\[/.test(p))) {
      // Split posts: text on the left, the photo filling the right half.
      const pi = on.findIndex(p => /^!\[/.test(p)), x = /!\[([^\]]*)\]\(([^)]+)\)/.exec(on[pi]);
      body = `<div style="display: flex; gap: 20px"><div style="flex: 1; display: flex; flex-direction: column; gap: 14px">${on.map((p, i) => i === pi ? "" : part(p, i)).join("")}</div>` +
        `<div data-item="${id}.${pi}" style="flex: 1">${imgBox(x[1], x[2], Math.max(120, H / f.z - 70))}</div></div>`;
    } else if (f.cols > 1) {
      // Brochure spreads: columns sit side by side across the folds, as printed; other blocks span the spread.
      body = `<div style="display: grid; grid-template-columns: repeat(${f.cols}, minmax(0, 1fr)); gap: 16px 22px">${on.map((p, i) => {
        const c = /^:{3,}\s*\{?\s*\.?col\b/.test(p), span = c ? (/\.two\b/.test(p.split("\n")[0]) ? 2 : /\.three\b/.test(p.split("\n")[0]) ? 3 : 1) : f.cols;
        return part(p, i, `grid-column: span ${Math.min(span, f.cols)}`); }).join("")}</div>`;
    } else body = on.map((p, i) => part(p, i)).join("");
    const empty = !on.length && f.label === "title" ? `<span data-wire-tag="" class="wfl" style="position: static; font-size: 12px">Title slide: drawn from the title, subtitle and eyebrow above</span>` : "";
    const notes = side.map(p => { const t = /\bnotes\b/.test(p.split("\n")[0]) ? "speaker notes, not on the slide" : "caption, not on the image";
      return `<div class="wb wnote">${tag(t)}${paras(p.replace(/^:{3,}.*\n/, "").replace(/\n:{3,}\s*$/, "")).map(x => `<p class="wx">${inline(x)}</p>`).join("")}</div>`; }).join("");
    const label = f.kind === "slide" ? `slide ${frameNo} · ${f.label}` : `${f.kind} · ${f.label}`;
    return `<div data-block="${id}" class="wf" style="width: ${W}px">` +
      `<div class="wfi${f.kind === "panel" && !f.tight ? " sq" : ""}" style="width: ${W}px; min-height: ${H}px"><span data-wire-tag="" class="wfl">${esc(label)}</span>` +
      `<div class="wfz"${f.z !== 1 ? ` style="zoom: ${f.z}"` : ""}>${empty}${body}</div></div>${notes}</div>`;
  }

  // A heading; in flowing formats (sheets, brochures, blogs) a brand may draw its section ornament in lo-fi beside it.
  function heading(level, text, id, inFlow) {
    const t = inline(text.replace(/\s*\{[^}]*\}\s*$/, "")), noRule = /\{[^}]*\.no-rule/.test(text);
    let deco = { before: "", after: "", cls: "" };
    if (level === 2 && inFlow && id !== "x") { section++; if (W_.heading && !noRule) deco = { ...deco, ...W_.heading({ n: section, text: plainOf(text) }, B) }; }
    // Beside the heading (a rule running to the edge) or stacked with it (a number above, a rule below).
    const box = !(deco.before || deco.after) ? "" : deco.column ? ' style="display: flex; flex-direction: column; gap: 6px"' : ' style="display: flex; align-items: center; gap: 14px"';
    return `<div data-block="${id}" class="wp${deco.cls ? " " + deco.cls : ""}"${box}>${deco.before}<div class="wh wh${level}"${box && !deco.column ? ' style="flex: 0 1 auto"' : ""}>${t}</div>${deco.after}</div>`;
  }

  // One wireframe block per top-level Markdown block; items inside rows carry their own ids so moves inside a row show too.
  function render(b, id) {
    const first = b.split("\n")[0];
    const fr = id !== "x" && frameOf(first);
    if (fr) return renderFrame(b, id, fr);
    const inner = b.replace(/^:{3,}.*\n/, "").replace(/\n:{3,}\s*$/, "").replace(/^:{3,}\s*$/, "");
    const wrap = (label, html, cls = "") => `<div data-block="${id}" class="wb${cls ? " " + cls : ""}">${tag(label)}${html}</div>`;
    let m;
    if ((m = /^(#{1,4})\s+(.*)$/.exec(first)) && b.split("\n").length === 1) return heading(m[1].length, m[2], id, !framed && meta.layout !== "email");
    if ((m = /^:{3,}\s*\{?\s*\.?([\w-]+)/.exec(first))) {
      const cls = m[1], classes = first.match(/\.[\w-]+/g) || [`.${cls}`];
      const kind = cls === "hero-image" ? "hero image" : cls === "cta-card" ? (classes.includes(".plain") ? "closing (content only)" : classes.includes(".centered") ? "closing card, centred" : "closing card") : cls;
      if (["stats", "features", "checks", "flow", "cards"].includes(cls)) {
        const items = listItems(inner), cols = cls === "checks" ? 1 : cls === "cards" ? 2 : cls === "features" ? (meta.layout === "email" ? 1 : classes.includes(".three") ? 3 : 2) : Math.min(items.length, 5);
        return wrap(`${kind} ×${items.length}`, `<div class="wrow" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr))">${items.map((t, i) =>
          `<div data-item="${id}.${i}" class="wi"><p class="wx">${inline(t)}</p></div>`).join("")}</div>`);
      }
      if (cls === "cols") return wrap("two columns", `<div class="wrow" style="grid-template-columns: repeat(2, minmax(0, 1fr))">${paras(inner).map((t, i) =>
        `<div data-item="${id}.${i}"><p class="wx">${inline(t)}</p></div>`).join("")}</div>`);
      if (cls === "gallery") { const ims = [...inner.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
        return wrap(`gallery ×${ims.length}`, `<div class="wrow" style="grid-template-columns: repeat(${ims.length}, minmax(0, 1fr))">${ims.map((x, i) => `<div data-item="${id}.${i}">${imgBox(x[1], x[2], 150)}</div>`).join("")}</div>`); }
      if (cls === "hero-image") { const x = /!\[([^\]]*)\]\(([^)]+)\)/.exec(inner) || [];
        return wrap(kind, imgBox(x[1], x[2] || "", 220)); }
      if (cls === "media") { const x = /!\[([^\]]*)\]\(([^)]+)\)/.exec(inner) || [], rest = inner.replace(/!\[[^\]]*\]\([^)]+\)(\{[^}]*\})?/, "");
        const flip = classes.includes(".flip");
        const pic = `<div style="width: 42%; flex-shrink: 0">${imgBox(x[1], x[2] || "", 190)}</div>`, txt = `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 8px">${paras(rest).map(t => `<p class="wx">${inline(t.replace(/^#+\s*/, ""))}</p>`).join("")}</div>`;
        return wrap("image + text", `<div style="display: flex; gap: 18px; align-items: center">${flip ? txt + pic : pic + txt}</div>`); }
      if (cls === "ornament" && !inner.trim()) return wrap("brand divider", W_.divider ? W_.divider({}, B) : `<div class="wdiv"></div>`);
      // callout, closing card, band and anything else: its text in order.
      // The closing card in lo-fi: the brand's card, centred and narrower for .centered, no ground for .plain (content only).
      const lofi = cls !== "cta-card" || classes.includes(".plain") ? "" : `${W_.closing ? W_.closing({}, B) : "wcta"}${classes.includes(".centered") ? " wcentered" : ""}`;
      return wrap(kind, chunks(inner).map(t => /^#{2,4}\s/.test(t) && !t.includes("\n") ? `<p class="wx wstrong">${inline(t.replace(/^#+\s*/, "").replace(/\s*\{[^}]*\}\s*$/, ""))}</p>`
        : render(t, "x").replace(/data-(block|item)="[^"]*"/g, 'data-part=""')).join(""), lofi);
    }
    if (/^```chart/.test(first)) {
      const cap = (/^caption:\s*(.*)$/m.exec(b) || [, ""])[1], type = (/^type:\s*(\w+)/m.exec(b) || [, "chart"])[1];
      return wrap(`${type} chart`, `<div class="wimg" style="height: 170px">Chart: ${esc(cap)}</div>`);
    }
    if (/^\|/.test(first)) {
      const rows = b.split("\n").filter(l => /^\|/.test(l) && !/^\|\s*-/.test(l)).map(l => l.replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
      const n = rows[0].length;
      return wrap(`table ${rows.length - 1}×${n}`, `<div style="display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); border-top: 1.5px solid #D6D6DB">${rows.flatMap((r, ri) =>
        r.map(c => `<div style="padding: 8px 6px; border-bottom: 1px solid #E2E2E6; font: ${ri ? 400 : 700} 13px/1.4 system-ui, sans-serif">${inline(c)}</div>`)).join("")}</div>`);
    }
    if (/^>/.test(first)) return wrap("quote", b.split("\n").map(l => l.replace(/^>\s?/, "")).join("\n").split(/\n\s*\n/).filter(t => t.trim()).map(t =>
      `<p class="wx" style="font-size: 19px">${inline(t)}</p>`).join(""));
    if (/^!\[/.test(first)) { const x = /!\[([^\]]*)\]\(([^)]+)\)/.exec(b);
      return /\{[^}]*\.logo/.test(b) ? `<div data-block="${id}" class="wp"><div class="wimg" style="height: 34px; width: 150px; padding: 0">Logo</div></div>` : wrap("image", imgBox(x[1], x[2], 240)); }
    if (/^\s*(-|\d+\.)\s/.test(first)) return wrap("list", listItems(b).map((t, i) => `<p data-item="${id}.${i}" class="wx">• ${inline(t)}</p>`).join(""));
    return `<div data-block="${id}" class="wp"><p class="wx">${inline(b)}</p></div>`;
  }

  // Footnote definitions and page breaks stay in the source but aren't drawn.
  const shown = [], hidden = [];
  blocks.forEach((b, i) => (/^\[\^[^\]]+\]:/.test(b) || /^:{3,}\s*page-break/.test(b) ? hidden : shown).push({ id: `b${String(i).padStart(2, "0")}`, md: b }));
  // Frames sit in a wrapping row (a brochure reads as its two printed sides, posts as a grid); sheets and blogs flow in one column.
  const framed = shown.some(b => frameOf(b.md.split("\n")[0]));
  const isEmail = meta.layout === "email";
  const full = framed ? " wfull" : "";
  const head = (stamp ? `<div data-wire-tag="" class="${full.trim()}"><span class="wstamp">${esc(stamp)}</span></div>` : "") + (isEmail
    ? `<div data-block="meta.inbox" class="wb wnote">${tag("inbox: subject and preheader")}` + ["subject", "preheader"].filter(k => meta[k]).map(k =>
      `<div data-item="meta.${k}"><p class="wx${k === "subject" ? " wstrong" : ""}"${k === "preheader" ? ' style="font-size: 14px"' : ""}>${inline(meta[k])}</p></div>`).join("") + `</div>`
    : [["title", "t"], ["eyebrow", "e"], ["subtitle", "s"]].filter(([k]) => meta[k]).map(([k, c]) =>
      `<div data-block="meta.${k}" class="wp${full}"><p class="wmeta-${c}">${inline(meta[k])}</p></div>`).join(""));
  const inner = head + shown.map(b => render(b.md, b.id)).join("\n");
  const W = isEmail ? 744 : !framed ? 816 : meta.layout === "brochure" ? 1200 : shown.some(b => /\.slide\b|\.email\b/.test(b.md.split("\n")[0])) ? 960 : 1140;
  const page = h => `<div data-wire-root="" class="wr ${framed ? "wr-frames" : "wr-flow"}" style="width: ${W}px; height: ${h}">\n${inner}\n</div>`;
  const css = CSS + (W_.css ? "\n" + W_.css : "");
  const name = meta.pagetitle || (meta.title || meta.subject || path.basename(md, ".md")).replace(/\*/g, "");
  return { md, outDir, board, W, page, css, name, write(H) {
    fs.writeFileSync(path.join(outDir, board), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(name)} wireframe</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
${css}
</style>
</helmet>
${page(H + "px")}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${W},"height":${H}}}'>
class Component extends DCLogic {
renderVals() { return {}; }
}
</script>
</body>
</html>
`);
    fs.writeFileSync(path.join(outDir, "wire.json"), JSON.stringify({ source: path.basename(md), board, frontMatter: fm ? fm[0] : "", wrapOpen, wrapClose, meta,
      blocks: shown.map(b => ({ id: b.id, md: b.md, text: plainOf(b.md.replace(/^:{3,}.*$/gm, "").replace(/^```[\s\S]*?```$/m, (m) => (/caption:\s*(.*)/.exec(m) || [, ""])[1])) })),
      hidden: hidden.map(b => ({ id: b.id, md: b.md })), size: { w: W, h: H } }, null, 1));
    console.log(`wrote ${board} (${W}×${H}, ${shown.length} blocks) and wire.json to ${outDir}`);
  } };
}

(async () => {
  const brand = require("./brand.js");
  const jobs = mds.map(md => wireOne(md, brand(md)));
  // Measure every board's content height in one browser, so each artboard is exactly as tall as its wireframe.
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  for (const j of jobs) {
    await p.setViewportSize({ width: j.W, height: 800 });
    // Photos are left out of the measure: their boxes have fixed heights.
    await p.setContent(`<style>${j.css}</style><body style="margin:0">${j.page("auto").replace(/<img [^>]*>/g, "")}</body>`);
    j.write(Math.ceil(await p.evaluate(() => document.querySelector("[data-wire-root]").scrollHeight)) + 8);
  }
  await browser.close();
  if (!canvasDir) return;

  // The canvas index: boards left to right, 80 px apart, and the how-to note. An existing index (read back from the canvas
  // before a layout change) keeps its keys, the person's notes and every board's position; only sizes and new boards change.
  const proj = path.join(path.resolve(canvasDir), "project"), idxPath = path.join(proj, "canvas.json");
  fs.mkdirSync(proj, { recursive: true });
  const old = fs.existsSync(idxPath) ? fs.readFileSync(idxPath, "utf8") : null;
  const idx = old ? JSON.parse(old) : { v: 3, createdOnFiles: { v: 1, at: new Date().toISOString().replace(/\.\d+Z$/, "Z") }, title: title || "Design", launch: { view: "canvas" }, pages: [], boards: {}, order: [], notes: {}, designSystems: [] };
  if (title && !old) idx.title = title;
  let x = Math.max(0, ...Object.values(idx.boards).map(b => b.x + b.w + 80));
  const files = {};
  for (const j of jobs) {
    fs.copyFileSync(path.join(j.outDir, j.board), path.join(proj, j.board));
    files["project/" + j.board] = "project/" + j.board;
    const size = JSON.parse(fs.readFileSync(path.join(j.outDir, "wire.json"), "utf8")).size;
    const b = idx.boards[j.board];
    if (b) { b.w = size.w; b.h = size.h; }
    else { idx.boards[j.board] = { x, y: 0, w: size.w, h: size.h, title: `${j.name} · ${path.basename(j.md, ".md")}` }; idx.order.push(j.board); x += size.w + 80; }
  }
  if (!idx.notes.howto) idx.notes.howto = { x, y: 0, w: 420, fill: "purple", text: "Design mode: real words, rough spacing, no styling. Edit text in place, drag blocks or slides into a new order, delete what should go; a link's address is the blue chip after it. Tell Claude \"done\" and the changes go back into the Markdown, get checked for typos and numbering, and the branded files are exported. After that, every change you ask for is exported again." };
  const next = JSON.stringify(idx, null, 1);
  // Compared as data, not text: an index read back from the canvas may be formatted differently.
  const indexChanged = !old || JSON.stringify(JSON.parse(old)) !== JSON.stringify(idx);
  if (indexChanged) fs.writeFileSync(idxPath, next);
  // What to publish: the index only when it changed (new board, new size), then the boards.
  const first = indexChanged ? idxPath : path.join(proj, jobs[0].board);
  if (!indexChanged) delete files["project/" + jobs[0].board];
  console.log(`canvas: ${path.resolve(canvasDir)}${indexChanged ? " (index changed: send it)" : " (index unchanged)"}`);
  console.log("publish: " + JSON.stringify({ root: path.resolve(canvasDir), file_path: first, files }));
})();
