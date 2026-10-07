#!/usr/bin/env node
// Lists every number in a format file that does not appear in content.md. Usage: check-numbers.js content.md format.md
const fs = require("fs");

// Layout-only numbers (attributes, list markers, chart sizing, counters) are not claims, so they are removed first.
function claimsText(md) {
  return md
    // The front-matter changes list records old wording, so its numbers never count as approved.
    .replace(/^changes:\s*\n(?:[ \t]+-.*\n?)*/m, " ")
    .replace(/^date\s*:.*$/gm, " ")
    // Link and image targets, hosting folders, the email issue line and merge tags are addresses, not claims.
    .replace(/\]\([^)\s]*\)/g, "]")
    .replace(/^(image-base|issue|logo-link)\s*:.*$/gm, " ")
    .replace(/\$\{[^}\n]+\}|\$\[[^\]\n]+\]\$|\{\{[^}\n]+\}\}|\{%[^%\n]+%\}|\*\|[^|\n]+\|\*|%%[^%\n]+%%/g, " ")
    .replace(/\[\d{1,2}\s*·/g, "[")
    .replace(/\{[^}\n]*\}/g, " ")
    .replace(/^\s*:{3,}.*$/gm, " ")
    .replace(/^\s*\d+\.\s/gm, " ")
    .replace(/^\s*(height|max|labels|type|burst|note)\s*:.*$/gm, " ")
    .replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g, " ")
    .replace(/\[(0?\d{1,2})\]\{\.num\}/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}
const numbers = md => new Set((claimsText(md).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => n.replace(/,/g, "")).map(n => String(parseFloat(n))));

module.exports = { claimsText, numbers };
if (require.main !== module) return;
const [contentPath, formatPath] = process.argv.slice(2);
if (!contentPath || !formatPath) { console.error("usage: check-numbers.js content.md format.md"); process.exit(2); }
const known = numbers(fs.readFileSync(contentPath, "utf8"));
const found = numbers(fs.readFileSync(formatPath, "utf8"));
const unknown = [...found].filter(n => !known.has(n));
if (!unknown.length) { console.log(`OK: every number in ${formatPath} appears in ${contentPath}`); process.exit(0); }
const lines = fs.readFileSync(formatPath, "utf8").split("\n");
console.log(`CHECK: ${unknown.length} number(s) in ${formatPath} are not in ${contentPath}:`);
for (const n of unknown) {
  const at = lines.map((l, i) => [i + 1, l]).filter(([, l]) => new RegExp(`(^|[^\\d.])${n.replace(".", "\\.")}(?![\\d])`).test(l.replace(/,/g, "")));
  for (const [i, l] of at.slice(0, 3)) console.log(`  ${n}  line ${i}: ${l.trim().slice(0, 100)}`);
}
process.exit(1);
