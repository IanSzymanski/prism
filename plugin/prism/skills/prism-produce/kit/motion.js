#!/usr/bin/env node
// Motion: a motion format file -> the brief Claude Motion makes the film from, then checks of the film it made.
// Usage: motion.js techniques [--brand <id>]
//        motion.js brief formats/motion.md --out <dir>        (writes brief.md and film.json; prints the uploads)
//        motion.js link <dir> <film url>                         (records the film this output was made into)
//        motion.js check <dir> <store dir>                    (the film's records, as ArtifactData saved them, against film.json)
//        motion.js render <dir> <store dir> <player dir> [--out <stills dir>] [--assets <dir>]   (stills from the player's headless entry)
const fs = require("fs"), path = require("path");

const KIT = __dirname;
const T = JSON.parse(fs.readFileSync(path.join(KIT, "motion-techniques.json"), "utf8"));
const ROLES_BY_CLASS = ["eyebrow", "sub", "label", "note", "stat", "unit", "cite", "body"];
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff", ".woff2": "font/woff2" };

// --- parsing ---------------------------------------------------------------------------------------------------------

// `{.a .b #id key=v key="v w"}` -> { classes, id, attrs }.
function attrs(s) {
  const out = { classes: [], id: null, attrs: {} };
  for (const m of String(s || "").matchAll(/([.#])([\w-]+)|([\w-]+)=(?:"([^"]*)"|(\S+))/g)) {
    if (m[1] === ".") out.classes.push(m[2]);
    else if (m[1] === "#") out.id = m[2];
    else out.attrs[m[3]] = m[4] !== undefined ? m[4] : m[5];
  }
  return out;
}
// Front matter as flat key: value pairs.
function frontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text), fm = {};
  if (!m) return { fm, body: text };
  for (const l of m[1].split("\n")) { const k = /^([\w-]+):\s*(.*?)\s*$/.exec(l); if (k) fm[k[1]] = k[2].replace(/^["']|["']$/g, ""); }
  return { fm, body: text.slice(m[0].length) };
}
// A line's on-screen words: markdown stripped, the accent word kept apart.
function words(s) {
  const accent = (/\*([^*]+)\*/.exec(s) || [])[1] || null;
  return { text: s.replace(/\*([^*]+)\*/g, "$1").replace(/\\ /g, " ").replace(/\\(.)/g, "$1").trim(), accent };
}

// Scenes and their blocks, with the line each started on (for error messages).
function parse(text) {
  const { fm, body } = frontMatter(text);
  const lines = body.split("\n"), offset = text.split("\n").length - lines.length;
  const scenes = [], errors = [];
  let scene = null, div = null, fence = null, quote = null;
  const at = i => i + 1 + offset;
  const push = b => { if (div) div.inner.push(b); else scene.blocks.push(b); };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (fence) { if (/^```\s*$/.test(l)) { push(fence); fence = null; } else fence.text += l + "\n"; continue; }
    let m;
    if ((m = /^:{4,}\s*\{([^}]*)\}\s*$/.exec(l))) {
      if (scene) errors.push(`line ${at(i)}: a scene opens inside scene "${scene.id}"; close it with :::: first`);
      const a = attrs(m[1]);
      if (!a.classes.includes("scene")) { errors.push(`line ${at(i)}: :::: blocks are scenes: {.scene .<layout> #id}`); continue; }
      scene = { id: a.id, layout: a.classes.find(c => c !== "scene" && c !== "morph") || null, morph: a.classes.includes("morph"),
        dur: a.attrs.dur !== undefined ? Number(a.attrs.dur) : null, name: a.attrs.name || null, blocks: [], notes: [], line: at(i),
        extra: a.classes.filter(c => !["scene", "morph"].includes(c)).slice(1), attrs: a.attrs };
      continue;
    }
    if (/^:{4,}\s*$/.test(l)) { if (!scene) errors.push(`line ${at(i)}: :::: closes no scene`); else { scenes.push(scene); scene = null; } continue; }
    if (!scene) { if (l.trim()) errors.push(`line ${at(i)}: text outside a scene: every block goes inside :::: {.scene ...}`); continue; }
    if ((m = /^:{3}\s*(?:\{([^}]*)\}|([\w-]+))\s*$/.exec(l))) {
      const a = m[1] !== undefined ? attrs(m[1]) : { classes: [m[2]], id: null, attrs: {} };
      div = { kind: a.classes.includes("notes") ? "notes" : a.classes.includes("draw") ? "draw" : "div", a, inner: [], text: "", line: at(i) };
      continue;
    }
    if (/^:{3}\s*$/.test(l)) {
      if (!div) { errors.push(`line ${at(i)}: ::: closes nothing`); continue; }
      if (div.kind === "notes") scene.notes.push(div.text.trim());
      else if (div.kind === "draw") scene.blocks.push({ role: "draw", say: div.text.trim(), a: div.a, line: div.line });
      else if (div.inner.some(b => b.role === "chart")) scene.blocks.push({ ...div.inner.find(b => b.role === "chart"), a: div.a });
      else errors.push(`line ${div.line}: unknown block ::: ${div.a.classes.join(" ")} (allowed: notes, draw, chart)`);
      div = null; continue;
    }
    if (div && div.kind !== "div") { div.text += l + "\n"; continue; }
    if ((m = /^```chart\s*$/.exec(l))) { fence = { role: "chart", text: "", a: attrs(""), line: at(i) }; continue; }
    if (!l.trim()) { quote = null; continue; }
    if ((m = /^(#{1,2})\s+(.*?)\s*(?:\{([^}]*)\})?\s*$/.exec(l))) { push({ role: m[1] === "#" ? "h1" : "h2", ...words(m[2]), a: attrs(m[3]), line: at(i) }); continue; }
    if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*(?:\{([^}]*)\})?\s*$/.exec(l))) {
      const logo = /^(brand:logo|prism:logo(-on-dark)?)$/.test(m[2]);
      push({ role: logo ? "logo" : "image", text: m[1], src: m[2], a: attrs(m[3]), line: at(i) }); continue;
    }
    if ((m = /^>\s?(.*)$/.exec(l))) {
      const sm = /^\[(.*)\]\{([^}]*)\}\s*$/.exec(m[1]);
      if (sm) { push({ role: "cite", ...words(sm[1]), a: attrs(sm[2]), line: at(i) }); continue; }
      if (!m[1].trim()) continue;
      if (quote) quote.text += " " + words(m[1]).text; else { quote = { role: "quote", ...words(m[1]), a: attrs(""), line: at(i) }; push(quote); }
      continue;
    }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(l))) { push({ role: "item", ...words(m[1]), a: attrs(""), line: at(i) }); continue; }
    if ((m = /^\[(.*)\]\{([^}]*)\}\s*$/.exec(l))) {
      const a = attrs(m[2]), role = a.classes.find(c => ROLES_BY_CLASS.includes(c)) || "body";
      push({ role, ...words(m[1]), a, line: at(i) }); continue;
    }
    push({ role: "body", ...words(l), a: attrs(""), line: at(i) });
  }
  if (scene) errors.push(`scene "${scene.id}" (line ${scene.line}) is never closed with ::::`);
  if (div) errors.push(`::: block at line ${div.line} is never closed`);
  return { fm, scenes, errors };
}

// --- validation ------------------------------------------------------------------------------------------------------

function techniquesFor(B) {
  const own = B ? ((readProfile(B).motion || {}).techniques || null) : null;
  return Object.keys(T.techniques).filter(k => !own || own.includes(k));
}
function readProfile(B) { try { return JSON.parse(fs.readFileSync(path.join(B.res.dir, "profile.json"), "utf8")); } catch { return {}; } }

function validate(doc, allowed) {
  const { fm, scenes } = doc, errors = [...doc.errors], warnings = [];
  const tech = T.techniques[fm.technique];
  if (!fm.title) errors.push("front matter: title is missing (the film's name; never \"Video\")");
  if (!tech) { errors.push(`front matter: technique "${fm.technique || ""}" is not one of: ${allowed.join(", ")}`); return { errors, warnings }; }
  if (!allowed.includes(fm.technique)) errors.push(`technique ${fm.technique} is not one this brand uses (${allowed.join(", ")})`);
  const aspect = fm.aspect || tech.aspect;
  if (!T.aspects[aspect]) errors.push(`front matter: aspect "${aspect}" is not one of: ${Object.keys(T.aspects).join(", ")}`);
  if (fm.ground && !["light", "dark"].includes(fm.ground)) errors.push(`front matter: ground is light or dark, not "${fm.ground}"`);
  if (fm.music && !T.music[fm.music]) errors.push(`front matter: music is one of ${Object.keys(T.music).join(", ")}, not "${fm.music}"`);
  if (!scenes.length) errors.push("no scenes: write at least a title scene and a closing scene");
  const ids = new Set();
  let total = 0;
  scenes.forEach((s, n) => {
    const where = `scene ${n + 1}${s.id ? ` (#${s.id})` : ""}, line ${s.line}`;
    if (!s.id) errors.push(`${where}: needs an id, e.g. {.scene .stat #result}`);
    else if (!/^[a-z][a-z0-9-]{0,31}$/.test(s.id)) errors.push(`${where}: id must be lower-case letters, digits and -, a letter first, 32 at most`);
    else if (ids.has(s.id)) errors.push(`${where}: id #${s.id} is used twice`);
    ids.add(s.id);
    const lay = tech.layouts[s.layout];
    if (!lay) { errors.push(`${where}: layout .${s.layout || "?"} is not a ${fm.technique} layout (${Object.keys(tech.layouts).join(", ")})`); return; }
    if (s.extra.length) errors.push(`${where}: unknown scene class .${s.extra.join(" .")}`);
    if (s.dur === null) s.dur = lay.dur;
    if (!(s.dur >= 1)) errors.push(`${where}: dur must be a number of seconds, 1 or more`);
    if (lay.min && s.dur < lay.min) errors.push(`${where}: a ${s.layout} scene is held ${lay.min} s at least (dur=${s.dur})`);
    total += s.dur || 0;
    if (!s.blocks.length) errors.push(`${where}: has nothing on screen`);
    for (const b of s.blocks) {
      const bw = `${where}, block at line ${b.line}`;
      const cls = b.a.classes.filter(c => !ROLES_BY_CLASS.includes(c) && c !== "draw" && c !== "chart");
      const bad = cls.filter(c => !T.classes[c] || c.startsWith("_"));
      if (bad.length) errors.push(`${bw}: unknown class .${bad.join(" .")}`);
      const off = cls.filter(c => T.classes[c] && !tech.classes.includes(c));
      if (off.length) errors.push(`${bw}: .${off.join(" .")} is not used in ${fm.technique} (${tech.classes.join(" ")})`);
      for (const kind of ["size", "enter", "hold", "exit"]) {
        const k = cls.filter(c => T.classes[c] && T.classes[c].kind === kind);
        if (k.length > 1) errors.push(`${bw}: one ${kind} class per block, not .${k.join(" .")}`);
      }
      if (cls.includes("count") && (b.a.attrs.from === undefined || isNaN(Number(b.a.attrs.from)))) errors.push(`${bw}: .count needs from=<number>`);
      if (b.a.attrs.at !== undefined && !(Number(b.a.attrs.at) >= 0 && Number(b.a.attrs.at) < (s.dur || Infinity))) errors.push(`${bw}: at=${b.a.attrs.at} is outside the scene's ${s.dur} s`);
      if (b.a.attrs.sfx && !T.sfx.includes(b.a.attrs.sfx)) errors.push(`${bw}: sfx=${b.a.attrs.sfx} is not one of ${T.sfx.join(", ")}`);
      const known = ["at", "from", "stagger", "sfx", "n", "label", "type"];
      const extra = Object.keys(b.a.attrs).filter(k => !known.includes(k));
      if (extra.length) errors.push(`${bw}: unknown attribute ${extra.join(", ")}`);
      if (b.role === "draw" && !b.say) errors.push(`${bw}: a ::: draw block describes the object in words`);
    }
  });
  if (scenes.length && scenes[scenes.length - 1].layout !== "closing") errors.push("the last scene is the closing end card (.closing)");
  if (scenes.length && scenes[0].layout !== "title") warnings.push("the first scene is usually .title: frame 0 is the film's thumbnail");
  if (total > 300) errors.push(`the film runs ${total} s; Motion films are 300 s at most`);
  else if (total < tech.length[0] || total > tech.length[1]) warnings.push(`the film runs ${total} s; a ${fm.technique} film is usually ${tech.length[0]}–${tech.length[1]} s`);
  if (/illustrative/i.test(fm.figures || "") && !scenes.some(s => s.blocks.some(b => /illustrative|fictional/i.test(b.text || "")))) {
    errors.push("figures: illustrative, but no line on screen says the piece is illustrative or fictional");
  }
  return { errors, warnings, total, aspect };
}

// --- the brief ---------------------------------------------------------------------------------------------------------

// The brand's face for a type role: the font file nearest its weight, uploaded as an asset named by the file.
function typeFace(B, role) {
  const r = B.res.roles[`prism-type-${role}`] || B.res.roles["prism-type-body"];
  const v = r.value, fam = B.res.roles[`prism-font-${v.family}`];
  const files = (fam && fam.value.files) || [];
  const w = Number(v.fontWeight) || 400;
  const f = files.slice().sort((a, b) => Math.abs(Number(a.weight) - w) - Math.abs(Number(b.weight) - w))[0];
  return { role, family: v.family, weight: w, letterSpacing: v.letterSpacing || "0", lineHeight: v.lineHeight || 1.2,
    upper: /^[A-Z0-9 ·]+$/.test(v.sample || "") , file: f ? f.path : null, face: f ? path.basename(f.path).replace(/\.[^.]+$/, "") : null };
}
const fmtAttrs = (b, tpl) => tpl.replace("{from}", b.a.attrs.from).replace("{stagger}", b.a.attrs.stagger || "0.3").replace("{at}", b.a.attrs.at || "");

function brief(mdPath, outDir) {
  const B = require("./brand.js")(mdPath);
  const text = fs.readFileSync(mdPath, "utf8"), doc = parse(text), allowed = techniquesFor(B);
  const v = validate(doc, allowed);
  for (const w of v.warnings) console.warn(`[motion] ${w}`);
  if (v.errors.length) { for (const e of v.errors) console.error(`[motion] ${e}`); console.error(`[motion] ${v.errors.length} problem(s): fix ${mdPath} and run again`); process.exit(1); }
  const { fm, scenes } = doc, tech = T.techniques[fm.technique], A = T.aspects[v.aspect];
  const theme = fm.ground === "dark" ? "dark" : B.res.themes[0];
  const col = n => B.color(n, theme);
  const ground = fm.ground === "dark" && B.has("prism-color-dark-surface") ? B.color("prism-color-dark-surface") : col("prism-color-surface");
  const ink = fm.ground === "dark" && B.has("prism-color-dark-surface") ? B.color("prism-color-text-strong", "dark") || "#FFFFFF" : col("prism-color-text-strong");
  const palette = { ground, main: col("prism-color-accent"), second: ink,
    accent: B.has("prism-color-chart-2") ? col("prism-color-chart-2") : col("prism-color-accent-strong") || col("prism-color-accent") };

  // Faces and assets: only what the film uses.
  const assets = new Map(), faces = {};
  const needType = new Set(["eyebrow"]);
  for (const s of scenes) for (const b of s.blocks) if (T.roles[b.role] && T.roles[b.role].type) needType.add(T.roles[b.role].type);
  for (const t of needType) { const f = typeFace(B, t); faces[t] = f; if (f.file) assets.set(path.basename(f.file), { name: path.basename(f.file), path: f.file, mime: MIME[path.extname(f.file).toLowerCase()] }); }
  let logo = null;
  if (scenes.some(s => s.blocks.some(b => b.role === "logo"))) {
    const role = fm.ground === "dark" && B.has("prism-asset-logo-on-dark") ? "prism-asset-logo-on-dark" : "prism-asset-logo";
    const p = B.asset(role), ext = path.extname(p).toLowerCase();
    if (ext === ".svg") { logo = { name: "logo.svg", path: p, mime: "image/svg+xml", svg: true }; }
    else { logo = { name: "logo" + ext, path: p, mime: MIME[ext], ...imageSize(p) }; assets.set(logo.name, logo); }
  }
  const images = [];
  for (const s of scenes) for (const b of s.blocks) if (b.role === "image") {
    const p = path.resolve(path.dirname(mdPath), b.src);
    if (!fs.existsSync(p)) { console.error(`[motion] scene #${s.id}: missing image ${b.src}`); process.exit(1); }
    const a = { name: path.basename(p), path: p, mime: MIME[path.extname(p).toLowerCase()], ...imageSize(p) };
    assets.set(a.name, a); images.push(a); b.asset = a.name;
  }
  if (logo) for (const s of scenes) for (const b of s.blocks) if (b.role === "logo") b.asset = logo.name;

  // Scene facts for the brief and the check.
  let t0 = 0;
  const film = { v: 1, title: fm.title, technique: fm.technique, brand: B.id, aspect: v.aspect, width: A.width, height: A.height, fps: 60,
    background: palette.ground, palette, music: fm.music || "calm", length: v.total, assets: [...assets.values()], logo,
    faces: Object.fromEntries(Object.entries(faces).map(([k, f]) => [k, { face: f.face, family: f.family, weight: f.weight }])), scenes: [] };
  for (const s of scenes) {
    const name = s.name || s.id.replace(/-/g, " ").replace(/^./, c => c.toUpperCase());
    const lines = s.blocks.filter(b => !["logo", "image", "draw", "chart"].includes(b.role) && b.text).map(b => b.text);
    for (const b of s.blocks) if (b.role === "draw") for (const q of b.say.matchAll(/"([^"]+)"/g)) lines.push(q[1]);
    for (const b of s.blocks) if (b.role === "chart") lines.push(...chartLabels(b.text));
    const head = (s.blocks.find(b => b.role === "h1" || b.role === "h2") || {}).text || lines.slice(0, 3).join(" ");
    const desc = (s.notes[0] || `${s.layout[0].toUpperCase() + s.layout.slice(1)}: ${head}`).split(/(?<=\.)\s/)[0].slice(0, 160);
    const counts = [], countLines = [];
    for (const b of s.blocks) if (b.a.classes.includes("count")) {
      const to = parseFloat(String(b.text).replace(/,/g, "")), from = Number(b.a.attrs.from);
      countLines.push(b.text);
      if (Number.isInteger(to) && Number.isInteger(from)) for (let k = Math.min(from, to); k <= Math.max(from, to); k++) counts.push(String(k));
    }
    film.scenes.push({ id: s.id, name: name.slice(0, 48), dur: s.dur, start: Math.round(t0 * 100) / 100, layout: s.layout, desc, lines, counts, countLines });
    t0 += s.dur;
  }
  fs.mkdirSync(outDir, { recursive: true });
  try { film.url = JSON.parse(fs.readFileSync(path.join(outDir, "film.json"), "utf8")).url; } catch { /* a first brief */ }
  if (film.url) console.log(`film: ${film.url} (revise this film; never make a second one for this output)`);
  fs.writeFileSync(path.join(outDir, "film.json"), JSON.stringify(film, null, 1) + "\n");
  fs.writeFileSync(path.join(outDir, "brief.md"), briefText(B, doc, film, tech, A, faces));
  console.log(`[motion] ${fm.technique} · ${v.aspect} ${A.width}×${A.height} · ${scenes.length} scenes · ${v.total} s`);
  console.log(`brief: ${path.join(outDir, "brief.md")}`);
  console.log("upload: " + JSON.stringify({ file_paths: film.assets.map(a => a.path) }));
}

function imageSize(p) {
  const b = fs.readFileSync(p);
  if (b.slice(1, 4).toString() === "PNG") return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  return {};
}
// A chart block's on-screen words: its caption and labels (values are numbers, checked separately).
function chartLabels(text) {
  const out = [];
  for (const l of text.split("\n")) {
    const m = /^\s*([^:]+):\s*(.*)$/.exec(l); if (!m) continue;
    if (m[1].trim() === "caption") out.push(m[2].trim());
    else if (!["type", "highlight", "marker", "height", "max", "labels"].includes(m[1].trim())) out.push(m[1].trim());
  }
  return out;
}

function briefText(B, doc, film, tech, A, faces) {
  const { fm, scenes } = doc, P = film.palette;
  const L = [];
  const faceLine = (t) => { const f = faces[t]; return f.face ? `"${f.face}" (weight ${f.weight}${f.letterSpacing !== "0" ? `, letter-spacing ${f.letterSpacing}` : ""})` : `the ${f.family} stack`; };
  L.push(`# Motion brief: ${fm.title}`, "");
  L.push(`Written by Prism from its approved format file (${fm.technique}, brand ${B.name}). Make this film with the Motion type's own steps, in order, with this brief as the request. Everything below is settled: ask nothing.`, "");
  L.push("## The three answers", "");
  L.push(`- **Style:** ${tech.look}.`);
  L.push(`- **Colors:** the brand's design system (${B.name}), no others: ground ${P.ground}, main ${P.main}, second ${P.second} (the text ink), accent ${P.accent}. In scenes.json: \`"palettes":[["${P.ground}","${P.main}","${P.second}","${P.accent}"]]\`, \`"theirs":1\`.`);
  L.push(`- **Length:** ${film.length} seconds, as the scenes below add up.`, "");
  L.push("## The stage", "");
  L.push(`- ${A.width}×${A.height}, 60 fps, background ${P.ground}. ${A.safe[0].toUpperCase() + A.safe.slice(1)}.`);
  L.push(`- \`look\` in scenes.json, word for word: "${tech.look}; brand ${B.name}, font files supplied".`);
  L.push(`- Fonts are the brand's files, uploaded as assets with these exact names: ${film.assets.filter(a => a.mime.startsWith("font/")).map(a => `\`${a.name}\``).join(", ")}. Each registers as a face named by its file stem; name it ahead of the stack in base.css. In scenes.json \`fonts\`, put the nearest shipped faces underneath (they never show while the files load).`);
  if (film.logo) L.push(`- The logo is the brand's own file: ${film.logo.svg ? "inline its SVG markup in the closing scene (never uploaded)" : `asset \`${film.logo.name}\` (${film.logo.w}×${film.logo.h}), placed with kit.assets.url`}. Never redraw it.`);
  L.push("", "## Type", "", "Sizes are px on this stage. Set each line in its brand face:", "");
  const sz = A.sizes;
  L.push(`| Size | px |`, `|---|---|`, ...Object.entries(sz).map(([k, n]) => `| ${k} | ${n} |`), "");
  for (const [role, def] of Object.entries(T.roles)) if (def.type && faces[def.type] && usedRole(scenes, role)) L.push(`- ${def.say[0].toUpperCase() + def.say.slice(1)} (${role}): ${faceLine(def.type)}, default size ${def.size}.`);
  L.push("", "## Rules", "");
  L.push("- **Words on screen are verbatim.** Every line below is one string, exactly as written: no rewording, no new words, no added numbers, no extra captions or labels. A word in *stars* is the accent word: color it in the main color by splitting the string at run time, keeping the line one literal.");
  L.push("- Nothing else appears on screen: no invented logos, people, stats, icons or decorative text.");
  L.push("- Each scene's `id`, `name` and `dur` are exactly as given; scene order is as given.");
  for (const r of tech.rules) L.push(`- ${r}`);
  if (B.res.digest) L.push(`- The brand's visual rules apply (from its digest): ${digestVisual(B.res.digest)}`);
  L.push("", "## Scenes", "");
  scenes.forEach((s, n) => {
    const f = film.scenes[n], lay = tech.layouts[s.layout];
    L.push(`### ${n + 1}. #${s.id} · "${f.name}" · ${s.dur} s (starts at ${f.start} s)`, "");
    L.push(`- scenes.json: \`{"id":"${s.id}","name":"${f.name}","dur":${s.dur},"desc":${JSON.stringify(f.desc)}}\``);
    L.push(`- Layout ${s.layout}: ${lay.say}${s.morph ? " It opens by transforming the previous scene's main subject into this one's, no cut." : ""}`);
    for (const b of s.blocks) L.push(`- ${blockLine(b, s)}`);
    for (const note of s.notes) L.push(`- Direction: ${note.replace(/\s+/g, " ")}`);
    L.push("");
  });
  L.push("## Sound", "");
  L.push(`- ${T.music[film.music][0].toUpperCase() + T.music[film.music].slice(1)}.`);
  const cues = [];
  scenes.forEach((s, n) => { for (const b of s.blocks) if (b.a.attrs.sfx) cues.push(`${b.a.attrs.sfx} at ${Math.round((film.scenes[n].start + Number(b.a.attrs.at || 0)) * 100) / 100} s (#${s.id})`); });
  if (cues.length) L.push(`- Foley cues: ${cues.join("; ")}.`);
  L.push("");
  return L.join("\n");
}
const usedRole = (scenes, role) => scenes.some(s => s.blocks.some(b => b.role === role));
function digestVisual(file) {
  try {
    const t = fs.readFileSync(file, "utf8"), m = /## Visual rules[^\n]*\n([\s\S]*?)(\n## |$)/.exec(t);
    return m ? m[1].trim().split("\n").filter(l => l.startsWith("- ")).map(l => l.slice(2).trim()).join(" ") : "see the brand digest";
  } catch { return "see the brand digest"; }
}
function blockLine(b, s) {
  const def = T.roles[b.role], cls = b.a.classes;
  const size = cls.find(c => T.classes[c] && T.classes[c].kind === "size") || def.size;
  const moves = cls.filter(c => T.classes[c] && T.classes[c].kind !== "size").map(c => fmtAttrs(b, T.classes[c].say));
  const when = b.a.attrs.at !== undefined ? ` starting ${b.a.attrs.at} s into the scene` : "";
  const sfx = b.a.attrs.sfx ? ` (sound: ${b.a.attrs.sfx})` : "";
  const how = moves.length ? `; it ${moves.join(", then ")}${when}${sfx}.` : `${when ? `; it appears${when}` : ""}${sfx}.`;
  if (b.role === "logo") return `The brand logo (asset \`${b.asset}\`)${how}`;
  if (b.role === "image") return `The picture \`${b.asset}\` (${b.text ? `"${b.text}"` : "no caption on screen"})${how}`;
  if (b.role === "draw") return `Draw${b.a.attrs.n ? ` (${b.a.attrs.n} in all)` : ""}: ${b.say.replace(/\s+/g, " ").replace(/\.$/, "")}${/"/.test(b.say) ? ". Words in quotes are on-screen lines, verbatim" : ""}${how}`;
  if (b.role === "chart") return `A chart, built from this data (values exact; labels and caption verbatim):\n\n\`\`\`\n${b.text.trim()}\n\`\`\`\n\n  It${moves.length ? " " + moves.join(", then ") : " builds bar by bar"}${when}${sfx}.`;
  const accent = b.accent ? ` Accent word: "${b.accent}".` : "";
  return `${def.say[0].toUpperCase() + def.say.slice(1)}, size ${size}: "${b.text}"${how}${accent}`;
}

// --- check: the film Motion made, against film.json --------------------------------------------------------------------

// The documents ArtifactData saved under <store>/<collection>/<doc>.json, by collection.
function readStore(dir) {
  const out = {};
  for (const col of ["film", "modules", "assets"]) {
    const d = path.join(dir, col); out[col] = {};
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(f => f.endsWith(".json"))) {
      const j = JSON.parse(fs.readFileSync(path.join(d, f), "utf8"));
      out[col][f.slice(0, -5)] = j.data || j;
    }
  }
  return out;
}
// The words a scene module puts on screen: text between tags in its markup, and string literals that read as words
// (CSS, selectors, transforms and other code strings are left out). JS escapes are undone.
function screenText(code) {
  const lits = [];
  for (const m of code.matchAll(/'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g)) {
    const raw = m[1] ?? m[2] ?? m[3];
    let s; try { s = JSON.parse('"' + raw.replace(/\\'/g, "'").replace(/\\`/g, "`").replace(/(^|[^\\])"/g, '$1\\"') + '"'); } catch { s = raw; }
    lits.push(s);
  }
  const out = [];
  // Markup split over several literals joins back into one; its text nodes are what shows.
  const markup = lits.filter(l => /<\/?[a-z]/i.test(l) || /^[^<]*>/.test(l)).join("");
  for (const m of markup.matchAll(/>([^<]+)</g)) out.push(m[1]);
  const wordy = l => /[A-Za-z]{2,}.*\s.*[A-Za-z]{2,}|^[A-Za-z]{2,}[.!?]?$/.test(l) && !/[{}<>;=#]|\d(px|%|deg|ms|s\b)|^\s*[\w-]+\(|var\(|\b(rgba?|translate|scale|rotate|solid|px)\b/.test(l);
  for (const l of lits) if (!/</.test(l) && wordy(l)) out.push(l);
  return out.map(t => t.replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
}
const norm = s => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const NUM = /\d[\d,]*(?:\.\d+)?/g;

function check(dir, storeDir) {
  const film = JSON.parse(fs.readFileSync(path.join(dir, "film.json"), "utf8"));
  const st = readStore(storeDir), out = [], warn = [];
  const sj = st.modules["scenes.json"] ? JSON.parse(st.modules["scenes.json"].text) : null;
  if (!st.film.meta) out.push("film/meta is missing");
  else if (st.film.meta.title !== film.title) out.push(`title is "${st.film.meta.title}", the format file says "${film.title}"`);
  if (!sj) out.push("modules/scenes.json is missing: the film was not made from the brief");
  else {
    if (sj.stage !== "final") out.push(`scenes.json stage is "${sj.stage}": the film is not finished`);
    if (sj.width !== film.width || sj.height !== film.height) out.push(`stage is ${sj.width}×${sj.height}, the brief says ${film.width}×${film.height}`);
    const got = (sj.scenes || []).map(s => s.id).join(", "), want = film.scenes.map(s => s.id).join(", ");
    if (got !== want) out.push(`scenes are ${got || "none"}; the format file has ${want}`);
    for (const s of film.scenes) {
      const g = (sj.scenes || []).find(x => x.id === s.id);
      if (g && Math.abs(g.dur - s.dur) > 0.01) out.push(`#${s.id} runs ${g.dur} s, the format file says ${s.dur} s`);
      if (g && g.name !== s.name) warn.push(`#${s.id} is named "${g.name}", the brief says "${s.name}"`);
    }
  }
  // Lines the person retyped on the film page (the page's own record): routed like an edited format file, never failures.
  let retyped = [];
  try { const r = JSON.parse((st.modules["retyped.json"] || {}).text || "[]"); retyped = Array.isArray(r) ? r : (r.lines || r.items || []); } catch { retyped = []; }
  const pageEdits = [];
  const allowedNums = new Set(film.scenes.flatMap(s => s.lines.join(" ").match(NUM) || []).map(n => String(parseFloat(n.replace(/,/g, "")))));
  for (const s of film.scenes) {
    const mod = st.modules[`scene-${s.id}.js`];
    if (!mod) { out.push(`#${s.id}: no scene module (scene-${s.id}.js)`); continue; }
    if (/rough:\s*true/.test(mod.text)) out.push(`#${s.id}: still rough`);
    const shown = screenText(mod.text).map(norm), all = norm(shown.join(" "));
    for (const line of s.lines) {
      const n = norm(line);
      // A counting number is set at run time; its final value only has to be in the code.
      if ((s.countLines || []).includes(line)) { if (!new RegExp(`(^|[^\\d.])${line.replace(/[.,]/g, "\\$&")}(?![\\d])`).test(mod.text)) out.push(`#${s.id}: the count never reaches ${line}`); continue; }
      if (shown.some(t => t === n) || all.includes(n)) continue;
      const r = retyped.find(x => x && norm(String(x.was || "")) === n);
      if (r) pageEdits.push(`#${s.id}: "${line}" -> "${r.v}"`);
      else out.push(`#${s.id}: line missing or reworded: "${line}"`);
    }
    // Numbers in on-screen words that the format file never states.
    for (const t of shown) {
      for (const nm of t.match(NUM) || []) {
        const v = String(parseFloat(nm.replace(/,/g, "")));
        if (!allowedNums.has(v) && !isCountStep(v, s) && !retyped.some(x => String(x.v || "").includes(nm))) out.push(`#${s.id}: number ${nm} on screen ("${t.slice(0, 50)}") is not in the format file`);
      }
    }
  }
  // Brand faces: every font asset in film.json is a store asset with the right type, and base.css names it.
  const base = (st.modules["base.css"] || {}).text || "";
  for (const a of film.assets) {
    const doc = st.assets[a.name];
    if (!doc) { out.push(`asset ${a.name} is not in the film`); continue; }
    if (doc.mime !== a.mime) out.push(`asset ${a.name} has mime ${doc.mime}, expected ${a.mime}`);
    const stem = a.name.replace(/\.[^.]+$/, "");
    if (a.mime.startsWith("font/") && !base.includes(stem) && !Object.values(st.modules).some(m => (m.text || "").includes(stem))) out.push(`the brand face ${stem} is uploaded but never used`);
  }
  for (const name of Object.keys(st.assets)) if (!film.assets.some(a => a.name === name)) warn.push(`asset ${name} is in the film but not in the brief`);
  if (film.music !== "none" && !st.modules["score.js"]) out.push("no score.js: the brief asks for music");
  if (film.music === "none" && st.modules["score.js"]) out.push("score.js is there: the brief asks for silence");
  for (const w of warn) console.log(`  note: ${w}`);
  if (pageEdits.length) { console.log(`PAGE EDITS: ${pageEdits.length} line(s) retyped on the film page (vet them; ask before carrying them into content.md):`); for (const e of pageEdits) console.log(`  ${e}`); }
  if (!out.length) { console.log(`OK: the film matches ${path.join(dir, "film.json")} (${film.scenes.length} scenes, ${film.length} s, every line verbatim)`); return 0; }
  console.log(`CHECK: ${out.length} problem(s):`);
  for (const o of out) console.log(`  ${o}`);
  return 1;
}
// The numbers a .count passes through on its way (from=5 to 2 also shows 4 and 3).
const isCountStep = (v, s) => (s.counts || []).includes(v);

// --- render: stills from the player's headless entry, network blocked ----------------------------------------------

async function render(dir, storeDir, playerDir, outDir, assetsDir) {
  const film = JSON.parse(fs.readFileSync(path.join(dir, "film.json"), "utf8"));
  const st = readStore(storeDir);
  if (!st.film.script) { console.error("[motion] film/script is missing from the store"); return 1; }
  for (const f of ["index.html", "artifact-type/app.js", "artifact-type/app.css"]) if (!fs.existsSync(path.join(playerDir, f))) { console.error(`[motion] player file missing: ${f} (read it from the film with the Artifact tool)`); return 1; }
  const KIND = { ".css": "css", ".html": "html", ".js": "js", ".json": "json", ".txt": "text" };
  const files = { title: film.title, script: st.film.script.code,
    modules: Object.entries(st.modules).map(([name, m]) => ({ name, kind: m.kind || KIND[path.extname(name)], text: m.text })),
    assets: Object.entries(st.assets).map(([name, a]) => {
      const local = film.assets.find(x => x.name === name);
      if (local) return { name, mime: a.mime, base64: fs.readFileSync(local.path).toString("base64") };
      if (/^data:/.test(a.ref || "")) return { name, mime: a.mime, base64: a.ref.split(",")[1] };
      // An upload Prism doesn't hold: read from the film (Artifact read, its id as path) into --assets, by name or id.
      const id = (/_blob\/([0-9a-f]{32})/.exec(a.ref || "") || [])[1];
      const hit = assetsDir && fs.existsSync(assetsDir) && fs.readdirSync(assetsDir).find(f => f === name || (id && f.startsWith(id)));
      if (hit) return { name, mime: a.mime, base64: fs.readFileSync(path.join(assetsDir, hit)).toString("base64") };
      return null;
    }).filter(Boolean) };
  const missing = Object.keys(st.assets).filter(n => !files.assets.some(a => a.name === n));
  const { chromium } = require("playwright");
  const exe = process.env.PRISM_CHROMIUM;
  const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ["--font-render-hinting=none", "--force-color-profile=srgb", "--disable-lcd-text",
    "--host-resolver-rules=MAP * ~NOTFOUND", "--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=<-loopback>", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"] });
  // The film's code runs with no network and nothing outside the player folder.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.context().addInitScript(() => { for (const k of ["RTCPeerConnection", "webkitRTCPeerConnection"]) Reflect.deleteProperty(globalThis, k); });
  let here = null;
  await page.context().route("**/*", r => { const u = r.request().url(); if (!here && r.request().isNavigationRequest()) here = u.slice(0, u.lastIndexOf("/") + 1); return (here && u.startsWith(here)) || /^(data|blob):/.test(u) ? r.continue() : r.abort(); });
  await page.goto(require("url").pathToFileURL(path.resolve(playerDir, "index.html")).href + "#tools");
  await page.waitForFunction(() => typeof window.__animation === "object", null, { timeout: 30000 });
  const res = await page.evaluate(f => window.__animation.load(f), files);
  const problems = [];
  if (res.error) { console.error(`[motion] the film did not load: ${res.error.message || res.error}`); await browser.close(); return 1; }
  const meta = res.meta;
  if (Math.abs(meta.duration - film.length) > 0.01) problems.push(`the film runs ${meta.duration} s, the format file ${film.length} s`);
  for (const sc of meta.scenes || []) if (sc.state !== "final") problems.push(`#${sc.id} is ${sc.state}`);
  // Frame 0 (the thumbnail), then each scene just after it settles and just before it ends.
  const times = [0];
  for (const s of film.scenes) times.push(+(s.start + Math.min(s.dur * 0.6, s.dur - 0.2)).toFixed(2), +(s.start + s.dur - 0.05).toFixed(2));
  outDir = outDir || path.join(dir, "stills");
  fs.mkdirSync(outDir, { recursive: true });
  const shots = [];
  for (const t of times) {
    const url = await page.evaluate(tt => window.__animation.frame(tt, { scale: 1 }), t);
    const f = path.join(outDir, `t_${t.toFixed(2).padStart(6, "0")}.png`);
    fs.writeFileSync(f, Buffer.from(url.split(",")[1], "base64")); shots.push({ t, f });
  }
  // Seeking back to a time gives the same frame: the film is a pure function of time.
  const mid = film.scenes[Math.floor(film.scenes.length / 2)];
  const tm = +(mid.start + mid.dur / 2).toFixed(2);
  const a = await page.evaluate(tt => window.__animation.frame(tt, { scale: 1 }), tm);
  await page.evaluate(tt => window.__animation.frame(tt, { scale: 1 }), film.length - 0.1);
  const b = await page.evaluate(tt => window.__animation.frame(tt, { scale: 1 }), tm);
  if (a !== b) problems.push(`the frame at ${tm} s differs after seeking away and back: something depends on more than time`);
  const score = await page.evaluate(() => window.__animation.scoreReport()).catch(() => null);
  if (score && score.unknown && score.unknown.length) problems.push(`the score names sounds the player doesn't have: ${score.unknown.join(", ")}`);
  const log = await page.evaluate(() => window.__animation.consoleLog());
  for (const l of log) if (l.level === "error" || /raster-safety/.test(l.text)) problems.push(`runner ${l.level}: ${l.text.slice(0, 160)}`);
  // A contact sheet of the stills, labelled by time.
  const W = 360, H = Math.round(W * film.height / film.width), cols = Math.min(5, shots.length);
  const sheet = path.join(outDir, "contact-sheet.png");
  const html = `<body style="margin:0;background:#2a2a2e;font:14px system-ui;color:#ddd"><div style="display:grid;grid-template-columns:repeat(${cols},${W}px);gap:12px;padding:12px">` +
    shots.map(s => `<div><img src="data:image/png;base64,${fs.readFileSync(s.f).toString("base64")}" style="width:${W}px;height:${H}px;display:block"><div style="padding-top:4px">${s.t.toFixed(2)} s</div></div>`).join("") + "</div></body>";
  const sp = await browser.newPage({ viewport: { width: cols * (W + 12) + 12, height: 400 } });
  await sp.setContent(html); await sp.screenshot({ path: sheet, fullPage: true });
  await browser.close();
  if (missing.length) problems.push(`not rendered: ${missing.join(", ")} (uploads only the film holds; read them by id into a folder and pass --assets)`);
  console.log(`stills: ${outDir} (${shots.length}), contact sheet: ${sheet}`);
  if (score) console.log(`score: ${score.events} events, ${score.first}–${score.last} s`);
  if (!problems.length) { console.log("OK: the film loads, plays to its length and renders the same frame at the same time"); return 0; }
  console.log(`CHECK: ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ${p}`);
  return 1;
}

module.exports = { parse, validate, attrs, screenText, techniquesFor, T };
if (require.main !== module) return;

const [cmd, ...args] = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (cmd === "techniques") {
  const B = opt("--brand") ? require("./brand.js")(null, opt("--brand")) : null;
  for (const k of techniquesFor(B)) { const t = T.techniques[k]; console.log(`${k}: ${t.name} · layouts ${Object.keys(t.layouts).join(", ")} · ${t.length[0]}–${t.length[1]} s · ${t.aspect} by default`); }
} else if (cmd === "link" && pos[1]) {
  // The film this output was made into, kept beside its brief so later rounds revise the same film.
  const f = path.join(path.resolve(pos[0]), "film.json"), j = JSON.parse(fs.readFileSync(f, "utf8"));
  if (j.url && j.url !== pos[1]) console.log(`[motion] was ${j.url}`);
  j.url = pos[1]; fs.writeFileSync(f, JSON.stringify(j, null, 1) + "\n"); console.log(`film: ${j.url}`);
} else if (cmd === "brief" && pos[0] && opt("--out")) brief(path.resolve(pos[0]), path.resolve(opt("--out")));
else if (cmd === "check" && pos[1]) process.exit(check(path.resolve(pos[0]), path.resolve(pos[1])));
else if (cmd === "render" && pos[2]) render(path.resolve(pos[0]), path.resolve(pos[1]), path.resolve(pos[2]), opt("--out") && path.resolve(opt("--out")), opt("--assets") && path.resolve(opt("--assets"))).then(c => process.exit(c), e => { console.error(`[motion] ${e.message}`); process.exit(1); });
else { console.error("usage: motion.js techniques [--brand id] | brief formats/motion.md --out DIR | link DIR URL | check DIR STORE | render DIR STORE PLAYER [--out DIR] [--assets DIR]"); process.exit(2); }
