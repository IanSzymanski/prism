#!/usr/bin/env node
// Any format file (sheet, blog, brochure, deck, social, story, email, carousel) -> a plain wireframe artboard for
// Claude Design, plus wire.json, the snapshot the diff compares edits against. Content and spacing only; styling comes back from the kit.
// Slides, posts and panels are drawn as frames at their real proportions, one block per frame.
// Usage: node build-wire.js formats/deck.md wire/deck   (writes deck.dc.html, wire.json and the board size)
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright");

const md = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3] || path.join(path.dirname(md), "wire"));
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

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Inline Markdown to plain wireframe text: bold and emphasis kept, icons shown as a named square, footnotes dropped.
const inline = s => esc(s)
  .replace(/!\[([^\]]*)\]\(([^)]+)\)(\{[^}]*\})?/g, (m, alt, f) => `<span data-image="${f}" style="display: block; background: #E6E6EA; border-radius: 6px; padding: 18px 8px; margin: 0 0 6px; text-align: center; font: 500 12px/1.3 system-ui, sans-serif; color: #77777F">Image: ${alt || f.split("/").pop()}</span>`)
  .replace(/\[([^\]]+)\]\(([^)]+)\)\{[^}]*\.button[^}]*\}/g, '<span data-button="" style="display: inline-block; padding: 9px 18px; border: 1.5px solid #8A8A93; border-radius: 8px; font-weight: 600">$1</span>')
  .replace(/\[\]\{\.icon \.ph-([a-z0-9-]+)[^}]*\}/g, (m, n) => `<span data-icon="${n}" style="display: inline-block; width: 22px; height: 22px; border: 1.5px solid #9A9AA2; border-radius: 6px; vertical-align: -5px; margin-right: 8px"></span>`)
  .replace(/\[\^[^\]]+\]/g, "")
  .replace(/\[([^\]]*)\]\{\.[^}]*\}/g, "$1")
  .replace(/\[([^\]]+)\]\([^)]+\)(\{[^}]*\})?/g, '<u>$1</u>')
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/\*([^*]+)\*/g, "<em>$1</em>")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/\\ /g, " ");
const plainOf = s => s.replace(/\[\]\{[^}]*\}/g, "").replace(/\[\^[^\]]+\]/g, "").replace(/\[([^\]]*)\]\{[^}]*\}/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*`]|\\ /g, m => m === "\\ " ? " " : "").replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();

const S = {
  block: "position: relative; padding: 30px 22px 18px; border: 1.5px dashed #C9C9CF; border-radius: 10px; display: flex; flex-direction: column; gap: 10px",
  plain: "position: relative; padding: 4px 0",
  tag: "position: absolute; left: 12px; top: 8px; font: 600 10px/1 ui-monospace, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; color: #8A8A93",
  row: "display: grid; gap: 12px",
  item: "padding: 14px 16px; border: 1.5px solid #D6D6DB; border-radius: 8px; background: #FFFFFF; display: flex; flex-direction: column; gap: 6px",
  img: "background: #E6E6EA; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #77777F; font: 500 13px/1.3 system-ui, sans-serif; text-align: center; padding: 12px",
  p: "margin: 0; font: 400 15px/1.55 system-ui, sans-serif; color: #3A3A40",
};
const tag = t => `<span data-wire-tag="" style="${S.tag}">${esc(t)}</span>`;
const listItems = s => s.split("\n").filter(l => /^\s*(-|\d+\.)\s/.test(l)).map(l => l.replace(/^\s*(-|\d+\.)\s+/, ""));
const paras = s => s.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
const imgBox = (alt, file, h) => `<div data-image="${esc(file)}" style="${S.img}; height: ${h}px">Image: ${esc(alt || path.basename(file))}</div>`;

// Frame size (real px) and display scale for slides, posts and panels; null means the block flows like a sheet.
function frameOf(first) {
  const c = first.match(/\.[\w-]+/g) || [];
  const has = k => c.includes("." + k);
  if (has("slide")) return { w: 1280, h: 720, k: 816 / 1280, z: 1, kind: "slide", label: (c.find(x => !/^\.(slide|no-rule|flip)$/.test(x)) || ".content").slice(1) };
  if (has("panel") && meta.layout === "brochure") { const n = has("full") ? 3 : has("wide") ? 2 : 1;
    return { w: 352 * n, h: 816, k: 1, z: 0.78, kind: "panel", label: (c.find(x => /^\.(flap|back|cover|wide|full)$/.test(x)) || ".inside").slice(1) }; }
  if (has("panel")) return { w: 1080, h: 1350, k: 0.42, z: 1, kind: "panel", label: has("cover") ? "cover" : has("end") ? "end" : "panel", tight: true };
  if (has("post")) {
    const [w, h] = has("email") ? [1200, has("short") ? 300 : has("tall") ? 520 : 420] : has("story") ? [1080, 1920] : has("portrait") ? [1080, 1350] : has("wide") ? [1200, 627] : [1080, 1080];
    const k = has("email") ? 816 / 1200 : has("story") ? 0.4 : 0.46;
    return { w, h, k, z: 1, kind: has("email") ? "email" : has("story") ? "story" : "post", label: `${w}×${h}` };
  }
  return null;
}
let frameNo = 0;
function renderFrame(b, id, f) {
  frameNo++;
  const lines = b.split("\n"), inner = lines.slice(1, /^:{3,}\s*$/.test(lines[lines.length - 1]) ? -1 : undefined).join("\n");
  const parts = chunks(inner), side = [], on = [];
  parts.forEach(p => (/^:{3,}\s*\{?\s*\.?(notes|caption)\b/.test(p) ? side : on).push(p));
  // Inner blocks are drawn with the sheet renderer, then renamed so the diff reads them as items of this frame.
  const W = Math.round(f.w * f.k), H = Math.round(f.h * f.k);
  const part = (p, i, style = "") => `<div data-item="${id}.${i}"${style ? ` style="${style}"` : ""}>${render(p, "x").replace(/data-(block|item)="[^"]*"/g, "data-part=\"\"")}</div>`;
  let body;
  const cols = f.w > 352 && f.kind === "panel" ? f.w / 352 : 0;
  if (/\.split\b/.test(lines[0]) && on.some(p => /^!\[/.test(p))) {
    // Split posts: text on the left, the photo filling the right half.
    const pi = on.findIndex(p => /^!\[/.test(p)), x = /!\[([^\]]*)\]\(([^)]+)\)/.exec(on[pi]);
    body = `<div style="display: flex; gap: 20px"><div style="flex: 1; display: flex; flex-direction: column; gap: 14px">${on.map((p, i) => i === pi ? "" : part(p, i)).join("")}</div>` +
      `<div data-item="${id}.${pi}" style="flex: 1">${imgBox(x[1], x[2], Math.max(120, H / f.z - 70))}</div></div>`;
  } else if (cols) {
    // Brochure spreads: columns sit side by side across the folds, as printed; other blocks span the spread.
    body = `<div style="display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 16px 22px">${on.map((p, i) => {
      const c = /^:{3,}\s*\{?\s*\.?col\b/.test(p), span = c ? (/\.two\b/.test(p.split("\n")[0]) ? 2 : /\.three\b/.test(p.split("\n")[0]) ? 3 : 1) : cols;
      return part(p, i, `grid-column: span ${Math.min(span, cols)}`); }).join("")}</div>`;
  } else body = on.map((p, i) => part(p, i)).join("");
  const empty = !on.length && f.label === "title" ? `<span data-wire-tag="" style="${S.tag}; position: static; font-size: 12px">Title slide: drawn from the title, subtitle and eyebrow above</span>` : "";
  const notes = side.map(p => { const t = /\bnotes\b/.test(p.split("\n")[0]) ? "speaker notes, not on the slide" : "caption, not on the image";
    return `<div style="${S.block}; padding: 26px 14px 12px; background: #F7F7F9">${tag(t)}${paras(p.replace(/^:{3,}.*\n/, "").replace(/\n:{3,}\s*$/, "")).map(x => `<p style="${S.p}; font-size: 13px">${inline(x)}</p>`).join("")}</div>`; }).join("");
  const label = f.kind === "slide" ? `slide ${frameNo} · ${f.label}` : `${f.kind} · ${f.label}`;
  return `<div data-block="${id}" style="position: relative; width: ${W}px; display: flex; flex-direction: column; gap: 10px">` +
    `<div style="position: relative; box-sizing: border-box; width: ${W}px; min-height: ${H}px; padding: 34px 26px 22px; border: 1.5px solid #B9B9C1; border-radius: ${f.kind === "panel" && !f.tight ? 2 : 10}px; background: #FFFFFF; overflow: hidden">${tag(label)}` +
    `<div style="zoom: ${f.z}; display: flex; flex-direction: column; gap: 14px">${empty}${body}</div></div>${notes}</div>`;
}

// One wireframe block per top-level Markdown block; items inside rows carry their own ids so moves inside a row show too.
function render(b, id) {
  const first = b.split("\n")[0];
  const fr = id !== "x" && frameOf(first);
  if (fr) return renderFrame(b, id, fr);
  const inner = b.replace(/^:{3,}.*\n/, "").replace(/\n:{3,}\s*$/, "").replace(/^:{3,}\s*$/, "");
  const wrap = (label, html, extra = "") => `<div data-block="${id}" style="${S.block}${extra}">${tag(label)}${html}</div>`;
  let m;
  if ((m = /^(#{1,4})\s+(.*)$/.exec(first)) && b.split("\n").length === 1) {
    const size = { 1: 34, 2: 26, 3: 19, 4: 13 }[m[1].length];
    return `<div data-block="${id}" style="${S.plain}"><div style="margin: 0; font: 700 ${size}px/1.2 system-ui, sans-serif; color: #1C1C24${m[1].length === 4 ? "; text-transform: uppercase; letter-spacing: .1em" : ""}">${inline(m[2].replace(/\s*\{[^}]*\}\s*$/, ""))}</div></div>`;
  }
  if ((m = /^:{3,}\s*\{?\s*\.?([\w-]+)/.exec(first))) {
    const cls = m[1], classes = first.match(/\.[\w-]+/g) || [`.${cls}`];
    const kind = cls === "hero-image" ? "hero image" : cls === "cta-card" ? "closing card" : cls;
    if (["stats", "features", "checks", "flow", "cards"].includes(cls)) {
      const items = listItems(inner), cols = cls === "checks" ? 1 : cls === "cards" ? 2 : cls === "features" ? (meta.layout === "email" ? 1 : classes.includes(".three") ? 3 : 2) : Math.min(items.length, 5);
      return wrap(`${kind} ×${items.length}`, `<div style="${S.row}; grid-template-columns: repeat(${cols}, minmax(0, 1fr))">${items.map((t, i) =>
        `<div data-item="${id}.${i}" style="${S.item}"><p style="${S.p}">${inline(t)}</p></div>`).join("")}</div>`);
    }
    if (cls === "cols") return wrap("two columns", `<div style="${S.row}; grid-template-columns: repeat(2, minmax(0, 1fr))">${paras(inner).map((t, i) =>
      `<div data-item="${id}.${i}"><p style="${S.p}">${inline(t)}</p></div>`).join("")}</div>`);
    if (cls === "gallery") { const ims = [...inner.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
      return wrap(`gallery ×${ims.length}`, `<div style="${S.row}; grid-template-columns: repeat(${ims.length}, minmax(0, 1fr))">${ims.map((x, i) => `<div data-item="${id}.${i}">${imgBox(x[1], x[2], 150)}</div>`).join("")}</div>`); }
    if (cls === "hero-image") { const x = /!\[([^\]]*)\]\(([^)]+)\)/.exec(inner) || [];
      return wrap(kind, imgBox(x[1], x[2] || "", 220)); }
    if (cls === "media") { const x = /!\[([^\]]*)\]\(([^)]+)\)/.exec(inner) || [], rest = inner.replace(/!\[[^\]]*\]\([^)]+\)(\{[^}]*\})?/, "");
      const flip = classes.includes(".flip");
      const pic = `<div style="width: 42%; flex-shrink: 0">${imgBox(x[1], x[2] || "", 190)}</div>`, txt = `<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 8px">${paras(rest).map(t => `<p style="${S.p}">${inline(t.replace(/^#+\s*/, ""))}</p>`).join("")}</div>`;
      return wrap("image + text", `<div style="display: flex; gap: 18px; align-items: center">${flip ? txt + pic : pic + txt}</div>`); }
    if (cls === "ornament" && !inner.trim()) return wrap("brand divider", `<div style="height: 2px; background: #D6D6DB; margin: 8px 0"></div>`);
    // callout, closing card, band and anything else: its text in order.
    return wrap(kind, chunks(inner).map(t => /^#{2,4}\s/.test(t) && !t.includes("\n") ? `<p style="${S.p}; font-weight: 700; color: #1C1C24">${inline(t.replace(/^#+\s*/, "").replace(/\s*\{[^}]*\}\s*$/, ""))}</p>`
      : render(t, "x").replace(/data-(block|item)="[^"]*"/g, 'data-part=""')).join(""),
      cls === "cta-card" ? "; background: #EDEDF0" : "");
  }
  if (/^```chart/.test(first)) {
    const cap = (/^caption:\s*(.*)$/m.exec(b) || [, ""])[1], type = (/^type:\s*(\w+)/m.exec(b) || [, "chart"])[1];
    return wrap(`${type} chart`, `<div style="${S.img}; height: 170px">Chart: ${esc(cap)}</div>`);
  }
  if (/^\|/.test(first)) {
    const rows = b.split("\n").filter(l => /^\|/.test(l) && !/^\|\s*-/.test(l)).map(l => l.replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
    const n = rows[0].length;
    return wrap(`table ${rows.length - 1}×${n}`, `<div style="display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); border-top: 1.5px solid #D6D6DB">${rows.flatMap((r, ri) =>
      r.map(c => `<div style="padding: 8px 6px; border-bottom: 1px solid #E2E2E6; font: ${ri ? 400 : 700} 13px/1.4 system-ui, sans-serif; color: #3A3A40">${inline(c)}</div>`)).join("")}</div>`);
  }
  if (/^>/.test(first)) return wrap("quote", b.split("\n").map(l => l.replace(/^>\s?/, "")).join("\n").split(/\n\s*\n/).filter(t => t.trim()).map(t =>
    `<p style="${S.p}; font-size: 19px">${inline(t)}</p>`).join(""));
  if (/^!\[/.test(first)) { const x = /!\[([^\]]*)\]\(([^)]+)\)/.exec(b);
    return /\{[^}]*\.logo/.test(b) ? `<div data-block="${id}" style="${S.plain}"><div style="${S.img}; height: 34px; width: 150px; padding: 0">Logo</div></div>` : wrap("image", imgBox(x[1], x[2], 240)); }
  if (/^\s*(-|\d+\.)\s/.test(first)) return wrap("list", listItems(b).map((t, i) => `<p data-item="${id}.${i}" style="${S.p}">• ${inline(t)}</p>`).join(""));
  return `<div data-block="${id}" style="${S.plain}"><p style="${S.p}">${inline(b)}</p></div>`;
}

// Footnote definitions and page breaks stay in the source but aren't drawn.
const shown = [], hidden = [];
blocks.forEach((b, i) => (/^\[\^[^\]]+\]:/.test(b) || /^:{3,}\s*page-break/.test(b) ? hidden : shown).push({ id: `b${String(i).padStart(2, "0")}`, md: b }));
const isEmail = meta.layout === "email";
const head = isEmail ? `<div data-block="meta.inbox" style="${S.block}; background: #F7F7F9">${tag("inbox: subject and preheader")}` + ["subject", "preheader"].filter(k => meta[k]).map(k =>
  `<div data-item="meta.${k}"><p style="${S.p}${k === "subject" ? "; font-weight: 700; color: #1C1C24" : "; font-size: 14px"}">${inline(meta[k])}</p></div>`).join("") + `</div>`
  : [["title", 34, 700], ["eyebrow", 12, 600], ["subtitle", 17, 400]].filter(([k]) => meta[k]).map(([k, size, w]) =>
  `<div data-block="meta.${k}" style="${S.plain}"><p style="margin: 0; font: ${w} ${size}px/1.3 system-ui, sans-serif; color: #1C1C24${k === "eyebrow" ? "; letter-spacing: .12em; text-transform: uppercase; color: #6A6A73" : ""}">${inline(meta[k])}</p></div>`).join("");
const inner = head + shown.map(b => render(b.md, b.id)).join("\n");
// Frames sit in a wrapping row (a brochure reads as its two printed sides, posts as a grid); sheets and blogs flow in one column.
const framed = shown.some(b => frameOf(b.md.split("\n")[0]));
const W = isEmail ? 744 : !framed ? 816 : meta.layout === "brochure" ? 1200 : shown.some(b => /\.slide\b|\.email\b/.test(b.md.split("\n")[0])) ? 960 : 1140;
const rootStyle = framed ? "padding: 56px 48px; display: flex; flex-flow: row wrap; align-content: flex-start; align-items: flex-start; gap: 28px 24px"
  : "padding: 64px 72px; display: flex; flex-direction: column; gap: 18px";
const page = (h) => `<div data-wire-root="" style="width: ${W}px; height: ${h}px; box-sizing: border-box; ${rootStyle}; background: #FFFFFF">\n${framed ? inner.replace(/<div data-block="meta\./g, '<div style="flex: 0 0 100%" data-block="meta.') : inner}\n</div>`;

(async () => {
  // Measure the content height so the artboard is exactly as tall as the wireframe.
  const browser = await chromium.launch({ ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
  const p = await browser.newPage({ viewport: { width: W, height: 800 } });
  await p.setContent(`<body style="margin:0">${page("auto").replace("height: autopx", "height: auto")}</body>`);
  const H = Math.ceil(await p.evaluate(() => document.querySelector("[data-wire-root]").scrollHeight)) + 8;
  await browser.close();
  const title = meta.pagetitle || (meta.title || "Wireframe").replace(/\*/g, "");
  fs.writeFileSync(path.join(outDir, board), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)} wireframe</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#F4F4F6}
</style>
</helmet>
${page(H)}
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
})();
