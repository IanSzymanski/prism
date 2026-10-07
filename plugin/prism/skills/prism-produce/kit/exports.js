#!/usr/bin/env node
// Co-op: the Exports page, so invitees can download what the owner exported without Prism. Lists every format's last
// export from <project>/.prism/state.json (and any extra file, such as a package zip), one section per format.
// Usage: exports.js <project> --out DIR [--title "Piece title"] [--add FILE...]
//   Writes DIR/index.html and prints a publish: line (file_path, files) for the Artifact tool. Files over the hosting limit
//   are listed as too large and left out; the page says so, and the owner sends those another way.
const fs = require("fs"), path = require("path");
const args = process.argv.slice(2), proj = args[0];
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const outDir = opt("--out");
if (!proj || !outDir) { console.error("usage: exports.js <project> --out DIR [--title T] [--add FILE...]"); process.exit(2); }
const LIMIT = 15 * 1024 * 1024;
// Types the browser can't guess from the extension alone are named, so the download keeps its type.
const TYPES = { ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".zip": "application/zip" };

const stateFile = path.join(proj, ".prism", "state.json");
const S = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : { exports: {} };
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const size = n => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
const walk = f => fs.statSync(f).isDirectory() ? fs.readdirSync(f).sort().flatMap(x => walk(path.join(f, x))) : [f];

// Groups: one per exported format, then the extra files.
const groups = Object.entries(S.exports || {}).sort(([a], [b]) => a.localeCompare(b))
  .map(([name, e]) => ({ name, note: `v${e.content_version} · ${e.at.slice(0, 10)}`, files: e.files.map(f => path.resolve(proj, f)) }));
const extra = []; for (let i = args.indexOf("--add") + 1; i > 0 && i < args.length && !args[i].startsWith("--"); i++) extra.push(path.resolve(args[i]));
if (extra.length) groups.push({ name: "Everything", note: "", files: extra });
if (!groups.length) { console.error("nothing exported yet: record exports with state.js <project> export first"); process.exit(1); }

const files = {}, used = new Set(), tooBig = [];
const rows = g => g.files.filter(fs.existsSync).flatMap(walk).map(f => {
  const n = fs.statSync(f).size, base = path.basename(f);
  if (n > LIMIT) { tooBig.push(base); return `<li><span class="name">${esc(base)}</span><span class="meta">${size(n)} · too large to host here; ask the owner for it</span></li>`; }
  let pub = "files/" + base; for (let k = 2; used.has(pub); k++) pub = `files/${k}-${base}`;
  used.add(pub);
  const type = TYPES[path.extname(f).toLowerCase()];
  files[pub] = type ? { from: f, contentType: type } : f;
  return `<li><a href="${esc(pub)}" download="${esc(base)}">${esc(base)}</a><span class="meta">${size(n)}</span></li>`;
}).join("");

const title = opt("--title") || path.basename(path.resolve(proj));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} files</title>
<style>
:root{--bg:#F6F6F8;--card:#FFFFFF;--fg:#1C1C24;--muted:#62626C;--line:#DCDCE2;--link:#2F55B5}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141418;--card:#1D1D23;--fg:#ECECF1;--muted:#A0A0AA;--line:#33333C;--link:#8FB0FF}}
:root[data-theme="dark"]{--bg:#141418;--card:#1D1D23;--fg:#ECECF1;--muted:#A0A0AA;--line:#33333C;--link:#8FB0FF}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 16px 48px}
h1{font-size:26px;margin:0 0 4px}p.lede{margin:0 0 24px;color:var(--muted)}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:0 0 14px}
h2{font-size:15px;margin:0 0 8px;display:flex;justify-content:space-between;gap:12px}h2 span{color:var(--muted);font-weight:400}
ul{list-style:none;margin:0;padding:0}li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid var(--line);overflow-wrap:anywhere}
li:first-child{border-top:0}a{color:var(--link)}.meta{color:var(--muted);white-space:nowrap}
</style></head><body><main>
<h1>${esc(title)}</h1>
<p class="lede">The files as last exported${S.coop && S.coop.owner ? ` by ${esc(S.coop.owner)}` : ""}. This page is replaced on every export; ask for changes on the proof doc or the design canvas.</p>
${groups.map(g => `<section><h2>${esc(g.name)}<span>${esc(g.note)}</span></h2><ul>${rows(g)}</ul></section>`).join("\n")}
</main></body></html>
`;
fs.mkdirSync(outDir, { recursive: true });
const page = path.join(path.resolve(outDir), "index.html");
fs.writeFileSync(page, html);
if (tooBig.length) console.log(`too large to host (over 15 MB), left out: ${tooBig.join(", ")}`);
console.log(`exports page: ${page} (${Object.keys(files).length} file(s))`);
console.log("publish: " + JSON.stringify({ file_path: page, files }));
