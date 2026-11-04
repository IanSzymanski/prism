#!/usr/bin/env node
// Page layouts: another arrangement of a format's parts (a photo, a figure or a rail leads instead of the title band), not
// another colour or size. Prism default layouts (layouts.json, by format) are core: every brand can use them. Brand layouts are
// a brand's own, as many as it needs, stored with the brand: <brand dir>/layouts/<format>/<id>.json, and optionally the CSS it
// names beside it. A brand layout is an arrangement plus scoped CSS, never new structure: its base (a default layout; standard
// when it names none, or the default it replaces) gives the structure, its `front` values are front matter defaults under the
// file's own, and its CSS loads after the brand's layer, only for that layout. One with a default's id replaces the default;
// the profile's `layouts: {<format>: {<id>: null}}` switches a default off for the brand. A brand never defines standard.
// A brand layout may also hold the body's arrangement as slots: the sheet's top-level blocks in order, words left out, each with
// what it holds ({"block": "::: {.stats}", "holds": "3 items"}, optional, repeat "1-3"). A formatter that picks it writes the
// body slot by slot. `save` makes one from a sheet someone arranged (in design mode or by hand); `check` says where a sheet
// departs from its layout's slots.
// `format:` picks the output's shape (brochure, 5x7, email, web); `layout:` names a page layout. `layout: brochure|5x7|email|web`
// is the old spelling of `format:` and keeps working.
// Usage: layouts.js [--brand B] [--format sheet] [--json]
//        layouts.js save <layout-id> <format file> --brand B --name "..." --use "..." --when "..." [--replace]
//        layouts.js check <format file> [--brand B]
const fs = require("fs"), path = require("path");
const { defaultBrand, brandDir } = require("./resolve.js");
// Format names `layout:` used to carry: never a layout id.
const FORMATS = ["brochure", "5x7", "email", "web"];
// What a layout can need from the format file: a front matter key, or a ::: rail block.
const NEEDS = ["image", "stat", "stat-label", "rail"];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/, KEYS = ["name", "use", "when", "needs", "base", "front", "css", "slots"];
// Front matter a saved layout carries from the sheet it was made from: how the page is set, never its content.
const ARRANGE = ["hero", "mast-split", "fill", "colophon"];
// Front matter a brand layout can't default: they decide which brand, format and layout the file is.
const FIXED = ["brand", "format", "layout"];
const err = m => new Error(`[layouts] ${m}`);
const core = id => id !== "standard" && !!defaults("sheet")[id];

// A file's front matter as {key: value} (one-line values, quotes and trailing comments dropped).
function front(text) {
  const m = /^﻿?---\n([\s\S]*?)\n---/.exec(String(text || "").replace(/\r\n/g, "\n")), o = {};
  for (const l of (m ? m[1] : "").split("\n")) { const k = /^([\w-]+):\s*(.*?)\s*$/.exec(l); if (k && k[2]) o[k[1]] = k[2].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, ""); }
  return o;
}

// The output's format and its page layout from front matter: `format:` first, then `layout:` when it names a format (the old
// spelling). Throws when the two name different formats.
function pick(fm) {
  const clean = v => v == null ? null : String(v).trim().replace(/^["']|["']$/g, "") || null;
  const f = clean(fm.format), l = clean(fm.layout);
  if (f && l && FORMATS.includes(l) && l !== f) throw err(`format: ${f} and layout: ${l} disagree (layout: ${l} is the old spelling of format: ${l}); keep one`);
  return { format: f || (FORMATS.includes(l) ? l : null), layout: l && !FORMATS.includes(l) ? l : null };
}

// The Prism default layouts for a format, standard first.
function defaults(format = "sheet") {
  const core = JSON.parse(fs.readFileSync(path.join(__dirname, "layouts.json"), "utf8"))[format] || {};
  const all = { standard: { name: "Standard", use: format === "sheet" ? "The title band, then the story in one column." : `The ${format} as it is.`,
    when: "Nothing else clearly leads the piece.", needs: [], base: "standard", front: {}, css: null, from: "core" } };
  for (const [k, v] of Object.entries(core)) all[k] = { name: v.name, use: v.use, when: v.when || "", needs: v.needs || [], base: k, front: {}, css: null, from: "core" };
  return all;
}

// A brand's own layouts for a format, from layouts/<format>/*.json beside its profile, checked.
function brandLayouts(brand, format, core) {
  const dir = brandDir(brand).dir, d = path.join(dir, "layouts", format), out = {};
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d).filter(f => f.endsWith(".json")).sort()) {
    const id = f.slice(0, -5), rel = `layouts/${format}/${f}`, at = `${brand}: ${rel}`;
    if (!ID.test(id)) throw err(`${at}: a layout id is lowercase letters, digits and hyphens`);
    if (FORMATS.includes(id)) throw err(`${at}: ${id} is a format (format: ${id}), so it can't be a layout id`);
    if (id === "standard") throw err(`${at}: a brand doesn't define standard; restyle it in the brand's layer`);
    let v; try { v = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); } catch (e) { throw err(`${at} is not valid JSON (${e.message})`); }
    if (!v || typeof v !== "object" || Array.isArray(v)) throw err(`${at}: a layout is a JSON object`);
    const extra = Object.keys(v).filter(k => !KEYS.includes(k));
    if (extra.length) throw err(`${at}: ${extra.join(", ")} not known (a layout has ${KEYS.join(", ")})`);
    for (const k of ["name", "use"]) if (typeof v[k] !== "string" || !v[k].trim()) throw err(`${at}: no ${k}`);
    const needs = v.needs == null ? [] : v.needs;
    if (!Array.isArray(needs) || needs.some(n => !NEEDS.includes(n))) throw err(`${at}: needs is a list of ${NEEDS.join(", ")}`);
    // Replacing a default keeps that default's structure unless it names another base.
    const base = v.base == null ? (core[id] ? id : "standard") : v.base;
    if (!core[base]) throw err(`${at}: base ${base} is not a Prism default layout (${Object.keys(core).join(", ")})`);
    const fr = v.front == null ? {} : v.front;
    if (typeof fr !== "object" || Array.isArray(fr)) throw err(`${at}: front is an object of front matter defaults ("hero": "x-small")`);
    for (const [k, x] of Object.entries(fr)) {
      if (!/^[\w-]+$/.test(k) || !["string", "number", "boolean"].includes(typeof x)) throw err(`${at}: front.${k} must be one plain value`);
      if (FIXED.includes(k)) throw err(`${at}: front.${k}: a layout can't set ${k}`);
    }
    let slots = null;
    if (v.slots != null) {
      if (!Array.isArray(v.slots) || !v.slots.length) throw err(`${at}: slots is a list of the body's blocks in order`);
      v.slots.forEach((x, i) => {
        const w = `${at}: slots[${i}]`, bad = x && typeof x === "object" ? Object.keys(x).filter(k => !["block", "holds", "optional", "repeat"].includes(k)) : null;
        if (!bad) throw err(`${w} is an object: {"block": "## heading", "holds": "..."}`);
        if (bad.length) throw err(`${w}: ${bad.join(", ")} not known (a slot has block, holds, optional, repeat)`);
        for (const k of ["block", "holds"]) if (typeof x[k] !== "string" || !x[k].trim()) throw err(`${w}: no ${k}`);
        if (x.optional != null && typeof x.optional !== "boolean") throw err(`${w}: optional is true or false`);
        if (x.repeat != null && !range(x)) throw err(`${w}: repeat is a count or a range ("1-3")`);
      });
      slots = v.slots;
    }
    let css = null;
    if (v.css != null) {
      if (typeof v.css !== "string" || !/^[\w.-]+\.css$/.test(v.css)) throw err(`${at}: css names a .css file beside it ("${id}.css")`);
      if (!fs.existsSync(path.join(d, v.css))) throw err(`${at}: css ${v.css} is not in layouts/${format}/`);
      css = `layouts/${format}/${v.css}`;
    }
    out[id] = { name: v.name, use: v.use, when: v.when || "", needs: [...new Set([...core[base].needs, ...needs])], base, front: fr, css, slots,
      cssFile: css ? path.join(dir, css) : null, file: rel, from: brand };
  }
  return out;
}

// Every layout a brand has for a format: its own first (one with a default's id replaces it), then the Prism defaults it
// hasn't switched off, standard last (what a piece takes when nothing else fits).
function load(brand, format = "sheet") {
  const core = defaults(format);
  if (!brand) return core;
  const pf = path.join(brandDir(brand).dir, "profile.json");
  if (!fs.existsSync(pf)) throw err(`no brand "${brand}"`);
  const prof = JSON.parse(fs.readFileSync(pf, "utf8")), own = brandLayouts(brand, format, core), all = { ...own };
  for (const [k, v] of Object.entries(core)) if (!all[k] && k !== "standard") all[k] = v;
  all.standard = core.standard;
  for (const [k, v] of Object.entries(((prof.layouts || {})[format]) || {})) {
    if (k === "standard") throw err(`${brand}: profile layouts.${format}.standard: standard can't be switched off; restyle it in the brand's layer`);
    if (v !== null) throw err(`${brand}: profile layouts.${format}.${k}: only null goes here (it switches a Prism default layout off); a brand layout is layouts/${format}/${k}.json`);
    if (!all[k]) throw err(`${brand}: profile layouts.${format}.${k} switches off a layout that doesn't exist`);
    delete all[k];
  }
  return all;
}

// What a format file lacks for its layout: front matter keys (the layout's own front defaults count), or a ::: rail block.
function missing(layout, fm, md) {
  const body = String(md || "").replace(/\r\n/g, "\n").replace(/^﻿?---\n[\s\S]*?\n---\n?/, "");
  return (layout.needs || []).filter(n => n === "rail" ? !/^:{3,}\s*(\{[^}]*\.rail\b[^}]*\}|rail\b)/m.test(body) : fm[n] == null || !String(fm[n]).trim());
}
const needText = n => n === "rail" ? "a ::: rail block" : `${n}: in the front matter`;

// ---------- Slots: the body's arrangement ----------
const bodyOf = text => String(text || "").replace(/\r\n/g, "\n").replace(/^\uFEFF?---\n[\s\S]*?\n---\n?/, "");

// A body's top-level blocks, each its exact Markdown: fenced divs (nested by depth), code fences, and runs of lines between
// blank lines. Design mode splits a file the same way (build-wire.js), so a saved layout's slots are the board's blocks.
function blocks(text) {
  const lines = String(text).split("\n"), out = [];
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

// A fenced div's classes and its logo= placement, from its opener (`::: {.media .flip}` or `::: media`).
function divOf(line) {
  const m = /^:{3,}\s*(.*)$/.exec(line), a = (m ? m[1] : "").trim();
  if (!a.startsWith("{")) return { classes: a.split(/\s+/).filter(Boolean), logo: null };
  const classes = [...a.matchAll(/\.([\w-]+)/g)].map(x => x[1]), logo = (/\blogo=("[^"]*"|\S+?)[\s}]/.exec(a) || [])[1];
  return { classes, logo: logo ? logo.replace(/"/g, "") : null };
}
// A block's shape: the markup that says what kind of block it is, its words left out. Blocks of one shape fill one slot.
function shape(b) {
  const first = b.split("\n")[0];
  if (/^```/.test(first)) return "```" + first.slice(3).trim().split(/\s+/)[0];
  if (/^:{3,}/.test(first)) { const d = divOf(first); return `::: {${d.classes.map(c => "." + c).join(" ")}${d.logo ? ` logo="${d.logo}"` : ""}}`; }
  const h = /^(#{1,6})\s/.exec(first); if (h) return `${h[1]} heading`;
  if (/^\s*\d+[.)]\s/.test(first)) return "numbered list";
  if (/^\s*[-*+]\s/.test(first)) return "list";
  if (/^>/.test(first)) return "quote";
  if (/^\|/.test(first)) return "table";
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(first)) return "---";
  const img = /^!\[[^\]]*\]\([^)]+\)(\{([^}]*)\})?\s*$/.exec(b.trim());
  if (img) { const dev = /device=(\w+)/.exec(img[2] || ""); return dev ? `image {device=${dev[1]}}` : "image"; }
  if (/^\[[^\]]*\]\{\.eyebrow\}\s*$/.test(b.trim())) return "label";
  return "paragraph";
}
// Two shapes match when they are the same kind with the same classes, in any order.
const key = sh => /^::: \{/.test(sh) ? "div:" + (divOf(sh).classes.slice().sort().join(".")) + "|" + (divOf(sh).logo || "") : sh;
const words = t => (String(t).replace(/!\[[^\]]*\]\([^)]*\)(\{[^}]*\})?/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\]\([^)]*\)/g, " ")
  .replace(/^:{3,}.*$/gm, " ").replace(/[#>*_`|[\]-]/g, " ").match(/[\w%$.,'’]+/g) || []).filter(w => /\w/.test(w)).length;
const about = n => n <= 5 ? n : Math.round(n / 5) * 5;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
// What a block holds, said so a writer can fill it from other content: counts and lengths, never its words.
function holds(b) {
  const sh = shape(b), lines = b.split("\n");
  if (/heading$/.test(sh)) return `a heading of about ${about(words(lines[0]))} words`;
  if (sh === "paragraph") return `a paragraph of about ${about(words(b))} words`;
  if (/list$/.test(sh)) return plural(lines.filter(l => /^\s*([-*+]|\d+[.)])\s/.test(l) && !/^\s{2,}/.test(l)).length, "item");
  if (sh === "quote") return `a quote of about ${about(words(lines.filter(l => !/\{\.cite\}/.test(l)).join(" ")))} words${/\{\.cite\}/.test(b) ? ", with who said it" : ""}`;
  if (sh === "table") { const rows = lines.filter(l => /^\|/.test(l) && !/^\|[\s:|-]+\|$/.test(l)); return `a table of ${plural(Math.max(0, rows.length - 1), "row")} and ${plural((rows[0] || "").split("|").length - 2, "column")}`; }
  if (sh === "---") return "a break between groups of sections";
  if (sh === "label") return "a short label";
  if (/^image/.test(sh)) return /device=/.test(sh) ? "a screenshot in the device" : "a photo";
  if (sh === "```chart") return "a chart";
  if (/^```/.test(sh)) return "a code sample";
  // A fenced div: what is inside it, counted.
  const inner = blocks(lines.slice(1, -1).join("\n")), parts = [];
  const items = lines.slice(1, -1).filter(l => /^([-*+]|\d+[.)])\s/.test(l)).length;
  const count = (test, one, many) => { const n = inner.filter(test).length; if (n) parts.push(plural(n, one, many)); };
  if (items) parts.push(plural(items, "item"));
  count(x => /heading$/.test(shape(x)), "heading");
  count(x => shape(x) === "label", "label");
  count(x => shape(x) === "paragraph", "paragraph");
  count(x => /^image/.test(shape(x)) || /^!\[/.test(x.trim()), "photo");
  count(x => shape(x) === "quote", "quote");
  count(x => shape(x) === "```chart", "chart");
  count(x => /^:{3,}/.test(x), "inner block");
  if (/\.qr\b|^:{3,}\s*qr\b/m.test(b)) parts.unshift("a QR code");
  return parts.length ? parts.join(", ") : "its own content";
}
// A slot's count: [min, max]. One by default; an optional slot may be left out; repeat is "n" or "n-m".
function range(slot) {
  const r = slot.repeat == null ? null : String(slot.repeat).trim(), m = r == null ? ["1", "1"] : (/^(\d+)(?:-(\d+))?$/.exec(r) || []).slice(1);
  if (!m.length) return null;
  const lo = +m[0], hi = m[1] != null ? +m[1] : lo;
  if (!(lo >= 1) || hi < lo) return null;
  return [slot.optional ? 0 : lo, hi];
}
// A sheet's body as slots: its blocks in order, words left out; a run of blocks of one shape is one slot that repeats.
function slotsOf(text) {
  const out = [];
  for (const b of blocks(bodyOf(text))) {
    const sh = shape(b), last = out[out.length - 1];
    if (last && key(last.block) === key(sh)) { last.n++; continue; }
    out.push({ block: sh, holds: holds(b), n: 1 });
  }
  return out.map(({ n, ...s }) => n > 1 ? { ...s, repeat: `1-${n}` } : s);
}
// Where a sheet departs from its layout's slots: a slot it leaves empty, a block out of place, a block the layout has no slot
// for. The blocks are lined up with the slots (the longest run they share, in order; a slot that repeats counts up to its
// most), so one moved block is one line, not everything after it. Empty when it follows them (or the layout has none).
function check(text, layout) {
  const slots = (layout && layout.slots) || [], out = [];
  if (!slots.length) return out;
  const bs = blocks(bodyOf(text)).map(b => ({ sh: shape(b), k: key(shape(b)) }));
  const want = slots.flatMap((x, s) => { const [, max] = range(x); return Array.from({ length: Math.min(max, 12) }, () => ({ s, k: key(x.block) })); });
  const n = bs.length, m = want.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = bs[i].k === want[j].k ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const got = new Array(slots.length).fill(0), lone = [];
  for (let i = 0, j = 0; i < n || j < m;) {
    if (i < n && j < m && bs[i].k === want[j].k) { got[want[j].s]++; i++; j++; }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) j++;
    else { lone.push(i); i++; }
  }
  for (const i of lone) {
    const at = slots.findIndex(x => key(x.block) === bs[i].k);
    out.push(at >= 0 ? `block ${i + 1} (${bs[i].sh}) is out of place: the layout has it at slot ${at + 1}` : `block ${i + 1} (${bs[i].sh}) has no slot in the layout`);
  }
  slots.forEach((x, s) => { const [min] = range(x); if (got[s] < min) out.push(`slot ${s + 1} (${x.block}: ${x.holds}) is ${got[s] ? `short: it takes at least ${min}` : "empty"}`); });
  return out;
}
// Sample Markdown for one slot, for the swatch: the slot's shape with placeholder words that say what goes there.
function sample(slot) {
  const sh = slot.block, say = slot.holds;
  if (/^#{1,6} heading$/.test(sh)) return `${sh.split(" ")[0]} A heading here`;
  if (sh === "paragraph") return `Sample text where the piece puts ${say.replace(/^a /, "a ")}.`;
  if (/list$/.test(sh)) return [1, 2, 3].map(n => (sh === "list" ? "- " : `${n}. `) + `Sample item ${n}`).join("\n");
  if (sh === "quote") return "> A short sample quote.\n>\n> [Name, Role]{.cite}";
  if (sh === "table") return "| Sample | Value |\n|---|---|\n| One | 41% |\n| Two | 94% |";
  if (sh === "---") return "---";
  if (sh === "label") return "[A short label]{.eyebrow}";
  if (/^image/.test(sh)) return `![Sample photo](prism:placeholder)`;
  if (sh === "```chart") return "```chart\ntype: bar\nOne: 41\nTwo: 94\n```";
  if (/^```/.test(sh)) return "```\nsample\n```";
  const d = divOf(sh), has = c => d.classes.includes(c), open = sh.replace(/^::: /, ":::: ");
  let inner = `Sample text: ${say}.`;
  if (has("stats")) inner = "- **41%** sample figure one\n- **94%** sample figure two\n- **2 days** sample figure three";
  else if (has("features")) inner = "- []{.icon .ph-shield-check} **Sample one** One sentence.\n- []{.icon .ph-clock} **Sample two** One sentence.\n- []{.icon .ph-users} **Sample three** One sentence.";
  else if (has("checks") || has("flow") || has("steps")) inner = has("steps") ? "1. **Review** the draft\n2. **Approve** it\n3. **Send** it" : "- **Draft** One step.\n- **Review** Another step.\n- **Approve** A third.";
  else if (has("media")) inner = "![Sample photo](prism:placeholder)\n\nSample text beside the photo.";
  else if (has("gallery")) inner = "![One](prism:placeholder)\n![Two](prism:placeholder)";
  else if (has("cta-card")) inner = "[Sample]{.eyebrow}\n\n## The closing card\n\nOne sentence for the close.";
  else if (has("qr")) return `::: {${d.classes.map(c => "." + c).join(" ")} url="https://example.com"}\nScan for the sample.\n:::`;
  else if (has("rail")) inner = "### At a glance\n\n::: stats\n- **41%** sample figure\n:::";
  return `${open}\n${inner}\n::::`;
}

module.exports = { load, defaults, missing, needText, pick, front, blocks, shape, holds, slotsOf, check, sample, range, ARRANGE, FORMATS, NEEDS };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const die = (m, c = 2) => { console.error(m.startsWith("[layouts]") ? m : `[layouts] ${m}`); process.exit(c); };
  // save: a sheet someone arranged becomes a brand layout: its base and how its page is set, and its body as slots.
  if (a[0] === "save") {
    const [, lid, file] = a, brand = opt("--brand");
    if (!lid || !file || !brand) die("usage: layouts.js save <layout-id> <format file> --brand B --name \"...\" --use \"...\" --when \"...\" [--replace]");
    if (!ID.test(lid) || FORMATS.includes(lid) || lid === "standard") die(`${lid}: a layout id is lowercase words joined by hyphens, never standard or a format (${FORMATS.join(", ")})`);
    for (const k of ["--name", "--use", "--when"]) if (!opt(k)) die(`say ${k}: the layout's ${k.slice(2)} (what it is, what the page looks like, when to pick it)`);
    if (!fs.existsSync(file)) die(`no ${file}`);
    const where = brandDir(brand);
    // A layout goes into an onboarding draft of the brand, then into its design system (onboarding publishes it). Never into
    // the plugin's own copy, nor into the copy this session read from the design system (that copy mirrors it).
    if (!where.draft) die(`${brand} has no onboarding draft here (this is ${where.layout === "design-system" ? "the copy read from its design system" : "the plugin's own copy"}); start its update first (run.sh onboard update ${brand}), then save the layout into that draft`);
    const text = fs.readFileSync(file, "utf8"), fm = front(text);
    let picked; try { picked = pick(fm); } catch (e) { die(e.message); }
    if (picked.format && picked.format !== "sheet") die(`${file} is a ${picked.format}; brand layouts are for sheets so far`);
    let all; try { all = load(brand, "sheet"); } catch (e) { die(e.message); }
    // A sheet already set in the layout being saved (saved again after rearranging) starts from that layout's base.
    const from = picked.layout ? (all[picked.layout] || (picked.layout === lid ? all.standard : null)) : all.standard;
    if (!from) die(`${file} names layout ${picked.layout}, which ${brand} doesn't have`);
    const dest = path.join(where.dir, "layouts", "sheet", `${lid}.json`);
    if (fs.existsSync(dest) && !a.includes("--replace")) die(`${brand} already has a layout ${lid}; --replace to change it`);
    const fr = { ...(from.front || {}) };
    for (const k of ARRANGE) if (fm[k] != null) fr[k] = fm[k];
    const slots = slotsOf(text);
    if (!slots.length) die(`${file} has no body to make slots from`);
    const v = { name: opt("--name"), use: opt("--use"), when: opt("--when"), base: from.base, ...(Object.keys(fr).length ? { front: fr } : {}), slots };
    const had = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
    fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, JSON.stringify(v, null, 1) + "\n");
    try { load(brand, "sheet"); } catch (e) { if (had) fs.writeFileSync(dest, had); else fs.unlinkSync(dest); die(e.message); }
    console.log(`[layouts] saved ${brand} layout ${lid}${core(lid) ? ` (it replaces the Prism default ${lid} for ${brand})` : ""}: base ${from.base}, ${slots.length} slots, at ${dest}`);
    slots.forEach((x, i) => console.log(`  ${i + 1}. ${x.block}: ${x.holds}${x.repeat ? ` (${x.repeat})` : ""}`));
    console.log(`[layouts] next: run.sh pin ${brand}, then publish layouts/sheet/${lid}.json into the brand's design system (only its editors can)`);
    process.exit(0);
  }
  // check: where a sheet departs from its layout's slots (exit 1 when it does).
  if (a[0] === "check") {
    const file = a[1]; if (!file || !fs.existsSync(file)) die("usage: layouts.js check <format file> [--brand B]");
    const text = fs.readFileSync(file, "utf8"), fm = front(text);
    let picked, all; try { picked = pick(fm); all = load(opt("--brand") || fm.brand || defaultBrand(), "sheet"); } catch (e) { die(e.message); }
    const L = picked.layout ? all[picked.layout] : null;
    if (!L || !L.slots) { console.log(`[layouts] ${file}: ${L ? `layout ${picked.layout} has no slots` : "no brand layout"}; nothing to check`); process.exit(0); }
    const off = check(text, L);
    if (!off.length) { console.log(`[layouts] ${file} follows layout ${picked.layout} (${L.slots.length} slots)`); process.exit(0); }
    console.log(`[layouts] ${file} departs from layout ${picked.layout}:`); for (const o of off) console.log(`  ${o}`);
    process.exit(1);
  }
  const format = opt("--format") || "sheet";
  let brand, all; try { brand = opt("--brand") || defaultBrand(); all = load(brand, format); } catch (e) { console.error(e.message); process.exit(2); }
  const own = (() => { try { return JSON.parse(fs.readFileSync(path.join(brandDir(brand).dir, "profile.json"), "utf8")).own || {}; } catch { return {}; } })();
  for (const [k, v] of Object.entries(all)) for (const f of [v.file, v.css].filter(Boolean)) if (!own[f]) console.error(`[layouts] ${brand}: ${f} is not pinned yet (run.sh pin ${brand})`);
  const rows = Object.entries(all).map(([id, v]) => ({ id, name: v.name, from: v.from, base: v.base, needs: v.needs, use: v.use, when: v.when, ...(v.from !== "core" ? { front: v.front, css: v.css, ...(v.slots ? { slots: v.slots } : {}) } : {}) }));
  if (a.includes("--json")) { console.log(JSON.stringify(Object.fromEntries(rows.map(({ id, ...r }) => [id, r])), null, 1)); process.exit(0); }
  console.log(`${format} layouts for ${brand}: the brand's own first, then the Prism default layouts, standard last`);
  for (const r of rows) console.log(`${r.id}: ${r.name} (${r.from === "core" ? "Prism default" : r.from})${r.base !== r.id ? ` · base ${r.base}` : ""}${r.needs.length ? ` · needs ${r.needs.join(", ")}` : ""}${r.slots ? ` · ${r.slots.length} slots` : ""}\n  ${r.use}\n  when: ${r.when || "-"}`);
}
