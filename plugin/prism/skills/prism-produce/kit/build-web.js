#!/usr/bin/env node
// Website page: a page layout (formats/web.md) as the block markup the brand's site saves, plus page.json for creating the draft.
// Usage: node build-web.js formats/web.md [outdir]
//        node build-web.js compare original.html generated.html   (every block-level difference between two saved pages)
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { tagFor, kebab } = require("./naming.js");
const W = require("./web-blocks.js");
const VERSION = fs.readFileSync(path.join(__dirname, "VERSION"), "utf8").trim();

const BLOCKS = ["hero", "media", "features", "stack", "band", "cta-card", "faq"];
// Blocks that open a section: a spacer goes before each; the others stay in the section above them.
const OPENS = ["hero", "heading", "title", "band", "cta-card"];
// Blocks that belong under a ## heading in their section.
const HEADED = ["media", "features", "stack", "faq"];
const WEIGHTS = ["thin", "light", "regular", "bold", "fill", "duotone"];
const sha = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");

// ---- The brand's site settings (profile `web`); without a renderer, core's plain WordPress blocks ----
function settings(B) {
  let prof = {};
  try { prof = JSON.parse(fs.readFileSync(path.join(B.res.dir, "profile.json"), "utf8")).web || {}; } catch (e) { }
  // _note keys are for people, never options.
  const clean = v => Array.isArray(v) || !v || typeof v !== "object" ? v : Object.fromEntries(Object.entries(v).filter(([k]) => k !== "_note").map(([k, x]) => [k, clean(x)]));
  return { placeholder: null, icons: null, templates: {}, ...clean(prof), fromBrand: !!prof.renderer };
}
function renderer(B, S, helpers) {
  if (!S.renderer) return W.core(helpers);
  return require(path.join(B.res.dir, S.renderer))(helpers, S);
}

// ---- The format file ----
function attrs(s) {
  const o = { cls: [], id: "", a: {} };
  for (const m of String(s || "").matchAll(/(\.[\w-]+)|(#[\w-]+)|([\w-]+)=("[^"]*"|'[^']*'|[^\s}]+)/g)) {
    if (m[1]) o.cls.push(m[1].slice(1)); else if (m[2]) o.id = m[2].slice(1); else o.a[m[3]] = m[4].replace(/^["']|["']$/g, "");
  }
  return o;
}

// Markdown blocks with their line numbers: fenced divs (nested by depth), headings, lists and paragraphs.
function blocks(lines, errors) {
  const out = [];
  let para = null, list = null;
  for (let i = 0; i < lines.length; i++) {
    const { t: raw, n } = lines[i], l = raw.trim();
    let m;
    if (!l || /^<!--.*-->$/.test(l)) { para = list = null; continue; }
    if ((m = /^(:{3,})\s*(.*)$/.exec(l))) {
      para = list = null;
      if (!m[2]) { errors.push(`line ${n}: a closing ::: with nothing open`); continue; }
      const A = m[2].startsWith("{") ? attrs(m[2].replace(/^\{|\}$/g, "")) : { cls: [m[2].trim()], id: "", a: {} };
      let depth = 1, j = i + 1;
      for (; j < lines.length; j++) { const f = /^:{3,}\s*(\S.*)?$/.exec(lines[j].t.trim()); if (f) depth += f[1] ? 1 : -1; if (!depth) break; }
      if (depth) errors.push(`line ${n}: ::: ${A.cls[0] || ""} is never closed`);
      out.push({ kind: "div", name: A.cls[0] || "", cls: A.cls, a: A.a, line: n, kids: blocks(lines.slice(i + 1, j), errors) });
      i = j; continue;
    }
    if ((m = /^(#{1,6})\s+(.*?)(?:\s*\{([^}]*)\})?$/.exec(l))) { para = list = null; const A = attrs(m[3]); out.push({ kind: "h", level: m[1].length, text: m[2], cls: A.cls, a: A.a, line: n }); continue; }
    if ((m = /^[-*]\s+(.*)$/.exec(l))) { para = null; if (!list) out.push(list = { kind: "list", items: [], line: n }); list.items.push(m[1]); continue; }
    if (list && /^\s/.test(raw)) { list.items[list.items.length - 1] += " " + l; continue; }
    list = null;
    if (para) para.lines.push(l); else out.push(para = { kind: "p", lines: [l], line: n });
  }
  return out;
}

function parse(src) {
  src = src.replace(/\r\n/g, "\n");
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(src), meta = {};
  for (const l of (fm ? fm[1] : "").split("\n")) { const m = /^([\w-]+):\s*(.*?)\s*$/.exec(l); if (m) meta[m[1]] = m[2].replace(/\s+#\s.*$/, "").replace(/^["']|["']$/g, ""); }
  const off = fm ? fm[0].split("\n").length - 1 : 0;
  const lines = (fm ? src.slice(fm[0].length) : src).split("\n").map((t, i) => ({ t, n: i + 1 + off }));
  const errors = [];
  return { meta, top: blocks(lines, errors), errors };
}

// One Markdown block as a page element: eyebrow, lede, heading, paragraph, list, buttons, image or a nested block.
function element(n, icon, errors) {
  if (n.kind === "h") return { type: "h" + n.level, text: n.text, attrs: n.a, cls: n.cls, line: n.line };
  if (n.kind === "list") return { type: "list", items: n.items, line: n.line };
  if (n.kind === "div") return { type: "div", name: n.name, cls: n.cls, attrs: n.a, line: n.line, els: n.kids.map(k => element(k, icon, errors)) };
  const s = n.lines.join("\n");
  let m;
  if ((m = /^\[([\s\S]+)\]\{\.(eyebrow|lede)\}$/.exec(s))) return { type: m[2], text: m[1].replace(/\n/g, " "), line: n.line };
  if (n.lines.length === 1 && (m = /^!\[(.*?)\]\((.*?)\)(?:\{([^}]*)\})?$/.exec(s))) { const A = attrs(m[3]); return { type: "image", alt: m[1], src: m[2], attrs: A.a, cls: A.cls, line: n.line }; }
  const btn = n.lines.map(l => /^\[(.+?)\]\((\S+?)\)\{([^}]*)\}$/.exec(l));
  if (btn.every(b => b && attrs(b[3]).cls.includes("button"))) return { type: "buttons", line: n.line, items: btn.map(b => {
    const A = attrs(b[3]);
    return { text: b[1], url: b[2], kind: A.cls.includes("secondary") ? "secondary" : "primary", icon: A.a.icon ? icon(A.a.icon, `line ${n.line}`) : null };
  }) };
  return { type: "p", text: n.lines.join(" "), line: n.line };
}

// Feature cards: "- []{.icon .ph-NAME} **Title** One sentence." per item; the icon is optional.
function cardsOf(e, icon, errors) {
  const cards = [];
  for (const x of e.els) {
    if (x.type !== "list") { errors.push(`line ${x.line}: ::: features holds only "- []{.icon .ph-NAME} **Title** sentence" items`); continue; }
    for (const item of x.items) {
      const m = /^(?:\[\]\{([^}]*)\}\s*)?\*\*(.+?)\*\*\s*(.*)$/.exec(item);
      if (!m) { errors.push(`line ${x.line}: card "${item.slice(0, 40)}" needs a **Title** first`); continue; }
      const ph = attrs(m[1]).cls.find(c => c.startsWith("ph-"));
      cards.push({ title: m[2], body: m[3], icon: ph ? icon(ph.slice(3), `line ${x.line}`) : null, line: x.line });
    }
  }
  return cards;
}

// Sides alternate down the page, starting on the left: each heading takes the next side and the first media row under it
// matches; another media row in the same section takes the next side. `.left` or `.right` pins one and the page carries on from it.
function sides(seq) {
  let side = null, fresh = false;
  const flip = () => (side = side === "left" ? "right" : "left");
  return seq.map(s => {
    if (s.kind === "heading") { if (s.pin) side = s.pin; else flip(); fresh = true; return side; }
    if (s.kind === "media") { if (s.pin) side = s.pin; else if (!fresh) flip(); fresh = false; return side; }
    return null;
  });
}

// The page as a list of blocks: top-level headings become heading (or centered title) blocks, carrying the eyebrow above them.
function model(doc, icon) {
  const errors = [], comps = [];
  let eyebrow = null;
  for (const n of doc.top) {
    const e = n.kind === "p" ? element(n, icon, errors) : null;
    if (eyebrow && !(n.kind === "h" && n.level === 2)) { errors.push(`line ${eyebrow.line}: an eyebrow sits directly above a ## heading`); eyebrow = null; }
    if (e && e.type === "eyebrow") { eyebrow = e; continue; }
    if (n.kind === "h") {
      if (n.level !== 2) { errors.push(`line ${n.line}: ${n.level === 1 ? "the page's # title goes in ::: hero" : "### headings go inside a block (faq); a section heading is ##"}`); continue; }
      const center = n.cls.includes("center");
      if (center && eyebrow) errors.push(`line ${eyebrow.line}: a centered heading takes no eyebrow`);
      comps.push({ name: center ? "title" : "heading", line: n.line, attrs: n.a, cls: n.cls, els: [...(eyebrow && !center ? [eyebrow] : []), element(n, icon, errors)], cards: [] });
      eyebrow = null; continue;
    }
    if (n.kind === "div") {
      if (!BLOCKS.includes(n.name)) { errors.push(`line ${n.line}: unknown block "::: ${n.name}" (use ${BLOCKS.join(", ")})`); continue; }
      const div = element(n, icon, errors), c = { name: n.name, line: n.line, attrs: n.a, cls: n.cls, els: [], cards: [] };
      if (n.name === "features") c.cards = cardsOf(div, icon, errors);
      else for (const x of div.els) {
        if (x.type !== "div") c.els.push(x);
        else if (x.name === "features" && ["band", "stack"].includes(n.name)) c.cards.push(...cardsOf(x, icon, errors));
        else errors.push(`line ${x.line}: ::: ${x.name} can't sit inside ::: ${n.name}`);
      }
      comps.push(c); continue;
    }
    errors.push(`line ${n.line}: text outside a block: "${(n.lines || n.items || [""])[0].slice(0, 60)}" (put it in a ::: block)`);
  }
  if (eyebrow) errors.push(`line ${eyebrow.line}: an eyebrow sits directly above a ## heading`);
  const side = sides(comps.map(c => ({ kind: c.name === "heading" || c.name === "media" ? c.name : "other", pin: ["left", "right"].find(s => c.cls.includes(s)) })));
  comps.forEach((c, i) => { if (side[i]) c.side = side[i]; });
  return { comps, errors };
}

// Page rules every brand shares; a brand's site kit adds its own (`check`).
function checks(comps) {
  const errors = [], warns = [];
  const heads = [];
  comps.forEach((c, i) => {
    const at = `::: ${c.name} (line ${c.line})`;
    if (c.name === "hero" && i) errors.push(`${at}: the hero opens the page`);
    if (c.attrs.cols && !(/^(\d+)\/(\d+)$/.test(c.attrs.cols) && c.attrs.cols.split("/").reduce((a, b) => a + +b, 0) === 100)) errors.push(`${at}: cols=${c.attrs.cols} (two widths that add up to 100, like 45/55)`);
    if (["left", "right"].every(s => c.cls.includes(s))) errors.push(`${at}: .left or .right, not both`);
    if (["hero", "media"].includes(c.name) && !c.els.some(e => e.type === "image")) errors.push(`${at}: needs an image`);
    if (["features", "stack"].includes(c.name) && !c.cards.length) errors.push(`${at}: needs cards (- []{.icon .ph-NAME} **Title** sentence)`);
    if (OPENS.includes(c.name)) heads.length = 0;
    if (c.name === "heading") heads.push(c);
    if (HEADED.includes(c.name) && !heads.length) warns.push(`${at} has no ## heading above it in its section`);
    for (const e of [...c.els, ...c.cards.map(k => ({ type: "h3", text: k.title, line: k.line }))]) {
      if (/^h\d$/.test(e.type) && (e.text.replace(/\*\*.+?\*\*/g, "").match(/\*[^*]+\*/g) || []).length > 1) warns.push(`line ${e.line}: "${e.text}" has more than one accent word; keep one`);
      if (e.type === "h1" && c.name !== "hero") errors.push(`line ${e.line}: the page's # title goes in ::: hero`);
      if (e.type === "image" && !e.alt.trim()) warns.push(`line ${e.line}: an image without alt text (say what it shows)`);
    }
  });
  if (!comps.length) errors.push("the page has no blocks");
  const ctas = comps.filter(c => c.name === "cta-card");
  if (ctas.length > 1) errors.push(`one closing card per page (::: cta-card at lines ${ctas.map(c => c.line).join(", ")})`);
  if (comps.length && comps[0].name === "hero" && !comps[0].els.some(e => e.type === "h1")) warns.push(`::: hero (line ${comps[0].line}) has no # title`);
  return { errors, warns };
}

// ---- Images: the site's own media stay as they are; every other photo is a named slot the site fills ----
function images(comps, ctx) {
  const { md, B, S, meta, tag, errors } = ctx, slots = [], media = [], named = {};
  const [pid, purl] = (meta.placeholder || "").split(/\s+/);
  const ph = { id: pid || (S.placeholder && S.placeholder.id) || null, url: purl || (S.placeholder && S.placeholder.url) || "" };
  for (const c of comps) for (const e of c.els) {
    if (e.type !== "image") continue;
    const site = /^(https?:\/\/|\/)/.test(e.src);
    if (site) {
      if (!e.attrs.id) { errors.push(`line ${e.line}: ${e.src} needs {id=<media library id>}, or use a photo from images/`); continue; }
      Object.assign(e, { url: e.src, id: e.attrs.id, slot: null });
      media.push({ id: Number(e.attrs.id), url: e.src, alt: e.alt });
      continue;
    }
    let file = null;
    if (!/^prism:placeholder(-dark)?$/.test(e.src)) {
      try { file = B.src(e.src, path.dirname(md)); } catch (x) { errors.push(`line ${e.line}: ${x.message.replace(/^\[brand\]\s*/, "")}`); continue; }
      if (!fs.existsSync(file)) { errors.push(`line ${e.line}: no image ${e.src}`); continue; }
    }
    let name = kebab(e.attrs.slot || (file ? path.basename(file).replace(/\.[^.]+$/, "") : c.name));
    if (!e.attrs.slot && !file) for (let k = 2; named[name]; k++) name = kebab(`${c.name}-${k}`);
    if (named[name] && (!file || named[name] !== file)) { errors.push(`line ${e.line}: image slot "${name}" is used twice; name one with {slot=...}`); continue; }
    named[name] = file || true;
    const alt = e.alt;
    Object.assign(e, { url: ph.url, id: ph.id, slot: name, alt: `[Image slot: ${name}] ${alt}`.trim() });
    if (slots.some(s => s.name === name)) continue;
    const ext = file ? path.extname(file).toLowerCase() : "";
    slots.push({ name, alt, component: c.name, line: e.line,
      file: file ? `images/${tag}-${name}${ext}` : null, source: file ? e.src : null, sha256: file ? sha(file) : null,
      focus: file ? B.focus(file, e.attrs.focus) : null, from: file });
  }
  return { slots, media, placeholder: ph };
}

// ---- One page: parse, check, render, check the markup ----
function build(md) {
  md = path.resolve(md);
  const B = require("./brand.js")(md), S = settings(B);
  const doc = parse(fs.readFileSync(md, "utf8")), meta = doc.meta;
  const errors = [...doc.errors], warns = [];
  if (meta.layout && meta.layout !== "web") errors.push(`layout: ${meta.layout} (a website page is layout: web)`);
  const icons = JSON.parse(fs.readFileSync(B.icons.paths, "utf8"));
  // An icon is a Phosphor name, with an optional weight ("calendar-check-fill"); otherwise the brand's weight.
  const icon = (v, where) => {
    const w = WEIGHTS.find(x => v.endsWith("-" + x) && icons[v.slice(0, -x.length - 1)]);
    const name = w ? v.slice(0, -w.length - 1) : v;
    if (!icons[name]) { errors.push(`${where}: no icon "${name}" in Phosphor (phosphoricons.com)`); return { name, weight: B.icons.weight }; }
    const out = { name, weight: w || B.icons.weight };
    if (S.icons && !S.icons.includes(`${name}-${out.weight}`)) warns.push(`${where}: icon "${name}-${out.weight}" isn't used on ${B.name}'s site yet; check it in the editor's icon picker`);
    return out;
  };
  const m = model(doc, icon);
  errors.push(...m.errors);
  const ch = checks(m.comps);
  errors.push(...ch.errors); warns.push(...ch.warns);
  // A brand with templates stops on a name it doesn't have; a brand with none leaves the line out.
  if (meta.template && !S.templates[meta.template]) {
    if (Object.keys(S.templates).length) errors.push(`template: ${meta.template} (${B.name}'s templates: ${Object.keys(S.templates).join(", ")})`);
    else { warns.push(`template: ${meta.template} left out: ${B.name} has no page templates`); delete meta.template; }
  }
  // Files are named for the piece, never the page's address: a new slug on the site doesn't make it another piece.
  const tag = tagFor(md, { ...meta, slug: undefined }), slug = meta.slug || kebab(meta.title || "page");
  const img = images(m.comps, { md, B, S, meta, tag, errors });
  if (!meta.title) errors.push("front matter needs title: (the page's name in WordPress)");
  if (!meta.description) warns.push("no description: (the page's meta description for search results)");
  if ((meta["seo-title"] || "").length > 60) warns.push(`seo-title: is ${meta["seo-title"].length} characters; search results show about 60`);
  if ((meta.description || "").length > 160) warns.push(`description: is ${meta.description.length} characters; search results show about 155`);
  const out = { md, B, S, meta, tag, slug, comps: m.comps, errors, warns, ...img, markup: "" };
  if (errors.length) return out;

  const fail = (c, msg) => { throw new Error(`::: ${c.name} (line ${c.line}): ${msg}`); };
  const helpers = { ...W, fail };
  const ctx = { id: W.idMaker(meta.post || "0", slug), meta, S, B, warn: w => warns.push(w), errors };
  try {
    const R = renderer(B, S, helpers), items = [];
    if (R.check) R.check(m.comps, ctx);
    if (errors.length) return out;
    m.comps.forEach((c, i) => {
      if (!R[c.name]) fail(c, `${B.name}'s site kit has no ${c.name} block`);
      if (i && OPENS.includes(c.name)) items.push(R.spacer(c, ctx));
      items.push(R[c.name](c, ctx));
    });
    if (R.end) items.push(R.spacer({}, ctx), ...[].concat(R.end(ctx)));
    out.markup = items.join("\n\n") + "\n";
  } catch (e) { errors.push(e.message); return out; }
  // The markup must parse as blocks and nothing else, with every block id once.
  for (const s of W.stray(out.markup)) errors.push(`text outside a block in the markup: ${s}`);
  const ids = W.flat(out.markup).map(b => b.attrs && b.attrs.uniqueID).filter(Boolean), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) errors.push(`block ids used twice: ${[...new Set(dup)].join(", ")}`);
  out.blocks = W.flat(out.markup).length;
  return out;
}

// The page details the site needs to create the draft: title, slug, template, search fields, slots to fill and media used.
function pageJson(o, files) {
  const { meta, S } = o;
  const version = (/-v(\d+)$/.exec(o.tag) || [])[1];
  return {
    prism: VERSION, brand: o.B.id, prism_piece_id: o.tag.replace(/-v\d+$/, ""), version: version ? +version : null,
    title: meta.title, slug: o.slug, post: +(meta.post || 0), parent: +(meta.parent || 0),
    template: meta.template || null, template_meta: meta.template ? S.templates[meta.template] : null,
    seo_title: meta["seo-title"] || null, description: meta.description || null, focus: meta.keyphrase || null,
    markup: files.markup, placeholder: o.placeholder,
    slots: o.slots.map(({ from, ...s }) => s), media: o.media,
  };
}

function write(o, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const files = { markup: `${o.tag}-blocks.html`, page: `${o.tag}-page.json` }, list = [files.markup, files.page];
  fs.writeFileSync(path.join(outDir, files.markup), o.markup);
  for (const s of o.slots.filter(s => s.file)) {
    fs.mkdirSync(path.join(outDir, "images"), { recursive: true });
    fs.copyFileSync(s.from, path.join(outDir, s.file));
    list.push(s.file);
  }
  fs.writeFileSync(path.join(outDir, files.page), JSON.stringify(pageJson(o, files), null, 1) + "\n");
  const h = f => sha(path.join(outDir, f));
  fs.writeFileSync(path.join(outDir, ".prism-build.json"), JSON.stringify({ kit: VERSION, format: "web", main: files.markup, brand: o.B.id,
    images: {}, files: Object.fromEntries(list.map(f => [f, h(f)])) }, null, 1));
  return list;
}

function report(o) {
  for (const w of o.warns) console.warn(`[web] ${w}`);
  for (const e of o.errors) console.error(`[web] ERROR ${e}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "compare") {
    if (args.length < 3) { console.error("usage: build-web.js compare original.html generated.html"); process.exit(2); }
    const r = W.compare(fs.readFileSync(args[1], "utf8"), fs.readFileSync(args[2], "utf8"));
    console.log(`blocks: original ${r.original}, generated ${r.generated}; blocks with differences: ${r.diffs.length}\n`);
    for (const d of r.diffs) console.log(`${d.at}\n  - ${d.what.join("\n  - ")}\n`);
    return;
  }
  const md = args[0];
  if (!md) { console.error("usage: build-web.js formats/web.md [outdir] | compare original.html generated.html"); process.exit(2); }
  const o = build(md);
  report(o);
  if (o.errors.length) process.exit(1);
  const outDir = path.resolve(args[1] || path.join(path.dirname(path.resolve(md)), "web"));
  const files = write(o, outDir);
  console.log(`web: ${o.meta.title} (${o.blocks} blocks, ${o.S.fromBrand ? `${o.B.name}'s site kit` : "core WordPress blocks"}) -> ${outDir}`);
  for (const f of files) console.log(`  ${f}`);
  for (const s of o.slots) console.log(`  slot "${s.name}" (::: ${s.component}, line ${s.line}): ${s.file ? `${s.source}, upload ${s.file}` : "needs a photo"}`);
}

module.exports = { parse, model, sides, checks, settings, build, write, pageJson };
if (require.main === module) main();
