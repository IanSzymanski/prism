// Block markup for website pages: the helpers every site renderer shares, WordPress's own block parser, a comparison of two
// saved pages, and core's renderer (plain WordPress blocks, for a brand that has no site kit of its own).
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const KIT = __dirname;

// Same escaping WordPress applies to block attributes.
function attrJSON(a) {
  return JSON.stringify(a)
    .replace(/--/g, "\\u002d\\u002d")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\\"/g, "\\u0022");
}

function block(name, attrs, inner) {
  const a = attrs && Object.keys(attrs).length ? " " + attrJSON(attrs) : "";
  if (inner == null) return `<!-- wp:${name}${a} /-->`;
  return `<!-- wp:${name}${a} -->\n${inner}\n<!-- /wp:${name} -->`;
}

// Block ids "<post>_<6 hex>-<2 hex>", seeded by the page, so rebuilding an unchanged file gives the same ids.
function idMaker(postId, seed) {
  let n = 0;
  return () => {
    const h = crypto.createHash("md5").update(`${seed}:${n++}`).digest("hex");
    return `${postId}_${h.slice(0, 6)}-${h.slice(6, 8)}`;
  };
}

const esc = s => String(s).replace(/&(?![a-z#0-9]+;)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Inline Markdown: **bold**, [link](url), and *accent* drawn by the caller.
const inline = (text, accent) => text
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\*(.+?)\*/g, (_, w) => accent(w))
  .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
const txt = (s, accent) => inline(esc(s), accent);

// WordPress's block parser (the one parse_blocks() is ported from), installed by `setup.sh web`.
function parser() {
  const name = "@wordpress/block-serialization-default-parser";
  try { return require(name); } catch (e) {
    return require(path.join(KIT, "mods", name, "node_modules", name));
  }
}
const parse = markup => parser().parse(markup);
// Every block in the page, children after their parent.
function flat(markup) {
  const out = [], walk = bs => bs.forEach(b => { if (b.blockName) { out.push(b); walk(b.innerBlocks); } });
  walk(parse(markup));
  return out;
}
// Text WordPress would keep outside any block: the editor shows it as a broken "Classic" block.
const stray = markup => parse(markup).filter(b => !b.blockName && b.innerHTML.trim()).map(b => b.innerHTML.trim().slice(0, 80));

// ---- Two saved pages, block by block, ignoring generated ids and whitespace ----
const ID = /(?<!\d)\d+_[0-9a-f]{6}-[0-9a-f]{2}(?:_\d+)?/g;
const norm = s => s.replace(ID, "ID").replace(/\s+/g, " ").replace(/> </g, "><").trim();
const label = b => (b.attrs.metadata && b.attrs.metadata.name) || b.blockName.replace(/^(kadence|core)\//, "");
// A block's own HTML without its children, so a difference is reported once, at the block that owns it.
const ownHtml = b => norm(b.innerContent.filter(s => s !== null).join(" "));
function attrDiff(a, b) {
  const out = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === "uniqueID") continue;
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x !== y) out.push(`${k}: ${x === undefined ? "(missing)" : x} -> ${y === undefined ? "(missing)" : y}`);
  }
  return out;
}
function compare(original, generated) {
  const top = t => parse(t).filter(b => b.blockName), count = t => t.reduce((n, x) => n + 1 + count(x.innerBlocks), 0);
  const A = top(original), G = top(generated), diffs = [];
  const walk = (a, b, where) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i], y = b[i], at = `${where} > ${x ? label(x) : label(y)}[${i}]`;
      if (!x || !y) { diffs.push({ at, what: [x ? "missing in generated" : "extra in generated"] }); continue; }
      if (x.blockName !== y.blockName) { diffs.push({ at, what: [`block ${x.blockName} -> ${y.blockName}`] }); continue; }
      const what = attrDiff(x.attrs, y.attrs);
      if (ownHtml(x) !== ownHtml(y)) what.push(`html: ${ownHtml(x).slice(0, 220)}\n         -> ${ownHtml(y).slice(0, 220)}`);
      if (what.length) diffs.push({ at, what });
      walk(x.innerBlocks, y.innerBlocks, at);
    }
  };
  walk(A, G, "page");
  return { original: count(A), generated: count(G), diffs };
}

// ---- Core's renderer: plain WordPress blocks with prism-web- classes for the site's theme to style ----
// No brand look, motion or page-builder blocks: a brand with a site kit (profile `web.renderer`) replaces all of it.
function core(W) {
  const p = (html, a = {}) => block("paragraph", a, `<p${a.className ? ` class="${a.className}"` : ""}>${html}</p>`);
  const em = w => `<em>${w}</em>`, t = s => W.txt(s, em);
  const h = (level, html, a = {}) => {
    const attrs = { ...(level !== 2 ? { level } : {}), ...a };
    const cls = ["wp-block-heading", a.textAlign && `has-text-align-${a.textAlign}`, a.className].filter(Boolean).join(" ");
    return block("heading", attrs, `<h${level} class="${cls}">${html}</h${level}>`);
  };
  const group = (cls, kids, layout = { type: "constrained" }) => block("group", { className: cls, layout }, `<div class="wp-block-group ${cls}">${kids.join("\n\n")}</div>`);
  const columns = (cols, cls) => block("columns", { verticalAlignment: "center", className: cls }, `<div class="wp-block-columns are-vertically-aligned-center ${cls}">${cols.join("\n\n")}</div>`);
  const column = (kids, width) => block("column", { verticalAlignment: "center", ...(width ? { width: `${width}%` } : {}) },
    `<div class="wp-block-column is-vertically-aligned-center"${width ? ` style="flex-basis:${width}%"` : ""}>${kids.join("\n\n")}</div>`);
  const list = items => block("list", null, `<ul class="wp-block-list">${items.map(i => block("list-item", null, `<li>${t(i)}</li>`)).join("")}</ul>`);
  const button = b => block("button", b.kind === "primary" ? null : { className: "is-style-outline" },
    `<div class="wp-block-button${b.kind === "primary" ? "" : " is-style-outline"}"><a class="wp-block-button__link wp-element-button" href="${b.url}"${/^https?:/.test(b.url) ? ' target="_blank" rel="noreferrer noopener"' : ""}>${esc(b.text)}</a></div>`);
  const buttons = items => block("buttons", null, `<div class="wp-block-buttons">${items.map(button).join("\n\n")}</div>`);
  const image = img => block("image", { ...(img.id ? { id: Number(img.id) } : {}), sizeSlug: "full", linkDestination: "none" },
    `<figure class="wp-block-image size-full"><img src="${img.url}" alt="${esc(img.alt)}"${img.id ? ` class="wp-image-${img.id}"` : ""}/></figure>`);
  const card = k => group(`prism-web-card${k.icon ? ` prism-web-icon-${k.icon.name}` : ""}`, [h(3, t(k.title)), p(t(k.body || ""))]);
  const text = (c, e) => {
    if (e.type === "eyebrow") return p(t(e.text), { className: "prism-web-eyebrow" });
    if (e.type === "lede") return p(t(e.text), { className: "prism-web-lede" });
    if (e.type === "p") return p(t(e.text));
    if (e.type === "list") return list(e.items);
    if (e.type === "buttons") return buttons(e.items);
    if (/^h[1-3]$/.test(e.type)) return h(+e.type[1], t(e.text));
    W.fail(c, `"${e.type}" is not allowed here`);
  };
  const split = c => { const w = String(c.attrs.cols || "").split("/").map(Number); return w.length === 2 ? w : [null, null]; };
  const pair = (c, a, b) => { const [x, y] = split(c); return c.side === "right" ? [column(b, y), column(a, x)] : [column(a, x), column(b, y)]; };
  return {
    spacer: () => block("spacer", { height: "96px" }, '<div style="height:96px" aria-hidden="true" class="wp-block-spacer"></div>'),
    hero: c => {
      const img = c.els.find(e => e.type === "image");
      return group("prism-web-hero", [columns(pair({ ...c, side: "left" }, c.els.filter(e => e !== img).map(e => text(c, e)), img ? [image(img)] : []), "prism-web-hero-columns")]);
    },
    heading: c => group(`prism-web-heading prism-web-${c.side}`, c.els.map(e => e.type === "h2" ? h(2, t(e.text), c.side === "right" ? { textAlign: "right" } : {}) : text(c, e))),
    title: c => h(2, t(c.els[0].text), { textAlign: "center", className: "prism-web-title" }),
    media: c => {
      const img = c.els.find(e => e.type === "image");
      return columns(pair(c, [image(img)], c.els.filter(e => e !== img).map(e => text(c, e))), "prism-web-media");
    },
    features: c => group("prism-web-cards", c.cards.map(card), { type: "grid", columnCount: 2 }),
    stack: c => columns(pair({ ...c, side: "left" }, c.cards.map(card), c.els.map(e => text(c, e))), "prism-web-stack"),
    band: c => group("prism-web-band", [columns(pair({ ...c, side: "left" }, c.els.map(e => text(c, e)), c.cards.map(card)), "prism-web-band-columns")]),
    "cta-card": c => group("prism-web-cta", c.els.map(e => text(c, e))),
    faq: c => {
      const panes = [];
      for (const e of c.els) if (e.type === "h3") panes.push({ q: e.text, a: [] }); else if (panes.length) panes[panes.length - 1].a.push(e);
      return group("prism-web-faq", panes.map(x => block("details", null, `<details class="wp-block-details"><summary>${t(x.q)}</summary>${x.a.map(e => text(c, e)).join("\n\n")}</details>`)));
    },
  };
}

module.exports = { attrJSON, block, idMaker, esc, inline, txt, parse, flat, stray, compare, core };
