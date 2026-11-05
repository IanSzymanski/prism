#!/usr/bin/env node
// The number check: every number a format file shows is one content.md approved, with the same sign, percent, currency
// and scale ("40%" never approves "-40%", "$40M" or "40 countries"). Usage: check-numbers.js content.md format.md
// Builds run it themselves (gate below): a format file in a piece (<piece>/formats/x.md beside <piece>/content.md) that
// shows a number content.md doesn't have does not build. A number that is not a claim goes in the format file's front
// matter, where anyone can see it: allow-numbers: [2026].
const fs = require("fs"), path = require("path");

// Attribute values that are words on the page (a post's note="87% faster", a pill), unlike sizes, crops and addresses.
const SHOWN = /\b(?:note|pill|title|label|name)="([^"]*)"/g;

// Layout-only numbers (attributes, list markers, chart sizing, counters) are not claims, so they are removed first.
function claimsText(md) {
  md = String(md).normalize("NFKC");
  const shown = [];
  for (const b of md.match(/\{[^}\n]*\}/g) || []) for (const m of b.matchAll(SHOWN)) shown.push(m[1]);
  return (md + "\n" + shown.join("\n"))
    // The front-matter changes list records old wording, so its numbers never count as approved.
    .replace(/^changes:\s*\n(?:[ \t]+-.*\n?)*/m, " ")
    .replace(/^date\s*:.*$/gm, " ")
    // Link and image targets, hosting folders, the email issue line and merge tags are addresses, not claims.
    .replace(/\]\([^)\s]*\)/g, "]")
    // The format and page layout (format: 5x7), the cover photo's path and the file's own version name things; they are not claims.
    .replace(/^(image-base|issue|logo-link|mast-image|mast-split|mast-focus|mast-fade|seconds|aspect|phone-aspect|phone-scale|post|parent|placeholder|format|layout|image|image-focus|version|allow-numbers)\s*:.*$/gm, " ")
    .replace(/\$\{[^}\n]+\}|\$\[[^\]\n]+\]\$|\{\{[^}\n]+\}\}|\{%[^%\n]+%\}|\*\|[^|\n]+\|\*|%%[^%\n]+%%/g, " ")
    .replace(/\[\d{1,2}\s*·/g, "[")
    // Point numbers ([07]{.num}) go before the braces do, or the bare [07] would be left behind as a number.
    .replace(/\[(0?\d{1,2})\]\{\.num\}/g, " ")
    .replace(/\{[^}\n]*\}/g, " ")
    .replace(/^\s*:{3,}.*$/gm, " ")
    .replace(/^\s*\d+\.\s/gm, " ")
    .replace(/^\s*(height|max|labels|type|burst|note)\s*:.*$/gm, " ")
    .replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

const SCALE = { k: 1e3, K: 1e3, thousand: 1e3, M: 1e6, mn: 1e6, million: 1e6, B: 1e9, bn: 1e9, billion: 1e9 };
// A number with what changes its meaning: a sign written before it, a currency, a scale and a percent. A thousands
// separator needs groups of three ("1,200"); "1,2" is two numbers. A hyphen between numbers (2019-2023) is not a sign.
const TOKEN = /(?<![\d.])(?:(?<=^|[\s(\[:;"'“‘])([−+-]))?([$€£¥])?(\d{1,3}(?:,\d{3})+(?!\d)|\d+)(\.\d+)?(?:\s?(k|K|M|B|bn|mn|thousand|million|billion)(?![A-Za-z]))?(\s?(?:%|percent\b|per cent\b))?/g;
// A number stated as a fall in content.md ("fell 40%") approves the same number written with a minus sign.
const FALL = /\b(less|fewer|lower|down|drop|dropped|drops|fell|fall|falls|declin\w*|decreas\w*|reduc\w*|cut|cuts|shrank|lost|minus)\b/i;

function tokens(md) {
  const text = claimsText(md), out = [];
  for (const m of text.matchAll(TOKEN)) {
    const [raw, sign, cur, whole, dec, scale, pct] = m;
    const value = Math.round(parseFloat(whole.replace(/,/g, "") + (dec || "")) * (scale ? SCALE[scale] : 1) * 1e6) / 1e6;
    const near = text.slice(Math.max(0, m.index - 60), m.index + raw.length + 60);
    out.push({ raw: raw.trim(), value, neg: sign === "-" || sign === "−", cur: cur || "", pct: !!pct, fall: FALL.test(near) });
  }
  return out;
}
// The plain values a text states (claims rows mapped to the outputs that carry them).
const numbers = md => new Set(tokens(md).map(t => String(t.value)));

// Whether content.md's numbers approve one the format file shows. A bare number (a chart row with unit: %) needs only
// the value; a sign, percent or currency must be there in content.md too.
function approved(t, known) {
  return known.some(k => k.value === t.value
    && (!t.pct || k.pct)
    && (!t.cur || k.cur === t.cur)
    && (!t.neg || k.neg || k.fall));
}
const frontKey = (md, k) => { const fm = /^---\n([\s\S]*?)\n---/.exec(md); const m = fm && new RegExp(`^${k}:\\s*(.+)$`, "m").exec(fm[1]); return m ? m[1] : ""; };
function strays(content, format) {
  const known = tokens(content), allowed = tokens(frontKey(String(format).normalize("NFKC"), "allow-numbers").replace(/[[\]]/g, " "));
  const seen = new Set(), out = [];
  for (const t of tokens(format)) {
    if (approved(t, known) || allowed.some(a => a.value === t.value)) continue;
    const key = `${t.neg ? "-" : ""}${t.cur}${t.value}${t.pct ? "%" : ""}`;
    if (!seen.has(key)) { seen.add(key); out.push(t); }
  }
  return out;
}
// Where each stray is, for the report: up to three lines that show it.
function where(format, t) {
  const lines = String(format).normalize("NFKC").split("\n"), out = [];
  const at = new RegExp(`(?<![\\d.,])${t.raw.replace(/[.*+?^${}()|[\]\\$]/g, "\\$&")}(?![\\d])`);
  lines.forEach((l, i) => { if (out.length < 3 && at.test(l)) out.push(`line ${i + 1}: ${l.trim().slice(0, 100)}`); });
  return out;
}

// The build's gate: a format file in a piece builds only when its numbers are content.md's. Files outside a piece
// (fixtures, quick mode, which has no content.md and checks its own sources) are not gated.
function gate(md, tag) {
  const file = path.resolve(md), dir = path.dirname(file);
  if (path.basename(dir) !== "formats") return;
  const content = path.join(dir, "..", "content.md");
  if (!fs.existsSync(content)) return;
  const fmt = fs.readFileSync(file, "utf8"), s = strays(fs.readFileSync(content, "utf8"), fmt);
  if (!s.length) return;
  const rel = path.relative(process.cwd(), file) || file;
  console.error(`[${tag}] ${s.length} number(s) in ${rel} are not in content.md, so it was not built:`);
  for (const t of s) for (const w of where(fmt, t).slice(0, 2)) console.error(`  ${t.raw}  ${w}`);
  console.error(`[${tag}] Use content.md's number. A new fact goes into content.md first (content lane, reviewer); a number that is not a claim goes in this file's front matter: allow-numbers: [${s.map(t => JSON.stringify(t.raw)).join(", ")}]`);
  process.exit(1);
}

module.exports = { claimsText, numbers, tokens, strays, gate };
if (require.main !== module) return;
const [contentPath, formatPath] = process.argv.slice(2);
if (!contentPath || !formatPath) { console.error("usage: check-numbers.js content.md format.md"); process.exit(2); }
const format = fs.readFileSync(formatPath, "utf8"), unknown = strays(fs.readFileSync(contentPath, "utf8"), format);
if (!unknown.length) { console.log(`OK: every number in ${formatPath} appears in ${contentPath}`); process.exit(0); }
console.log(`CHECK: ${unknown.length} number(s) in ${formatPath} are not in ${contentPath}:`);
for (const t of unknown) for (const w of where(format, t)) console.log(`  ${t.raw}  ${w}`);
process.exit(1);
