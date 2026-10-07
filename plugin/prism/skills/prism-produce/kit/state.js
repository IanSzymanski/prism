#!/usr/bin/env node
// Design-mode state for one piece, kept in <project>/.prism/state.json so a later session can pick it up: the canvas and the
// version last published or pulled, every format's last export, and what changed since (content.md's `changes:` list).
// Usage: state.js <project> show [--json]
//        state.js <project> canvas --url URL --version ID       (after every publish to the canvas and every pull)
//        state.js <project> export <format> <file>...           (after verify OK: the files delivered for that format)
//        state.js <project> pull-needed --version ID            (exit 0 and "pull" when the canvas changed, else "skip")
//        state.js <project> close                               (design mode ended)
//        state.js <project> coop --owner NAME [--doc URL] [--exports URL]   (co-op: who owns the piece, its shared links)
//        state.js <project> invite NAME... [--remove]           (co-op: people invited to edit; the owner still clicks Share)
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const [proj, cmd, ...rest] = process.argv.slice(2);
if (!proj || !cmd) { console.error("usage: state.js <project> show|canvas|export|pull-needed|close|coop|invite ..."); process.exit(2); }
const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
const dir = path.join(proj, ".prism"), file = path.join(dir, "state.json");
const S = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { canvas: null, exports: {}, session: "none" };
const save = () => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(S, null, 1) + "\n"); };
const now = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const sha = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 16);

// content.md's version and its `changes:` list ("v4 · canvas: slide 3 moved above slide 2").
function content() {
  const f = path.join(proj, "content.md");
  if (!fs.existsSync(f)) return { version: 0, changes: [] };
  const fm = (/^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(f, "utf8")) || [, ""])[1];
  const version = +((/^version:\s*(\d+)/m.exec(fm) || [, 0])[1]);
  const block = (/^changes:\s*\n((?:\s+-.*\n?)*)/m.exec(fm + "\n") || [, ""])[1];
  const changes = block.split("\n").map(l => l.replace(/^\s+-\s*/, "").replace(/^["']|["']$/g, "").trim()).filter(Boolean)
    .map(t => ({ v: +((/^v(\d+)/.exec(t) || [, 0])[1]), text: t }));
  return { version, changes };
}

if (cmd === "canvas") {
  S.canvas = { url: opt("--url") || (S.canvas && S.canvas.url), version: opt("--version"), at: now() };
  if (S.session === "none") S.session = "open";
  save(); console.log(`canvas recorded: ${S.canvas.url} at version ${S.canvas.version}`);
} else if (cmd === "pull-needed") {
  // A pull reads every board back, the slow and costly part of a design-session request; skip it when nobody saved since.
  // A version id starts with its save time in seconds ("1791305898-aae5"). The canvas service may write a second version in
  // the same second as a publish; a person's edit always saves later. So: same second (2 s grace) means nobody edited since.
  // With invitees, someone else can save within those 2 s, so only the exact version counts as unchanged.
  const v = opt("--version"), t = x => +String(x || "").split("-")[0] || 0, shared = !!(S.coop && S.coop.invitees.length);
  const same = S.canvas && v && (S.canvas.version === v || (!shared && t(v) && Math.abs(t(v) - t(S.canvas.version)) <= 2));
  console.log(same ? "skip: the canvas is unchanged since the last publish or pull" : "pull: the canvas changed (or is not recorded yet)");
} else if (cmd === "export") {
  const [format, ...files] = rest;
  if (!format || !files.length) { console.error("usage: state.js <project> export <format> <file>..."); process.exit(2); }
  const c = content(), fmt = path.join(proj, "formats", format + ".md");
  // A snapshot of the board as exported, so the canvas can be checked against (and rebuilt from) what was delivered.
  const wire = path.join(proj, "wire", format), snap = path.join(dir, "exports", format, "v" + c.version);
  if (fs.existsSync(wire)) { fs.mkdirSync(snap, { recursive: true }); for (const f of fs.readdirSync(wire)) if (fs.statSync(path.join(wire, f)).isFile()) fs.copyFileSync(path.join(wire, f), path.join(snap, f)); }
  S.exports[format] = { content_version: c.version, format_sha: fs.existsSync(fmt) ? sha(fmt) : null, files: files.map(f => path.relative(proj, path.resolve(f))), at: now(), snapshot: fs.existsSync(snap) ? path.relative(proj, snap) : null };
  if (S.session !== "closed") S.session = "exported";
  save(); console.log(`export recorded: ${format} at content v${c.version}, ${files.length} file(s)`);
} else if (cmd === "coop") {
  const c = S.coop || { owner: null, invitees: [], doc: null, exports: null };
  for (const k of ["owner", "doc", "exports"]) if (opt("--" + k)) c[k] = opt("--" + k);
  if (!c.owner) { console.error("usage: state.js <project> coop --owner NAME [--doc URL] [--exports URL]"); process.exit(2); }
  S.coop = c; save(); console.log(`co-op: owner ${c.owner}${c.doc ? `, doc ${c.doc}` : ""}${c.exports ? `, exports ${c.exports}` : ""}`);
} else if (cmd === "invite") {
  if (!S.coop) { console.error("record the owner first: state.js <project> coop --owner NAME"); process.exit(2); }
  const names = rest.filter(x => x !== "--remove").map(x => x.replace(/^@/, "")).filter(Boolean), same = (a, b) => a.toLowerCase() === b.toLowerCase();
  if (!names.length) { console.error("usage: state.js <project> invite NAME... [--remove]"); process.exit(2); }
  for (const n of names) {
    if (rest.includes("--remove")) S.coop.invitees = S.coop.invitees.filter(x => !same(x.name, n));
    else if (!S.coop.invitees.some(x => same(x.name, n))) S.coop.invitees.push({ name: n, at: now() });
  }
  save(); console.log(`invitees: ${S.coop.invitees.map(x => x.name).join(", ") || "none"}`);
} else if (cmd === "close") {
  S.session = "closed"; save(); console.log("design mode closed");
} else if (cmd === "show") {
  const c = content(), out = { session: S.session, canvas: S.canvas, coop: S.coop || null, content_version: c.version, formats: {} };
  const fdir = path.join(proj, "formats"), names = new Set([...Object.keys(S.exports), ...(fs.existsSync(fdir) ? fs.readdirSync(fdir).filter(f => f.endsWith(".md")).map(f => f.slice(0, -3)) : [])]);
  for (const n of [...names].sort()) {
    const e = S.exports[n], fmt = path.join(fdir, n + ".md");
    const changed = e && fs.existsSync(fmt) ? sha(fmt) !== e.format_sha : null;
    out.formats[n] = e ? { exported: `v${e.content_version}`, at: e.at, files: e.files, format_file_changed: changed, pending: c.changes.filter(x => x.v > e.content_version).map(x => x.text) }
      : { exported: null, pending: c.changes.map(x => x.text) };
  }
  if (rest.includes("--json")) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
  const mode = { none: "design mode not opened", open: "design session open, nothing exported yet: build only on \"done\"", exported: "exported: every change is exported again straight away", closed: "design mode closed" }[S.session];
  console.log(`${path.basename(path.resolve(proj))}: content v${c.version} · ${mode}${S.canvas ? ` · canvas ${S.canvas.url} (version ${S.canvas.version})` : ""}`);
  if (S.coop) console.log(`co-op: owner ${S.coop.owner} · invitees ${S.coop.invitees.map(x => x.name).join(", ") || "none"}${S.coop.doc ? ` · doc ${S.coop.doc}` : ""}${S.coop.exports ? ` · exports ${S.coop.exports}` : ""}`);
  for (const [n, f] of Object.entries(out.formats)) {
    console.log(`- ${n}: ${f.exported ? `exported ${f.exported} (${f.at})${f.format_file_changed ? ", format file changed since" : ""}` : "not exported"}${f.pending.length ? `; ${f.pending.length} change(s) since:` : "; up to date"}`);
    for (const p of f.pending) console.log(`    ${p}`);
  }
} else { console.error(`unknown command ${cmd}`); process.exit(2); }
