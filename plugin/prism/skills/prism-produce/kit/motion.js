#!/usr/bin/env node
// Motion: a motion format file -> the brief Claude Motion makes the film from, then checks of the film it made.
// Usage: motion.js techniques [--brand <id>]
//        motion.js gaps formats/motion.md                       (a walkthrough's questions for the person; exit 1 while one is needed)
//        motion.js brief formats/motion.md --out <dir>        (writes brief.md, film.json and records/; prints the uploads)
//        motion.js link <dir> <film url>                         (records the film this output was made into)
//        motion.js check <dir> <store dir>                    (the film's records, as ArtifactData saved them, against film.json)
//        motion.js render <dir> <store dir> <player dir> [--out <stills dir>] [--assets <dir>]   (stills, seams and grounds from the player's headless entry)
const fs = require("fs"), path = require("path");

const KIT = __dirname;
const T = JSON.parse(fs.readFileSync(path.join(KIT, "motion-techniques.json"), "utf8"));
const ROLES_BY_CLASS = ["eyebrow", "sub", "label", "note", "stat", "unit", "cite", "cta", "body"];
const LIST_STYLES = Object.keys(T.lists);
const BLOCK_ATTRS = ["at", "from", "stagger", "sfx", "n", "frame", "name", "field", "zoom"];
const SCENE_ATTRS = ["dur", "name", "bg", "backdrop", "in", "motif", "hold", "screen"];
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff", ".woff2": "font/woff2" };
const keys = o => Object.keys(o).filter(k => !k.startsWith("_"));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const r2 = n => Math.round(n * 100) / 100;
// What happens in a walkthrough's UI: one action per block, in order.
const ACTIONS = Object.keys(T.classes).filter(c => (T.classes[c] || {}).kind === "action");
const W = T.walkthrough;

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
// A list item, with the brand icon it may lead with: `- []{.icon .ph-calendar} Court dates flagged`.
function item(s) {
  const m = /^\[\]\{([^}]*)\}\s*(.*)$/.exec(s);
  const a = m ? attrs(m[1]) : null, icon = a && a.classes.includes("icon") ? (a.classes.find(c => /^ph-/.test(c)) || "").slice(3) || null : null;
  return { ...words(m && icon ? m[2] : s), icon };
}

// Scenes and their blocks, with the line each started on (for error messages).
function parse(text) {
  const { fm, body } = frontMatter(text);
  const lines = body.split("\n"), offset = text.split("\n").length - lines.length;
  const scenes = [], errors = [];
  let scene = null, div = null, fence = null, quote = null, list = null;
  const at = i => i + 1 + offset;
  const push = b => { if (div) div.inner.push(b); else scene.blocks.push(b); };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (fence) { if (/^```\s*$/.test(l)) { push(fence); fence = null; } else fence.text += l + "\n"; continue; }
    let m;
    if (!/^\s*[-*]\s+/.test(l) && !(div && div.kind === "list")) list = null;
    if ((m = /^:{4,}\s*\{([^}]*)\}\s*$/.exec(l))) {
      if (scene) errors.push(`line ${at(i)}: a scene opens inside scene "${scene.id}"; close it with :::: first`);
      const a = attrs(m[1]);
      if (!a.classes.includes("scene")) { errors.push(`line ${at(i)}: :::: blocks are scenes: {.scene .<layout> #id}`); continue; }
      const rest = a.classes.filter(c => c !== "scene");
      scene = { id: a.id, layout: rest[0] || null, extra: rest.slice(1), dur: a.attrs.dur !== undefined ? Number(a.attrs.dur) : null,
        name: a.attrs.name || null, attrs: a.attrs, blocks: [], notes: [], line: at(i) };
      continue;
    }
    if (/^:{4,}\s*$/.test(l)) { if (!scene) errors.push(`line ${at(i)}: :::: closes no scene`); else { scenes.push(scene); scene = null; } continue; }
    if (!scene) { if (l.trim()) errors.push(`line ${at(i)}: text outside a scene: every block goes inside :::: {.scene ...}`); continue; }
    if ((m = /^:{3}\s*(?:\{([^}]*)\}|([\w-]+))\s*$/.exec(l))) {
      const a = m[1] !== undefined ? attrs(m[1]) : { classes: [m[2]], id: null, attrs: {} };
      const kind = a.classes.includes("notes") ? "notes" : a.classes.includes("draw") ? "draw"
        : a.classes.some(c => c === "list" || LIST_STYLES.includes(c)) ? "list" : "div";
      div = { kind, a, inner: [], text: "", line: at(i) };
      if (kind === "list") { list = { role: "list", style: a.classes.find(c => LIST_STYLES.includes(c)) || "plain", items: [], a: { ...a, classes: a.classes.filter(c => c !== "list" && !LIST_STYLES.includes(c)) }, line: at(i) }; }
      continue;
    }
    if (/^:{3}\s*$/.test(l)) {
      if (!div) { errors.push(`line ${at(i)}: ::: closes nothing`); continue; }
      if (div.kind === "notes") scene.notes.push(div.text.trim());
      else if (div.kind === "draw") scene.blocks.push({ role: "draw", say: div.text.trim(), a: div.a, line: div.line });
      else if (div.kind === "list") { if (!list.items.length) errors.push(`line ${div.line}: a list block holds - items`); scene.blocks.push(list); list = null; }
      else if (div.inner.some(b => b.role === "chart")) scene.blocks.push({ ...div.inner.find(b => b.role === "chart"), a: div.a });
      else errors.push(`line ${div.line}: unknown block ::: ${div.a.classes.join(" ")} (allowed: notes, draw, a list (${LIST_STYLES.join(", ")}), chart)`);
      div = null; continue;
    }
    if (div && (div.kind === "notes" || div.kind === "draw")) { div.text += l + "\n"; continue; }
    if ((m = /^```chart\s*$/.exec(l))) { fence = { role: "chart", text: "", a: attrs(""), line: at(i) }; continue; }
    if (!l.trim()) { quote = null; continue; }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(l))) {
      if (!list) { list = { role: "list", style: "plain", items: [], a: attrs(""), line: at(i) }; push(list); }
      list.items.push(item(m[1])); continue;
    }
    if (div && div.kind === "list") { errors.push(`line ${at(i)}: a list block holds only - items`); continue; }
    if ((m = /^(#{1,2})\s+(.*?)\s*(?:\{([^}]*)\})?\s*$/.exec(l))) { push({ role: m[1] === "#" ? "h1" : "h2", ...words(m[2]), a: attrs(m[3]), line: at(i) }); continue; }
    if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*(?:\{([^}]*)\})?\s*$/.exec(l))) {
      const logo = /^(brand:logo|prism:logo(-on-dark)?)$/.test(m[2]), a = attrs(m[3]);
      // A walkthrough's screenshot is a layout guide: the UI is rebuilt from it, never shown as a picture.
      if (!logo && a.classes.includes("screen")) { push({ role: "screen", text: m[1], src: m[2], a: { ...a, classes: a.classes.filter(c => c !== "screen") }, line: at(i) }); continue; }
      push({ role: logo ? "logo" : "image", text: m[1], src: m[2], a, line: at(i) }); continue;
    }
    if ((m = /^>\s?(.*)$/.exec(l))) {
      const sm = /^\[(.*)\]\{([^}]*)\}\s*$/.exec(m[1]);
      if (sm) { push({ role: "cite", ...words(sm[1]), a: attrs(sm[2]), line: at(i) }); continue; }
      if (!m[1].trim()) continue;
      if (quote) quote.text += " " + words(m[1]).text; else { quote = { role: "quote", ...words(m[1]), a: attrs(""), line: at(i) }; push(quote); }
      continue;
    }
    if ((m = /^\[(.*)\]\{([^}]*)\}\s*$/.exec(l))) {
      const a = attrs(m[2]);
      if (a.classes.includes("icon")) { push({ role: "icon", icon: (a.classes.find(c => /^ph-/.test(c)) || "").slice(3) || null, ...words(m[1]), a: { ...a, classes: a.classes.filter(c => c !== "icon" && !/^ph-/.test(c)) }, line: at(i) }); continue; }
      if (a.classes.includes("motif")) { push({ role: "motif", text: "", a: { ...a, classes: a.classes.filter(c => c !== "motif") }, line: at(i) }); continue; }
      if (a.classes.some(c => ACTIONS.includes(c))) { push({ role: "action", ...words(m[1]), a, line: at(i) }); continue; }
      const role = a.classes.find(c => ROLES_BY_CLASS.includes(c)) || "body";
      push({ role, ...words(m[1]), a, line: at(i) }); continue;
    }
    push({ role: "body", ...words(l), a: attrs(""), line: at(i) });
  }
  if (scene) errors.push(`scene "${scene.id}" (line ${scene.line}) is never closed with ::::`);
  if (div) errors.push(`::: block at line ${div.line} is never closed`);
  return { fm, scenes, errors };
}

// --- validation ------------------------------------------------------------------------------------------------------

function readProfile(B) { try { return JSON.parse(fs.readFileSync(path.join(B.res.dir, "profile.json"), "utf8")); } catch { return {}; } }
function techniquesFor(B) {
  const own = B ? ((readProfile(B).motion || {}).techniques || null) : null;
  return keys(T.techniques).filter(k => !own || own.includes(k));
}
// The brand's motifs (profile motion.motifs): its own drawn marks, with the words that say how to use them.
function motifsFor(B) {
  return ((B && readProfile(B).motion) || {}).motifs || [];
}

// The brand's rules for one kind of piece (profile motion.pieces.<piece>): what it never uses, its grounds, backdrops,
// transitions and the colors of its marks. A piece the brand has no rules for gets core's vocabulary as it is.
function pieceRules(B, piece) {
  const all = ((B && readProfile(B).motion) || {}).pieces || {}, r = (piece && all[piece]) || {};
  const tr = r.transitions || {};
  return { piece: piece || null, known: keys(all), found: !!(piece && all[piece]), name: r.name || null,
    deny: { backdrops: [], classes: [], roles: [], ...(r.deny || {}) }, emphasis: r.emphasis || {}, grounds: r.grounds || {},
    backdrops: { prefer: null, say: {}, ...(r.backdrops || {}) }, transitions: { add: tr.add || {}, after: tr.after || {} }, rules: r.rules || [] };
}
const NO_RULES = pieceRules(null, null);
const transitionOf = (R, name) => (R.transitions.add[name] || T.transitions[name]);

// The classes a block carries, by kind, and the ones that aren't vocabulary.
function classesOf(b) {
  const out = { size: [], enter: [], emphasis: [], hold: [], exit: [], action: [], unknown: [] };
  for (const c of b.a.classes) {
    if (ROLES_BY_CLASS.includes(c) || c === "draw" && b.role === "draw" || c === "chart") continue;
    const k = T.classes[c];
    if (!k || c.startsWith("_")) out.unknown.push(c); else out[k.kind].push(c);
  }
  return out;
}

function validate(doc, allowed, motifs = [], R = NO_RULES) {
  const { fm, scenes } = doc, errors = [...doc.errors], warnings = [];
  const tech = T.techniques[fm.technique];
  if (!fm.title) errors.push("front matter: title is missing (the film's name; never \"Video\")");
  if (!tech) { errors.push(`front matter: technique "${fm.technique || ""}" is not one of: ${allowed.join(", ")}`); return { errors, warnings }; }
  if (!allowed.includes(fm.technique)) errors.push(`technique ${fm.technique} is not one this brand uses (${allowed.join(", ")})`);
  const aspect = fm.aspect || tech.aspect;
  if (!T.aspects[aspect]) errors.push(`front matter: aspect "${aspect}" is not one of: ${keys(T.aspects).join(", ")}`);
  if (fm.energy && !T.energy[fm.energy]) errors.push(`front matter: energy is one of ${keys(T.energy).join(", ")}, not "${fm.energy}"`);
  if (fm.music && !T.music[fm.music]) errors.push(`front matter: music is one of ${keys(T.music).join(", ")}, not "${fm.music}"`);
  if (fm.read !== undefined && !(Number(fm.read) >= 5 && Number(fm.read) <= 60)) errors.push(`front matter: read is the characters a second a viewer reads (5 to 60; ${T.hold.read} by default), not "${fm.read}"`);
  if (fm.ground) errors.push("front matter: ground is set per scene now, with bg= on each scene");
  if (fm.data && !tech.ui) errors.push("front matter: data: is for walkthrough films (the data their screenshots show)");
  if (fm.data && tech.ui && (!W.data[fm.data] || fm.data.startsWith("_"))) errors.push(`front matter: data is ${keys(W.data).join(" or ")}, not "${fm.data}"`);
  if (fm.piece && !/^[a-z][a-z0-9-]{0,40}$/.test(fm.piece)) errors.push(`front matter: piece is a lower-case name like case-study, not "${fm.piece}"`);
  const pieceSay = R.name ? `this brand's ${R.name.toLowerCase()} films` : "this brand's films";
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
    if (!lay) { errors.push(`${where}: layout .${s.layout || "?"} is not a ${fm.technique} layout (${keys(tech.layouts).join(", ")})`); return; }
    if (s.extra.length) errors.push(`${where}: unknown scene class .${s.extra.join(" .")} (a transition is in=, not a class)`);
    const extraAttrs = Object.keys(s.attrs).filter(k => !SCENE_ATTRS.includes(k));
    if (extraAttrs.length) errors.push(`${where}: unknown scene attribute ${extraAttrs.join(", ")} (${SCENE_ATTRS.join(", ")})`);
    if (s.attrs.bg && (!T.grounds[s.attrs.bg] || s.attrs.bg.startsWith("_"))) errors.push(`${where}: bg=${s.attrs.bg} is not one of ${keys(T.grounds).join(", ")}`);
    if (s.attrs.backdrop && (!T.backdrops[s.attrs.backdrop] || s.attrs.backdrop.startsWith("_"))) errors.push(`${where}: backdrop=${s.attrs.backdrop} is not one of ${keys(T.backdrops).join(", ")}`);
    if (s.attrs.in && (!transitionOf(R, s.attrs.in) || s.attrs.in.startsWith("_"))) errors.push(`${where}: in=${s.attrs.in} is not one of ${[...keys(T.transitions), ...keys(R.transitions.add)].join(", ")}`);
    if (s.attrs.backdrop && R.deny.backdrops.includes(s.attrs.backdrop)) errors.push(`${where}: ${pieceSay} never use backdrop=${s.attrs.backdrop}`);
    if (n === 0 && s.attrs.in && s.attrs.in !== "cut") errors.push(`${where}: the first scene has nothing to arrive from (in=): frame 0 is the thumbnail`);
    const wantsMotif = s.attrs.backdrop === "motif" || s.blocks.some(b => b.role === "motif");
    if (wantsMotif && !motifs.length) errors.push(`${where}: this brand has no motif (motion.motifs in its profile)`);
    const mid = s.attrs.motif || s.blocks.map(b => b.role === "motif" && b.a.attrs.name).find(Boolean);
    if (mid && motifs.length && !motifs.some(x => x.id === mid)) errors.push(`${where}: motif ${mid} is not one of ${motifs.map(x => x.id).join(", ")}`);
    // A walkthrough: screens, screenshots and actions belong to the scenes that show the app.
    if (s.attrs.screen !== undefined && (!lay.ui || !T.screens[s.attrs.screen] || s.attrs.screen.startsWith("_"))) errors.push(lay.ui ? `${where}: screen=${s.attrs.screen} is not one of ${keys(T.screens).join(", ")}` : `${where}: screen= is for scenes that show the app (${keys(tech.layouts).filter(k => tech.layouts[k].ui).join(", ") || "walkthrough films"})`);
    if (lay.ui) {
      const guides = s.blocks.filter(b => b.role === "screen");
      if (guides.length > 1) errors.push(`${where}: one screenshot per scene; a scene that changes page is two scenes`);
      const h2 = s.blocks.filter(b => b.role === "h2"), sub = s.blocks.filter(b => b.role === "sub");
      if (s.layout === "step" && !h2.length) errors.push(`${where}: a step needs its title for the step card (## Title)`);
      if (h2.length > 1 || sub.length > 1) errors.push(`${where}: the step card is one ## title and one .sub sentence`);
      for (const b of s.blocks) if (!["h2", "sub", "action", "screen"].includes(b.role)) errors.push(`${where}, block at line ${b.line}: words on a ${s.layout} scene are the step card (## title, one .sub sentence) and what happens in the app ([label]{.click} and the other actions); a ${b.role} goes on the title or end card`);
      if (s.layout === "step" && !s.blocks.some(b => b.role === "action")) warnings.push(`#${s.id || n + 1}: a step shows its task happening: add what the viewer sees ([label]{.click}, [words]{.fill field="…"})`);
    } else for (const b of s.blocks) if (b.role === "screen" || b.role === "action") errors.push(`${where}, block at line ${b.line}: ${b.role === "screen" ? "a screenshot" : "an action"} belongs in a scene that shows the app${tech.ui ? ` (${keys(tech.layouts).filter(k => tech.layouts[k].ui).join(", ")})` : ": walkthrough films only"}`);
    if (s.attrs.hold !== undefined && !(Number(s.attrs.hold) >= 1 && Number(s.attrs.hold) <= 30)) errors.push(`${where}: hold= is the seconds the scene holds once everything has landed, 1 to 30`);
    if (s.dur === null) s.dur = lay.dur;
    if (!(s.dur >= 1)) errors.push(`${where}: dur must be a number of seconds, 1 or more`);
    if (lay.min && s.dur < lay.min) errors.push(`${where}: a ${s.layout} scene is held ${lay.min} s at least (dur=${s.dur})`);
    total += s.dur || 0;
    if (!s.blocks.length) errors.push(`${where}: has nothing on screen`);
    for (const b of s.blocks) {
      const bw = `${where}, block at line ${b.line}`, k = classesOf(b);
      if (k.unknown.length) errors.push(`${bw}: unknown class .${k.unknown.join(" .")}`);
      const off = b.a.classes.filter(c => T.classes[c] && !tech.classes.includes(c));
      if (off.length) errors.push(`${bw}: .${off.join(" .")} is not used in ${fm.technique}`);
      const denied = b.a.classes.filter(c => R.deny.classes.includes(c));
      if (denied.length) errors.push(`${bw}: ${pieceSay} never use .${denied.join(" .")}`);
      for (const kind of ["size", "enter", "emphasis", "hold", "exit", "action"]) if (k[kind].length > 1) errors.push(`${bw}: one ${kind} class per block, not .${k[kind].join(" .")}`);
      if (k.emphasis.length && !b.accent) errors.push(`${bw}: .${k.emphasis[0]} marks the accent word; star one word (*word*)`);
      if (k.enter.includes("count") && (b.a.attrs.from === undefined || isNaN(Number(b.a.attrs.from)))) errors.push(`${bw}: .count needs from=<number>`);
      if (b.a.attrs.at !== undefined && !(Number(b.a.attrs.at) >= 0 && Number(b.a.attrs.at) < (s.dur || Infinity))) errors.push(`${bw}: at=${b.a.attrs.at} is outside the scene's ${s.dur} s`);
      if (b.a.attrs.sfx && !T.sfx.includes(b.a.attrs.sfx)) errors.push(`${bw}: sfx=${b.a.attrs.sfx} is not one of ${T.sfx.join(", ")}`);
      if (b.a.attrs.frame && !T.frames[b.a.attrs.frame]) errors.push(`${bw}: frame=${b.a.attrs.frame} is not one of ${keys(T.frames).join(", ")}`);
      if (b.a.attrs.frame && b.role !== "image") errors.push(`${bw}: frame= is for pictures`);
      const extra = Object.keys(b.a.attrs).filter(x => !BLOCK_ATTRS.includes(x));
      if (extra.length) errors.push(`${bw}: unknown attribute ${extra.join(", ")}`);
      if (b.role === "draw" && !b.say) errors.push(`${bw}: a ::: draw block describes the object in words`);
      if (b.role === "icon" && !b.icon) errors.push(`${bw}: an icon block names its icon: []{.icon .ph-calendar}`);
      if (k.action.length && b.role !== "action") errors.push(`${bw}: .${k.action[0]} is an action: write it on its own line, [label]{.${k.action[0]}}`);
      const act = k.action[0];
      if (act && !b.text && act !== "back") errors.push(`${bw}: .${act} names what it acts on: [New referral]{.${act}}`);
      if (["fill", "choose"].includes(act) && !b.a.attrs.field) errors.push(`${bw}: .${act} names its field: [Jordan Lee]{.${act} field="Client name"}`);
      if (b.a.attrs.field && !["fill", "choose"].includes(act)) errors.push(`${bw}: field= is for .fill and .choose`);
      if (b.a.attrs.zoom !== undefined && (b.role !== "action" || act === "back")) errors.push(`${bw}: zoom= is for an action the camera pushes in on`);
      else if (b.a.attrs.zoom !== undefined && !(Number(b.a.attrs.zoom) >= W.zoom[0] && Number(b.a.attrs.zoom) <= W.zoom[1])) errors.push(`${bw}: zoom= is ${W.zoom[0]} to ${W.zoom[1]} (×), not ${b.a.attrs.zoom}`);
      if (act === "focus" && b.a.attrs.zoom === undefined) b.a.attrs.zoom = String(W.zoom[0] + 0.2);
    }
  });
  if (scenes.length && scenes[scenes.length - 1].layout !== "closing") errors.push("the last scene is the closing end card (.closing)");
  if (scenes.length && scenes[0].layout !== "title") warnings.push("the first scene is usually .title: frame 0 is the film's thumbnail");
  if (tech.ui) {
    const steps = scenes.filter(s => s.layout === "step").length;
    if (!steps) errors.push("a walkthrough has at least one .step scene");
    else if (steps < W.steps[0] || steps > W.steps[1]) warnings.push(`${steps} steps; a walkthrough is easiest to follow with ${W.steps[0]} to ${W.steps[1]} (split a longer one into two films)`);
    if (scenes[1] && scenes[1].layout !== "app") warnings.push("a walkthrough meets the app (.app) before its first step: the whole screen, built in, before the camera pushes in");
  }
  if (total > 300) errors.push(`the film runs ${total} s; Motion films are 300 s at most`);
  else if (total < tech.length[0] || total > tech.length[1]) warnings.push(`the film runs ${total} s; a ${fm.technique} film is usually ${tech.length[0]}–${tech.length[1]} s`);
  const said = s => s.blocks.some(b => /illustrative|fictional/i.test([b.text, ...(b.items || []).map(x => x.text)].join(" ")));
  if (/illustrative/i.test(fm.figures || "") && !scenes.some(said)) errors.push("figures: illustrative, but no line on screen says the piece is illustrative or fictional");
  else if (fm.data === "stand-in" && !scenes.some(said)) errors.push("data: stand-in, but no line on screen says the data is illustrative or fictional");
  return { errors, warnings, total, aspect };
}

// --- walkthrough: screens and gaps ------------------------------------------------------------------------------------

// The screen each scene that shows the app stands on: its screenshot (its own, or the last one before it), the layout
// it shows (screen=, else the screenshot's shape, else the scene before, else the stage's own), and how it sits on the stage.
function screensOf(doc, mdPath, aspect) {
  const tech = T.techniques[doc.fm.technique] || {}, A = T.aspects[aspect] || T.aspects[tech.aspect] || T.aspects.wide, stage = A.width / A.height;
  const shapeOf = (w, h) => w / h > 1.15 ? "desktop" : w / h > 0.62 ? "tablet" : "phone";
  const byStage = stage >= 1 ? "desktop" : "phone";
  let guide = null, screen = null;
  return doc.scenes.map(s => {
    const lay = (tech.layouts || {})[s.layout];
    if (!lay || !lay.ui) return null;
    const own = s.blocks.find(b => b.role === "screen"), prev = screen;
    if (own) {
      const file = path.resolve(path.dirname(mdPath), own.src), exists = fs.existsSync(file);
      guide = { name: own.text || path.basename(own.src, path.extname(own.src)), src: own.src, file, exists, ...(exists ? imageSize(file) : {}) };
    }
    const shape = guide && guide.w ? shapeOf(guide.w, guide.h) : null;
    screen = T.screens[s.attrs.screen] ? s.attrs.screen : (own && shape) || prev || shape || byStage;
    const S = T.screens[screen], q = Math.log(S.ratio / stage);
    return { guide, own: !!own, shape, screen, prev, fit: Math.abs(q) < 0.35 ? "full" : q > 0 ? "crop" : "device", device: S.device };
  });
}

// What a walkthrough still needs from the person, as questions to ask before the film is made. block: the film can't be
// made without the answer (no screenshot to rebuild a screen from, unknown data); the rest are flagged on delivery if unasked.
const ADDRESS = /\b(?:https?:\/\/\S+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|ai|app|dev|co|us|gov|edu)(?:\/[^\s"]*)?)/gi;
function gaps(doc, mdPath, aspect) {
  const tech = T.techniques[doc.fm.technique];
  if (!tech || !tech.ui) return [];
  const out = [], ask = (scene, q, block) => out.push({ scene, ask: q, block: !!block });
  const scr = screensOf(doc, mdPath, aspect);
  doc.scenes.forEach((s, n) => {
    const x = scr[n]; if (!x) return;
    const id = `#${s.id}`;
    if (!x.guide) ask(s.id, `${id}: there is no screenshot to rebuild the app from. Ask for one of the screen this ${s.layout === "app" ? "film opens on" : "step starts on"} (the whole window, PNG or JPG, ${T.screens[x.screen].width} px wide or more), then add it: ![Page name](images/<file>.png){.screen}`, true);
    else if (x.own && !x.guide.exists) ask(s.id, `${id}: the screenshot ${x.guide.src} isn't there: ask for it`, true);
    else if (x.guide.exists) {
      if (x.own && x.shape && x.shape !== x.screen) ask(s.id, `${id}: the screenshot ${x.guide.src} is ${x.shape}-shaped but the scene shows the ${x.screen} layout: is there a ${x.screen} screenshot?`, false);
      if (!x.own && x.prev && x.screen !== x.prev) ask(s.id, `${id} changes from the ${x.prev} to the ${x.screen} layout: ask for a screenshot of the ${x.screen} layout to rebuild it from`, true);
      const want = T.screens[x.shape || x.screen].width;
      if (x.own && x.guide.w && x.guide.w < want * 0.7) ask(s.id, `${id}: the screenshot ${x.guide.src} is only ${x.guide.w} px wide, too small to read its labels: ask for a larger one (${want} px wide or more)`, false);
    }
  });
  if (scr.some(x => x && x.guide) && !doc.fm.data) ask(null, "Is the data in the screenshots demo data, or real people's? data: demo rebuilds it as it is; data: stand-in replaces every name and detail with invented ones and labels the film illustrative", true);
  const close = doc.scenes[doc.scenes.length - 1];
  if (close && close.layout === "closing" && !close.blocks.some(b => b.role === "cta")) ask(close.id, `#${close.id}: the end card has no call to action. Ask what viewers should do next (and its address), then add [Start at …]{.cta}`, false);
  for (const a of String(doc.fm.assumed || "").split(/\s*;\s*/).filter(Boolean)) ask(null, `Assumed, not confirmed: ${a}. Confirm it, or flag it on delivery`, false);
  // An address on screen that content.md doesn't have was assumed.
  const content = [path.join(path.dirname(mdPath), "..", "content.md"), path.join(path.dirname(mdPath), "content.md")].find(f => fs.existsSync(f));
  if (content) {
    const c = fs.readFileSync(content, "utf8").toLowerCase();
    for (const s of doc.scenes) for (const l of sceneLines(s)) for (const u of l.match(ADDRESS) || []) if (!c.includes(u.toLowerCase())) ask(s.id, `#${s.id}: the address ${u} isn't in content.md: confirm it`, false);
  }
  return out;
}

// --- color -------------------------------------------------------------------------------------------------------------

const hex = h => { const s = String(h || "").replace("#", ""); const f = s.length === 3 ? s.split("").map(c => c + c).join("") : s.slice(0, 6); return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16)); };
const lum = h => { const c = hex(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const dist = (a, b) => { const x = hex(a), y = hex(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const minContrast = (c, stops) => Math.min(...stops.map(s => contrast(c, s)));

// A scene's colors on its ground: ink for words, main for numbers and shapes, two more for backdrops and marks.
function sceneColors(B, ground, R = NO_RULES) {
  const role = (n, theme) => B.has(n) && !R.deny.roles.includes(n) ? B.color(n, theme) : null;
  const stops = ground.stops;
  const pick = (cands, min, not = []) => cands.filter(Boolean).find(c => minContrast(c, stops) >= min && !not.some(x => dist(x, c) < 40)) || null;
  const inks = [role("prism-color-text-strong"), role("prism-color-text-strong", "dark"), role("prism-color-surface"), role("prism-color-dark-deep"), "#FFFFFF", "#111111"].filter(Boolean);
  // The brand's own text color first, as long as it reads; else whichever reads best.
  const ink = inks.find(c => minContrast(c, stops) >= 7) || inks.slice().sort((a, b) => minContrast(b, stops) - minContrast(a, stops))[0];
  const series = ["prism-color-chart-2", "prism-color-chart-3", "prism-color-chart-4", "prism-color-chart-5", "prism-color-accent-strong", "prism-color-eyebrow-on-dark", "prism-color-link-line"];
  const main = pick([role("prism-color-accent"), role("prism-color-accent", "dark"), role("prism-color-eyebrow-on-dark"), ...series.map(n => role(n)), role("prism-color-surface")], 3, stops) || ink;
  const second = pick([...series.map(n => role(n)), role("prism-color-accent", "dark"), role("prism-color-wash"), role("prism-color-surface")], 1.6, [...stops, main]) || main;
  const third = pick([...series.map(n => role(n)), role("prism-color-tint-line"), role("prism-color-wash"), role("prism-color-dark-surface")], 1.3, [...stops, main, second]) || second;
  // The piece's own choice for this ground wins, when the brand has that role.
  const own = (R.grounds[ground.name] || {}).colors || {};
  const out = { ink, main, second, third, dark: lum(stops[0]) < 0.25 };
  for (const [k, n] of Object.entries(own)) if (role(n)) out[k] = role(n);
  return out;
}
function groundOf(B, name, R = NO_RULES) {
  const own = R.grounds[name] || {};
  if (own.css && own.stops) return { name, stops: own.stops, gradient: true, css: own.css, say: own.say || null };
  const g = T.grounds[name];
  const val = n => B.has(n) ? B.color(n) : null;
  if (g.gradient) { const stops = g.gradient.map(val).filter(Boolean); if (stops.length >= 2) return { name, stops, gradient: true }; }
  const fill = val(g.fill || "prism-color-surface") || val("prism-color-surface");
  return { name, stops: [fill], gradient: false };
}
// The transition panel: a brand color unlike both grounds.
function panelFor(B, a, b, R = NO_RULES) {
  const cands = ["prism-color-accent", "prism-color-chart-2", "prism-color-chart-3", "prism-color-chart-4", "prism-color-dark-surface", "prism-color-wash"]
    .filter(n => B.has(n) && !R.deny.roles.includes(n)).map(n => B.color(n));
  const all = [...a.stops, ...b.stops];
  return cands.slice().sort((x, y) => Math.min(...all.map(s => dist(y, s))) - Math.min(...all.map(s => dist(x, s))))[0];
}

// --- the brief ---------------------------------------------------------------------------------------------------------

// The brand's face for a type role: the font file nearest its weight, uploaded as an asset named by the file.
function typeFace(B, role) {
  const r = B.res.roles[`prism-type-${role}`] || B.res.roles["prism-type-body"];
  const v = r.value, fam = B.res.roles[`prism-font-${v.family}`];
  const files = (fam && fam.value.files) || [];
  const w = Number(v.fontWeight) || 400;
  const f = files.slice().sort((a, b) => Math.abs(Number(a.weight) - w) - Math.abs(Number(b.weight) - w))[0];
  return { role, family: v.family, weight: w, letterSpacing: v.letterSpacing || "0", file: f ? f.path : null, face: f ? path.basename(f.path).replace(/\.[^.]+$/, "") : null };
}
// When a block's entrance (and its emphasis) has finished, from its own move, length and pieces.
function entranceEnd(bp, E) {
  const b = bp.b, st = Number(b.a.attrs.stagger) || E.stagger, txt = String(b.text || "");
  const nw = txt.split(/\s+/).filter(Boolean).length || 1;
  const pieces = b.role === "list" ? b.items.length : Number(b.a.attrs.n) || 5;
  const each = b.role === "list" ? (Number(b.a.attrs.stagger) || E.stagger * 3.5) : st;
  const d = { words: nw * st + 0.5, mask: nw * st + 0.6, split: txt.length * 0.03 + 0.5, type: txt.length / 24 + 0.3, count: 1.7, build: pieces * each + 0.6 }[bp.enter] || 0.6;
  return bp.at + d + (bp.emphasis ? 0.5 : 0);
}
const fill = (tpl, v) => tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] !== undefined ? v[k] : `{${k}}`);
// Grounds a default steps to when it would repeat the scene before.
const ROTATE = ["main", "dark", "tint", "glow", "light", "mist"];
const EDGES = [["left", "right"], ["bottom", "top"], ["right", "left"], ["top", "bottom"]];

// The hold rule: at least min seconds, else the scene's characters at the reading rate (characters a second), at most max.
// `read:` in the front matter sets the rate for one film.
function holdRule(fm = {}) {
  const h = typeof T.hold === "number" ? { min: T.hold } : T.hold;
  return { min: h.min, read: fm.read !== undefined ? Number(fm.read) : h.read, max: h.max };
}
const holdFor = (chars, h) => Math.min(Math.max(h.min, h.read ? Math.ceil(chars / h.read * 10) / 10 : h.min), Math.max(h.min, h.max || Infinity));
const sayHold = h => h.read ? `at least ${h.min} s, a second for every ${h.read} characters on screen, ${h.max} s at most` : `${h.min} s`;

// Every line a scene puts on screen, in order: text blocks and list items, quoted words in draw blocks, chart labels.
function sceneLines(s) {
  const lines = [...(s.extraLines || [])];
  for (const b of s.blocks) {
    if (["logo", "image", "draw", "chart", "motif", "screen"].includes(b.role)) continue;
    if (b.role === "list") lines.push(...b.items.map(x => x.text)); else if (b.text) lines.push(b.text);
  }
  for (const b of s.blocks) if (b.role === "draw") for (const q of b.say.matchAll(/"([^"]+)"/g)) lines.push(q[1]);
  for (const b of s.blocks) if (b.role === "chart") lines.push(...chartLabels(b.text));
  return lines;
}

// Every decision the brief states, made once: grounds, colors, transitions, block timings and moves.
function plan(B, doc, v, R = NO_RULES) {
  const { fm, scenes } = doc, tech = T.techniques[fm.technique], energy = T.energy[fm.energy || tech.energy];
  const motifs = motifsFor(B);
  const warnings = [];
  // A walkthrough: the screen each app scene stands on, and the steps' numbers.
  const ui = !!tech.ui, scr = ui ? screensOf(doc, doc.path || ".", v.aspect) : [];
  const steps = scenes.filter(s => s.layout === "step").length;
  let stepNo = 0;
  let prevBg = null, prevBd = null, tc = 0;
  const bgs = [], out_prev = n => bgs[n - 1];
  const out = scenes.map((s, n) => {
    const lay = tech.layouts[s.layout];
    // A default ground or backdrop never repeats the scene before it; one set by hand stays.
    // Scenes that show the app keep one ground and no backdrop: the UI covers them, and the chrome matches across cuts.
    let bg = s.attrs.bg || lay.bg;
    if (!s.attrs.bg && bg === prevBg && !lay.ui) bg = ROTATE.find(x => x !== prevBg && x !== bg);
    let backdrop = s.attrs.backdrop || lay.backdrop;
    // A default backdrop the piece never uses, or one that repeats the scene before, steps to the piece's preferred ones.
    if (!s.attrs.backdrop && !lay.ui && (backdrop === prevBd || R.deny.backdrops.includes(backdrop) || (backdrop === "motif" && !motifs.length))) {
      const bds = (R.backdrops.prefer || keys(T.backdrops)).filter(x => x !== "none" && !R.deny.backdrops.includes(x) && (x !== "motif" || motifs.length));
      backdrop = bds.find(x => x !== prevBd) || bds[0];
    }
    if (s.attrs.bg && bg === prevBg && !lay.ui) warnings.push(`#${s.id} has the same ground as the scene before it (${bg})`);
    bgs.push(bg); prevBg = bg; prevBd = backdrop;
    const ground = groundOf(B, bg, R), colors = sceneColors(B, ground, R);
    // The piece may fix how a scene leaves a given ground (a brand transition out of its main color).
    const forced = n > 0 ? R.transitions.after[out_prev(n)] : null;
    if (forced && s.attrs.in && s.attrs.in !== forced) warnings.push(`!#${s.id}: ${R.name ? `this brand's ${R.name.toLowerCase()} films` : "this brand"} leave a ${out_prev(n)} scene with ${forced}, not ${s.attrs.in}`);
    // A walkthrough picks each hand-off from what is on either side: the same screen keeps its chrome, a new screen
    // reframes, the title zooms through into the app, and the UI fades out before the end card.
    const x = scr[n] || null, px = n ? scr[n - 1] || null : null;
    const auto = !ui ? tech.transitions[tc++ % tech.transitions.length] : x && px ? (x.screen === px.screen ? "chrome" : "reframe") : x ? "zoom-through" : "fade";
    const into = n === 0 ? null : (forced || s.attrs.in || auto);
    if (into === "chrome" && !(x && px && x.screen === px.screen)) warnings.push(`!#${s.id}: in=chrome keeps the chrome of the scene before, so both show the app on the same screen${x && px ? ` (${px.screen} → ${x.screen}: use reframe)` : ""}`);
    if (into === "reframe" && !(x && px)) warnings.push(`!#${s.id}: in=reframe changes the app's screen, so both scenes show the app`);
    else if (into === "reframe" && x.screen === px.screen) warnings.push(`#${s.id}: in=reframe, but both scenes show the ${x.screen} layout (chrome keeps it)`);
    if (x && px && x.screen !== px.screen && ["chrome", "cut"].includes(into)) warnings.push(`!#${s.id}: the app changes from ${px.screen} to ${x.screen}: arrive with reframe`);
    return { s, lay, bg, backdrop, ground, colors, into, ui: !!lay.ui, screen: x, prevScreen: px, step: s.layout === "step" ? ++stepNo : null, steps, motif: s.attrs.motif || (motifs.find(m => m.on === (colors.dark ? "dark" : "light") || m.on === "any") || motifs[0] || {}).id || null };
  });
  if (!ui) for (let i = 1; i < out.length; i++) if (out[i].into !== "cut" && out[i].into === out[i - 1].into) warnings.push(`#${out[i].s.id} arrives the same way as the scene before it (${out[i].into})`);
  // Each scene: its blocks' times, then its length. After the last entrance lands the scene holds, still moving, before
  // anything leaves: long enough to read its words (holdFor), or hold= on the scene; dur= in the format file is a minimum.
  const rule = holdRule(fm);
  out.forEach((p, n) => {
    const { s } = p, next = out[n + 1];
    p.half = energy.half;
    const own = p.into ? transitionOf(R, p.into) || {} : {};
    const [from, to] = own.from && own.to ? [own.from, own.to] : EDGES[n % EDGES.length];
    p.inT = p.into && p.into !== "cut" ? { name: p.into, panel: panelFor(B, out[n - 1].ground, p.ground, R), from, to, half: energy.half, in: r2(energy.half * 0.7),
      screen_from: p.prevScreen ? p.prevScreen.screen : "", screen_to: p.screen ? p.screen.screen : "",
      next: p.ground.gradient ? `its gradient, starting ${p.ground.stops[0]}` : p.ground.stops[0] } : null;
    // When the content may arrive.
    const enterAt = n === 0 ? -1.4 : p.inT ? (["wipe", "iris", "blinds", "zoom-through", "reframe"].includes(p.inT.name) || own.motif ? r2(energy.half * 0.7) : 0.15) : 0.1;
    const nextHalf = next && next.into !== "cut" ? energy.half : 0;
    const last = n === out.length - 1;
    let k = 0;
    // A scene that shows the app: the step card opens first and collapses; then each action follows the one before
    // once it has landed and held (the beat), so only one thing moves at a time.
    const base = p.ui ? r2(Math.max(0, enterAt) + (s.layout === "app" ? 2.4 : 0)) : 0;
    let cursor = null;
    p.buildAt = r2(Math.max(0, enterAt));
    if (p.ui) {
      const card = s.blocks.filter(b => b.role === "h2" || b.role === "sub");
      if (card.length) {
        const cardLanded = r2(base + W.card.open + (card.length > 1 ? 0.3 : 0));
        p.card = { at: base, landed: cardLanded, collapse: r2(cardLanded + W.card.read), chip: r2(cardLanded + W.card.read + W.card.collapse) };
        cursor = r2(p.card.chip + 0.3);
      } else cursor = r2(base + (s.layout === "app" ? W.camera + W.beat : 0.4));
    }
    p.blocks = s.blocks.filter(b => b.role !== "screen").map(b => {
      const cl = classesOf(b), def = (tech.defaults[b.role] || {});
      const enter = cl.enter[0] || def.enter || "fade";
      const hold = cl.hold[0] || def.hold || null;
      let emphasis = cl.emphasis[0] || (b.accent ? def.emphasis : null) || null;
      if (emphasis && !cl.emphasis[0] && R.deny.classes.includes(emphasis)) emphasis = R.deny.classes.includes("highlight") ? null : "highlight";
      let exit = cl.exit[0] || def.exit || "out";
      if (last) exit = null;
      const size = cl.size[0] || (p.ui && W.card.sizes[b.role]) || (T.roles[b.role] || {}).size || null;
      if (p.ui && b.role === "action") {
        const action = cl.action[0], zoom = b.a.attrs.zoom !== undefined ? Number(b.a.attrs.zoom) : null;
        const at = b.a.attrs.at !== undefined ? Number(b.a.attrs.at) : cursor;
        const took = T.classes[action].secs + (action === "fill" ? String(b.text).length / W.cps : 0) + (zoom && action !== "focus" ? W.camera : 0);
        const bp = { b, action, zoom, enter: null, hold: null, emphasis: null, exit: last ? null : "stay", at: r2(at), size: null, landed: r2(at + took) };
        cursor = r2(bp.landed + W.beat);
        return bp;
      }
      const at = b.a.attrs.at !== undefined ? Number(b.a.attrs.at) : p.ui ? r2(base + (b.role === "sub" ? 0.3 : 0)) : r2(enterAt + (k++) * (energy.stagger * 3.5));
      const bp = { b, enter, hold, emphasis, exit, at, size };
      bp.landed = r2(entranceEnd(bp, energy));
      return bp;
    });
    p.landed = r2(Math.max(0, ...p.blocks.map(x => x.landed)));
    const leaving = p.blocks.filter(x => x.exit && x.exit !== "stay").sort((a, b) => b.at - a.at);
    const exitSpan = leaving.length ? 0.35 + (leaving.length - 1) * 0.07 + 0.05 : 0;
    p.chars = sceneLines(s).join(" ").replace(/[*_]/g, "").length;
    // In a scene that shows the app the reading happens along the way (the card's read, a beat after every action), so
    // it holds the shortest hold after its last action; then the camera pulls back out to the whole screen.
    const hold = p.hold = s.attrs.hold !== undefined ? Number(s.attrs.hold) : p.ui ? rule.min : holdFor(p.chars, rule);
    // The camera ends the scene back out at the whole screen: a pull-back unless the last camera move already was one.
    const zoomed = p.blocks.filter(x => x.action && (x.zoom || x.action === "back")).map(x => x.action !== "back").pop();
    const back = p.ui && !last && zoomed ? W.camera : 0;
    const need = Math.ceil((p.landed + hold + back + exitSpan + nextHalf) * 10) / 10;
    if (need > s.dur) { p.grew = { from: s.dur, to: need }; s.dur = need; }
    p.holdFrom = p.landed; p.holdTo = r2(p.landed + hold);
    if (back) p.backBy = r2(p.holdTo + back);
    p.goneBy = last ? null : r2(s.dur - nextHalf - 0.05);
    // Exits run in reverse order of arrival and finish before the next scene's transition starts.
    leaving.forEach((x, i) => { x.leaveAt = r2(p.goneBy - 0.35 - (leaving.length - 1 - i) * 0.07); });
  });
  let t0 = 0;
  out.forEach(p => { p.start = r2(t0); t0 += p.s.dur; });
  const total = r2(t0);
  // The cut out of each scene is the next scene's transition, seen from this side.
  out.forEach((p, n) => { p.outT = out[n + 1] ? out[n + 1].inT : null; p.outInto = out[n + 1] ? out[n + 1].into : null; p.nextBg = out[n + 1] ? out[n + 1].ground : null; });
  return { scenes: out, energy, warnings, motifs, R, total, hold: rule };
}

function brief(mdPath, outDir) {
  const B = require("./brand.js")(mdPath);
  const text = fs.readFileSync(mdPath, "utf8"), doc = parse(text), allowed = techniquesFor(B), motifs = motifsFor(B);
  const R = pieceRules(B, doc.fm.piece);
  const v = validate(doc, allowed, motifs, R);
  const fail = errs => { for (const e of errs) console.error(`[motion] ${e}`); console.error(`[motion] ${errs.length} problem(s): fix ${mdPath} and run again`); process.exit(1); };
  if (v.errors.length) fail(v.errors);
  // A walkthrough: what only the person can answer stops the brief; the rest is flagged on delivery.
  doc.path = mdPath;
  const G = gaps(doc, mdPath, v.aspect), blocking = G.filter(g => g.block);
  if (blocking.length) fail(blocking.map(g => `ask the person: ${g.ask}`));
  for (const g of G) console.warn(`[motion] gap: ${g.ask}`);
  if (T.techniques[doc.fm.technique].ui) {
    // Prism's own lines: each step's eyebrow, and the end card's recap of the steps by their titles.
    const stepScenes = doc.scenes.filter(s => s.layout === "step");
    stepScenes.forEach((s, i) => { s.extraLines = [`Step ${i + 1} of ${stepScenes.length}`]; });
    const close = doc.scenes[doc.scenes.length - 1];
    if (close && close.layout === "closing" && stepScenes.length && !close.blocks.some(b => b.role === "list")) {
      const recap = { role: "list", style: "steps", recap: true, items: stepScenes.map(s => ({ text: s.blocks.find(b => b.role === "h2").text, accent: null, icon: null })), a: attrs(""), line: close.line };
      const after = close.blocks.reduce((k, b, i) => ["h1", "h2", "sub", "body"].includes(b.role) ? i + 1 : k, 0);
      close.blocks.splice(after, 0, recap);
    }
  }
  // Icons come from the brand's own set.
  const iconSet = JSON.parse(fs.readFileSync(B.icons.paths, "utf8"));
  const wantIcons = [...new Set(doc.scenes.flatMap(s => s.blocks.flatMap(b => b.role === "icon" ? [b.icon] : b.role === "list" ? b.items.map(x => x.icon).filter(Boolean) : [])))];
  const noIcon = wantIcons.filter(n => !iconSet[n]);
  if (noIcon.length) fail([`icon ${noIcon.join(", ")} is not in the brand's icon set (${B.icons.weight})`]);
  const P = plan(B, doc, v, R);
  // A plan warning marked ! is a piece rule the format file breaks.
  const broken = P.warnings.filter(w => w.startsWith("!")).map(w => w.slice(1));
  if (broken.length) fail(broken);
  if (R.known.length && !R.found) v.warnings.push(`this brand has motion rules for ${R.known.join(", ")}; name the piece (piece: ${R.known[0]}) to use them`);
  for (const p of P.scenes) if (p.grew) P.warnings.push(`#${p.s.id} runs ${p.grew.to} s, not ${p.grew.from}: its entrances land at ${p.landed} s, then it holds ${p.hold} s before leaving`);
  for (const p of P.scenes) if (p.step && p.s.dur > 20) P.warnings.push(`#${p.s.id} runs ${p.s.dur} s: a step over 20 s is easier to follow as two steps`);
  if (P.total > 300) fail([`the film runs ${P.total} s with its holds; Motion films are 300 s at most`]);
  const len = T.techniques[doc.fm.technique].length;
  if (P.total < len[0] || P.total > len[1]) P.warnings.push(`the film runs ${P.total} s; a ${doc.fm.technique} film is usually ${len[0]}–${len[1]} s`);
  for (const w of [...v.warnings.filter(w => !/^the film runs/.test(w)), ...P.warnings]) console.warn(`[motion] ${w}`);
  const { fm, scenes } = doc, tech = T.techniques[fm.technique], A = T.aspects[v.aspect];

  // Faces and uploads: only what the film uses.
  const assets = new Map(), faces = {};
  const needType = new Set(["eyebrow"]);
  for (const p of P.scenes) for (const b of p.s.blocks) {
    const r = T.roles[b.role] || {};
    if (r.type) needType.add(p.colors.dark && r.dark_type ? r.dark_type : r.type);
  }
  for (const t of needType) { const f = typeFace(B, t); faces[t] = f; if (f.file) assets.set(path.basename(f.file), { name: path.basename(f.file), path: f.file, mime: MIME[path.extname(f.file).toLowerCase()] }); }
  const logos = {};
  for (const p of P.scenes) for (const b of p.s.blocks) if (b.role === "logo") {
    const role = p.colors.dark && B.has("prism-asset-logo-on-dark") ? "prism-asset-logo-on-dark" : "prism-asset-logo";
    const file = B.asset(role), ext = path.extname(file).toLowerCase(), name = (role.endsWith("on-dark") ? "logo-on-dark" : "logo") + ext;
    b.asset = name;
    if (!logos[name]) logos[name] = ext === ".svg" ? { name, path: file, mime: "image/svg+xml", svg: true } : { name, path: file, mime: MIME[ext], ...imageSize(file) };
    if (ext !== ".svg") assets.set(name, logos[name]);
  }
  for (const p of P.scenes) for (const b of p.s.blocks) if (b.role === "image") {
    const file = path.resolve(path.dirname(mdPath), b.src);
    if (!fs.existsSync(file)) fail([`scene #${p.s.id}: missing image ${b.src}`]);
    const a = { name: path.basename(file), path: file, mime: MIME[path.extname(file).toLowerCase()], ...imageSize(file) };
    assets.set(a.name, a); b.asset = a.name;
  }
  // Records Prism writes for the film itself (set with ArtifactData file_path): the brand's icons, motifs and SVG logos.
  fs.mkdirSync(outDir, { recursive: true });
  const recDir = path.join(outDir, "records");
  fs.rmSync(recDir, { recursive: true, force: true });
  const records = [];
  const record = (collection, doc_id, data) => {
    const f = path.join(recDir, collection, doc_id + ".json");
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(data));
    records.push({ collection, doc_id, file_path: f });
  };
  if (wantIcons.length) record("modules", "icons.json", { kind: "json", text: JSON.stringify(Object.fromEntries(wantIcons.map(n => [n, iconSet[n]]))) });
  const usedMotifs = new Set();
  for (const p of P.scenes) {
    if (p.backdrop === "motif") usedMotifs.add(p.motif);
    const tm = p.inT && (R.transitions.add[p.inT.name] || {}).motif;
    if (tm) { if (!P.motifs.some(m => m.id === tm)) fail([`transition ${p.inT.name} needs the brand motif ${tm}`]); usedMotifs.add(tm); p.inT.motif = tm; }
    for (const b of p.s.blocks) if (b.role === "motif") { b.motif = b.a.attrs.name || p.motif; usedMotifs.add(b.motif); }
  }
  // An SVG motif goes in as markup (a module), so its stroke can be thickened and recolored without changing its shape.
  const motifAssets = {};
  for (const id of usedMotifs) {
    const m = P.motifs.find(x => x.id === id), file = path.join(B.res.dir, m.file), ext = path.extname(file).toLowerCase();
    if (ext === ".svg") { const name = `motif-${id}.html`; record("modules", name, { kind: "html", text: fs.readFileSync(file, "utf8").trim() }); motifAssets[id] = { name, say: m.say, svg: true }; }
    else { const name = `motif-${id}${ext}`; record("assets", name, { ref: `data:${MIME[ext]};base64,${fs.readFileSync(file).toString("base64")}`, mime: MIME[ext] }); motifAssets[id] = { name, say: m.say }; }
  }
  // A picture in a phone, tablet or laptop frame: core's device drawing (devices.js) goes in as markup, with its screen's place.
  const DEV = require("./devices.js");
  for (const d of new Set(P.scenes.flatMap(p => p.s.blocks.filter(b => b.role === "image" && DEV.DEVICES.includes(b.a.attrs.frame)).map(b => b.a.attrs.frame)))) {
    const g = DEV.geometry(d), sc = g.screen, pc = (v, of) => +(v / of * 100).toFixed(2);
    const name = `device-${d}.html`;
    record("modules", name, { kind: "html", text: DEV.svg(g) });
    motifAssets["device:" + d] = { name, screen: `left ${pc(sc.x, g.w)}%, top ${pc(sc.y, g.h)}%, width ${pc(sc.w, g.w)}%, height ${pc(sc.h, g.h)}% of the frame, corners ${pc(sc.r, sc.w)}% of the screen's width`, ratio: `${g.w}:${g.h}` };
  }
  for (const l of Object.values(logos)) if (l.svg) record("assets", l.name, { ref: `data:image/svg+xml;base64,${fs.readFileSync(l.path).toString("base64")}`, mime: "image/svg+xml" });

  const film = { v: 2, title: fm.title, technique: fm.technique, piece: fm.piece || null, brand: B.id,
    deny: { colors: R.deny.roles.filter(n => B.has(n)).flatMap(n => Object.values(B.res.roles[n].value || {})).filter(x => typeof x === "string" && /^#/.test(x)) }, aspect: v.aspect, width: A.width, height: A.height, fps: 60,
    background: P.scenes[0].ground.stops[0], energy: fm.energy || tech.energy, music: fm.music || "calm", length: P.total, hold: P.hold,
    assets: [...assets.values()], records: records.map(r => ({ collection: r.collection, doc_id: r.doc_id })), faces: Object.fromEntries(Object.entries(faces).map(([k, f]) => [k, { face: f.face, weight: f.weight }])),
    scenes: P.scenes.map(p => {
      const title = p.step ? (p.s.blocks.find(b => b.role === "h2") || {}).text : null;
      const s = p.s, name = (s.name || title || s.id.replace(/-/g, " ").replace(/^./, c => c.toUpperCase())).slice(0, 48);
      const lines = sceneLines(s);
      const counts = [], countLines = [];
      for (const bp of p.blocks) if (bp.enter === "count") {
        const to = parseFloat(String(bp.b.text).replace(/,/g, "")), from = Number(bp.b.a.attrs.from);
        countLines.push(bp.b.text);
        if (Number.isInteger(to) && Number.isInteger(from)) for (let k = Math.min(from, to); k <= Math.max(from, to); k++) counts.push(String(k));
      }
      const head = (s.blocks.find(b => b.role === "h1" || b.role === "h2") || {}).text || lines.slice(0, 3).join(" ");
      const desc = (s.notes[0] || `${cap(s.layout)}: ${head}`).split(/(?<=\.)\s/)[0].slice(0, 160);
      const app = p.ui ? { ui: true, screen: p.screen.screen, fit: p.screen.fit, guide: p.screen.guide ? p.screen.guide.src : null, step: p.step } : {};
      return { id: s.id, name, dur: s.dur, start: p.start, layout: s.layout, desc, bg: p.bg, ground: p.ground.stops, colors: p.colors, backdrop: p.backdrop, into: p.into, hold: [p.holdFrom, p.holdTo], chars: p.chars, lines, counts, countLines, ...app };
    }) };
  if (tech.ui) {
    film.data = fm.data || null;
    film.guides = [...new Map(P.scenes.filter(p => p.ui && p.screen.guide).map(p => [p.screen.guide.src, { src: p.screen.guide.src, file: p.screen.guide.file, w: p.screen.guide.w, h: p.screen.guide.h }])).values()];
    film.gaps = G.map(g => ({ scene: g.scene, ask: g.ask }));
  }
  try { film.url = JSON.parse(fs.readFileSync(path.join(outDir, "film.json"), "utf8")).url; } catch { /* a first brief */ }
  if (film.url) console.log(`film: ${film.url} (revise this film; never make a second one for this output)`);
  fs.writeFileSync(path.join(outDir, "film.json"), JSON.stringify(film, null, 1) + "\n");
  fs.writeFileSync(path.join(outDir, "brief.md"), briefText(B, doc, film, tech, A, faces, P, records, motifAssets, logos));
  console.log(`[motion] ${fm.technique} · ${v.aspect} ${A.width}×${A.height} · ${scenes.length} scenes · ${P.total} s · ${film.energy}`);
  console.log(`brief: ${path.join(outDir, "brief.md")}`);
  console.log("upload: " + JSON.stringify({ file_paths: film.assets.map(a => a.path) }));
  if (records.length) console.log("records: " + JSON.stringify(records));
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
function digestVisual(file) {
  try {
    const t = fs.readFileSync(file, "utf8"), m = /## Visual rules[^\n]*\n([\s\S]*?)(\n## |$)/.exec(t);
    return m ? m[1].trim().split("\n").filter(l => l.startsWith("- ")).map(l => l.slice(2).trim()).join(" ") : "see the brand digest";
  } catch { return "see the brand digest"; }
}

function briefText(B, doc, film, tech, A, faces, P, records, motifAssets, logos) {
  const { fm } = doc, E = P.energy, R = P.R;
  const L = [];
  const pal = B.color("prism-color-surface"), main = B.color("prism-color-accent"), ink = B.color("prism-color-text-strong");
  const accent = (["prism-color-chart-2", "prism-color-chart-3", "prism-color-chart-5", "prism-color-chart-4", "prism-color-accent-strong"].filter(n => B.has(n) && !R.deny.roles.includes(n)).map(n => B.color(n))[0]) || main;
  const faceLine = t => { const f = faces[t]; return f && f.face ? `"${f.face}" (weight ${f.weight}${f.letterSpacing !== "0" ? `, letter-spacing ${f.letterSpacing}` : ""})` : "the brand's text face"; };
  L.push(`# Motion brief: ${fm.title}`, "");
  L.push(`Written by Prism from its approved format file (${fm.technique}, brand ${B.name}). Make this film with the Motion type's own steps, in order, with this brief as the request. Everything below is settled: ask nothing. Where this brief and a Motion page disagree on looks (colors per scene, gradients, transitions, backdrops), this brief wins: it is the person's own brand and direction.`, "");
  L.push("## The three answers", "");
  L.push(`- **Style:** ${tech.look}. ${E.say}.`);
  L.push(`- **Colors:** the brand's design system (${B.name}), no others. In scenes.json: \`"palettes":[["${pal}","${main}","${ink}","${accent}"]]\`, \`"theirs":1\`. Each scene has its own ground and colors from the brand, listed below.`);
  L.push(`- **Length:** ${film.length} seconds, as the scenes below add up (each holds after its last entrance lands: ${sayHold(P.hold)}).`, "");
  L.push("## The stage", "");
  L.push(`- ${A.width}×${A.height}, 60 fps, scenes.json \`background\` ${film.background}. ${cap(A.safe)}.`);
  L.push(`- \`look\` in scenes.json, word for word: "${tech.look}; brand ${B.name}, font files supplied".`);
  L.push(`- **One shared.js** holds what every scene does the same way: splitting a line into words (the accent words marked), the entrances, holds and exits named below, the transition halves and the backdrops. Scenes call it, so a move looks the same everywhere and a fix is one write.`);
  L.push(`- **Scene colors live in base.css**: one class per scene, \`.g-<scene id>\`, on that scene's \`.ground\`, setting \`--ground\`, \`--ink\`, \`--main\`, \`--c2\`, \`--c3\` (and its gradient) to the hexes below. Scenes use the variables, never their own hexes, so a color change is one write.`);
  L.push(`- Fonts are the brand's files, uploaded as assets with these exact names: ${film.assets.filter(a => a.mime.startsWith("font/")).map(a => `\`${a.name}\``).join(", ")}. Each registers as a face named by its file stem; name it ahead of the stack in base.css. In scenes.json \`fonts\`, put the nearest shipped faces underneath.`);
  for (const l of Object.values(logos)) L.push(`- Logo \`${l.name}\`${l.svg ? " (an SVG, a record below)" : ` (${l.w}×${l.h}, uploaded)`}: the brand's own file, placed with kit.assets.url. Never redraw it.`);
  if (records.length) {
    L.push(`- **Records Prism prepared**: write each with ArtifactData \`set\` and its \`file_path\`, in the first batch after the uploads, before any scene: ${records.map(r => `\`${r.collection}/${r.doc_id}\` from \`${r.file_path}\``).join("; ")}.`);
    if (records.some(r => r.doc_id === "icons.json")) L.push(`- Icons are the brand's set: \`kit.json('icons.json')[name]\` is an SVG path for \`viewBox="0 0 1024 1024"\`; draw it as \`<svg viewBox="0 0 1024 1024"><path d="…" fill="currentColor"/></svg>\` in the color the scene gives.`);
    for (const [id, m] of Object.entries(motifAssets).filter(([k]) => k.startsWith("device:"))) L.push(`- Device \`${m.name}\` (${id.slice(7)}): \`kit.module('${m.name}')\` is the frame's <svg> markup, drawn over the screenshot it holds; never redrawn, recolored or reshaped.`);
    for (const [id, m] of Object.entries(motifAssets).filter(([k]) => !k.startsWith("device:"))) L.push(m.svg
      ? `- Motif \`${m.name}\` (${id}): ${m.say}. \`kit.module('${m.name}')\` is its <svg> markup: insert it as it is, scaled to the frame. Its lines may be thickened (3 to 8 px on screen, \`vector-effect: non-scaling-stroke\`) and colored in the scene's second color through CSS; its shape never changes.`
      : `- Motif \`${m.name}\` (${id}): ${m.say}. Use it as an image (\`kit.assets.url('${m.name}')\`), never redrawn.`);
  }
  L.push("", "## Type", "", "Sizes are px on this stage. Set each line in its brand face:", "");
  L.push(`| Size | px |`, `|---|---|`, ...Object.entries(A.sizes).map(([k, n]) => `| ${k} | ${n} |`), "");
  const usedRoles = new Set(P.scenes.flatMap(p => p.s.blocks.map(b => b.role)));
  for (const [role, def] of Object.entries(T.roles)) if (def.type && usedRoles.has(role)) {
    const dark = def.dark_type && P.scenes.some(p => p.colors.dark && p.s.blocks.some(b => b.role === role)) ? `; on dark grounds ${faceLine(def.dark_type)}` : "";
    L.push(`- ${cap(def.say)} (${role}): ${faceLine(def.type)}${dark}, default size ${def.size}.`);
  }
  L.push("", "## Motion rules", "");
  L.push("- **Words on screen are verbatim.** Every line below is one string, exactly as written: no rewording, no new words, no added numbers, no extra captions or labels. A word in *stars* is the accent word: color it in the scene's main color by splitting the string at run time, keeping the line one literal.");
  L.push("- Nothing else appears on screen: no invented logos, people, stats, icons or decorative text.");
  L.push("- Each scene's `id`, `name` and `dur` are exactly as given; scene order is as given.");
  L.push(`- **No hard cuts.** Every scene ends and the next begins with the two halves of its transition (below): the last frame of one scene and the first frame of the next are the same picture. Prism checks every seam.`);
  L.push(`- **Everything arrives and everything leaves.** Each block enters with its move at its time and leaves with its exit, in reverse order, before the transition out starts (except blocks that stay, and the end card). Nothing simply appears or vanishes.`);
  L.push(`- **Every scene holds once everything has landed**, before anything leaves or the transition starts, long enough to read it (${sayHold(P.hold)}): the content stays put while the backdrop and every hold move keep going. Each scene's hold is below, and its times already include it.`);
  L.push(`- **Nothing is ever still.** The backdrop moves for the whole scene; held blocks keep their hold move. Energy: ${E.say.toLowerCase()} (stagger ${E.stagger} s, overshoot ${E.overshoot}).`);
  for (const r of tech.rules) L.push(`- ${r}`);
  if (B.res.digest) L.push(`- The brand's visual rules apply (from its digest): ${digestVisual(B.res.digest)}`);
  if (tech.ui) {
    L.push("", "## The walkthrough", "");
    for (const r of W.rules) L.push(`- ${r}`);
    if (film.data) L.push(`- Data: ${W.data[film.data]}.`);
    L.push("", "## The app", "");
    L.push("- **Build the app once**, in a module `ui.js` that every scene showing the app uses: its chrome (header, navigation, sidebar) and each page below. The chrome is the same code in every scene, so it matches pixel for pixel across a chrome hand-off; scenes swap only the page content and drive the camera, the cursor and the actions.");
    L.push("- **Read each screenshot with the Read tool before building its page**, and rebuild it as live HTML: the same layout, spacing, type sizes, colors, icons and copy (labels, buttons, table rows), in the app's own look rather than the brand's. A screenshot is a layout guide only: it is never placed in the film as a picture and never uploaded.");
    for (const g of film.guides) {
      const by = P.scenes.filter(p => p.ui && p.screen.guide && p.screen.guide.src === g.src);
      L.push(`- \`${g.file}\` (${g.w}×${g.h}, ${by[0].screen.screen}): "${by[0].screen.guide.name}", the page for ${by.map(p => `#${p.s.id}`).join(", ")}.`);
    }
    for (const [sc, fit] of [...new Set(P.scenes.filter(p => p.ui).map(p => `${p.screen.screen}|${p.screen.fit}`))].map(k => k.split("|"))) L.push(`- On this ${A.width}×${A.height} stage the ${T.screens[sc].say.replace(/^the /, "")}: ${fill(T.fits[fit], { device: T.screens[sc].device })}.`);
    L.push("- **The camera** is one transform (scale and translate) on the app, eased, clamped so the frame never shows past the UI's edges; the cursor moves with the app. The step card and the end card sit outside the camera: they stay put and the same size while it moves.");
    L.push(`- **The step card** is bottom-left, inside the safe area, on a solid panel of the brand's light surface with a soft shadow, in the brand's faces: the step number in a disc in the brand's main color, the eyebrow, the title, the sentence and the progress dots.`);
  }
  if (R.found) {
    L.push("", `## This brand's ${(R.name || R.piece).toLowerCase()} films`, "");
    for (const r of R.rules) L.push(`- ${r}`);
    if (R.deny.backdrops.length) L.push(`- Never as a backdrop: ${R.deny.backdrops.join(", ")}.`);
    if (R.deny.classes.length) L.push(`- Never: ${R.deny.classes.map(c => `.${c}`).join(", ")}.`);
    const no = R.deny.roles.filter(n => B.has(n)).map(n => B.color(n));
    if (no.length) L.push(`- Never these colors, anywhere (marks, panels, backdrops, objects): ${no.join(", ")}.`);
  }
  // The highlight band's color, when the piece names one.
  const highlight = R.emphasis.highlight && B.has(R.emphasis.highlight) ? B.color(R.emphasis.highlight) : null;
  L.push("", "## Scenes", "", "Times are seconds from the scene's own start.", "");
  P.scenes.forEach((p, n) => {
    const s = p.s, f = film.scenes[n], c = p.colors, g = p.ground;
    L.push(`### ${n + 1}. #${s.id} · "${f.name}" · ${s.dur} s (starts at ${f.start} s)`, "");
    L.push(`- scenes.json: \`{"id":"${s.id}","name":"${f.name}","dur":${s.dur},"desc":${JSON.stringify(f.desc)}}\``);
    L.push(`- Layout ${s.layout}: ${p.lay.say}`);
    if (p.ui) {
      const x = p.screen, g = x.guide;
      L.push(`- **Screen**: ${T.screens[x.screen].say}, ${x.fit === "full" ? "full screen" : x.fit === "crop" ? "cropped to the stage, the camera panning with the action" : `in the ${x.device} mockup`}; the page "${g.name}" (\`${g.src}\`)${x.own ? "" : ", the same page the scene before ended on"}.`);
      if (s.layout === "app") L.push(`- **Builds in** from ${p.buildAt} s to ${r2(p.buildAt + 2.4)} s: the header, then the navigation, then the content, staggered, with the whole screen in view; the camera then pushes in slowly toward where step 1 happens.`);
      if (p.card) L.push(`- **${p.step ? "Step card" : "Intro card"}**: ${p.step ? `the number ${p.step} in its disc, the eyebrow "Step ${p.step} of ${p.steps}", ` : ""}the title and sentence below${p.step ? `, and ${p.steps} progress dots with the first ${p.step} filled` : ""}. It opens at ${p.card.at} s (rises with a slight overshoot) and has landed by ${p.card.landed} s; at ${p.card.collapse} s it collapses over ${W.card.collapse} s to a chip (${p.step ? "the number and " : ""}the title only), which stays until it fades out with the page content. No action starts while it is open.`);
    }
    const groundSay = (p.ui ? "behind the app, seen only during transitions: " : "") + (g.css ? `${g.say || T.grounds[p.bg].say}: exactly \`background: ${g.css}\`` : `${T.grounds[p.bg].say}, ${g.gradient ? `a gradient ${g.stops.join(" → ")} from top left to bottom right` : g.stops[0]}`);
    L.push(`- **Ground (.g-${s.id})**: ${groundSay}. Ink ${c.ink}; main ${c.main}; second ${c.second}; third ${c.third}.`);
    L.push(`- **Backdrop**: ${p.backdrop === "motif" && motifAssets[p.motif] ? `the brand motif \`${motifAssets[p.motif].name}\`: ${T.backdrops.motif}` : (R.backdrops.say[p.backdrop] || T.backdrops[p.backdrop])}.`);
    if (p.inT) L.push(`- **Arrives (${p.inT.name})**: ${fill(transitionOf(R, p.inT.name).in, p.inT)}${p.inT.motif && motifAssets[p.inT.motif] ? ` (the edge's shape, from the motif \`${motifAssets[p.inT.motif].name}\`)` : ""}.`);
    else if (n > 0) L.push(`- **Arrives (cut)**: a deliberate hard cut.`);
    else L.push(`- **Opens the film**: the first blocks are already in place at frame 0 (their entrances start before 0), so the thumbnail reads.`);
    p.toastAt = A.height > A.width ? "top of the frame, inside the safe area" : "bottom right";
    for (const bp of p.blocks) L.push(`- ${blockLine(bp, p, E, motifAssets, highlight)}`);
    for (const note of s.notes) L.push(`- Direction: ${note.replace(/\s+/g, " ")}`);
    L.push(`- Holds from ${p.holdFrom} s to ${p.holdTo} s (${p.hold} s${p.s.attrs.hold !== undefined ? ", set by hand" : `, for ${p.chars} characters`}): everything has landed; the backdrop and the hold moves keep going${p.goneBy === null ? " to the end" : ""}.`);
    if (p.backBy) L.push(`- At ${p.holdTo} s the camera pulls back out to the whole screen; by ${p.backBy} s it is there, so the chrome matches the next scene.`);
    if (p.goneBy !== null) L.push(`- By ${p.goneBy} s every block that leaves has left.`);
    if (p.outT) L.push(`- **Ends (${p.outT.name} into #${P.scenes[n + 1].s.id})**: ${fill(transitionOf(R, p.outT.name).out, p.outT)}${p.outT.motif && motifAssets[p.outT.motif] ? ` (the edge's shape, from the motif \`${motifAssets[p.outT.motif].name}\`)` : ""}.`);
    else if (p.outInto === "cut") L.push(`- **Ends**: a deliberate hard cut into #${P.scenes[n + 1].s.id}.`);
    else L.push(`- **Ends the film**: held still on the end card, the backdrop still moving gently.`);
    L.push("");
  });
  L.push("## Sound", "");
  L.push(`- ${cap(T.music[film.music])}.`);
  const cues = [];
  P.scenes.forEach(p => { for (const bp of p.blocks) if (bp.b.a.attrs.sfx) cues.push(`${bp.b.a.attrs.sfx} at ${r2(p.start + bp.at)} s (#${p.s.id})`); });
  P.scenes.forEach(p => { if (p.inT && film.music !== "none") cues.push(`whoosh at ${r2(p.start - p.inT.half)} s, ${p.inT.half * 2} s long (into #${p.s.id})`); });
  if (cues.length) L.push(`- Foley cues: ${cues.join("; ")}.`);
  L.push("");
  return L.join("\n");
}
const CARD = { h2: "the card's title", sub: "the card's sentence" };
function blockLine(bp, p, E, motifAssets, highlight) {
  const { b } = bp, def = T.roles[b.role] || {};
  if (b.role === "action") {
    const t = fill(T.classes[bp.action].say, { text: b.text, field: b.a.attrs.field || "", zoom: bp.zoom || "", cps: W.cps, toast: p.toastAt || "bottom right" });
    const cam = bp.zoom && bp.action !== "focus" ? `the camera first pushes in on it (about ${bp.zoom}×, about 1 s) and stays in; then ` : "";
    return `Action (.${bp.action}): at ${bp.at} s ${cam}${t}; done by ${bp.landed} s${b.a.attrs.sfx ? ` (sound: ${b.a.attrs.sfx})` : ""}.`;
  }
  const say = c => {
    const t = fill(T.classes[c].say, { from: b.a.attrs.from, stagger: b.a.attrs.stagger || E.stagger, overshoot: E.overshoot });
    return c === "highlight" && highlight ? t.replace("in the scene's second color", `in ${highlight}, at full strength`) : t;
  };
  const parts = [`at ${bp.at} s it ${say(bp.enter)}`];
  if (bp.emphasis) parts.push(say(bp.emphasis).replace(/^after it lands, /, "after it lands "));
  if (bp.hold) parts.push(say(bp.hold));
  if (bp.exit === "stay") parts.push(say("stay"));
  else if (bp.exit) parts.push(`at ${bp.leaveAt} s it ${say(bp.exit)}`);
  const sfx = b.a.attrs.sfx ? ` (sound: ${b.a.attrs.sfx})` : "";
  const how = `: ${parts.join("; ")}${sfx}.`;
  const size = bp.size ? `, size ${bp.size}` : "";
  if (b.role === "logo") return `The brand logo (asset \`${b.asset}\`)${how}`;
  const dev = motifAssets["device:" + b.a.attrs.frame];
  if (b.role === "image" && dev) return `The picture \`${b.asset}\` (${b.text ? `"${b.text}"` : "no caption on screen"}), ${T.frames[b.a.attrs.frame]}: \`kit.module('${dev.name}')\` is the device's <svg> (${dev.ratio}), drawn over the picture and never redrawn or recolored; the picture fills its screen (${dev.screen}), cover-cropped from the top, and the two move as one${how}`;
  if (b.role === "image") return `The picture \`${b.asset}\` (${b.text ? `"${b.text}"` : "no caption on screen"}), ${T.frames[b.a.attrs.frame || "none"]}${how}`;
  if (b.role === "motif") return `The brand motif \`${(motifAssets[b.motif] || {}).name}\` as a divider across the frame${how}`;
  if (b.role === "icon") return `Icon \`${b.icon}\` from the brand set${size}, in the scene's main color${b.text ? `, labelled "${b.text}"` : ""}${how}`;
  if (b.role === "draw") return `Draw${b.a.attrs.n ? ` (${b.a.attrs.n} in all)` : ""}: ${b.say.replace(/\s+/g, " ").replace(/\.$/, "")}${/"/.test(b.say) ? ". Words in quotes are on-screen lines, verbatim" : ""}; in the scene's colors${how}`;
  if (b.role === "chart") return `A chart, built from this data (values exact; labels and caption verbatim), bars in the scene's main, second and third colors:\n\n\`\`\`\n${b.text.trim()}\n\`\`\`\n\n  Then${how.slice(1)}`;
  if (b.role === "list") return `${b.recap ? "The recap of the steps (Prism adds it from the step titles, numbered in order): a list" : "A list"}${size}, ${T.lists[b.style]}; items, verbatim, ${b.a.attrs.stagger || r2(E.stagger * 3)} s apart:${b.items.map(x => ` "${x.text}"${x.icon ? ` (icon \`${x.icon}\`)` : ""}`).join(";")}${how}`;
  const accent = b.accent ? ` Accent word: "${b.accent}".` : "";
  return `${cap(p.ui && CARD[b.role] || def.say)}${size}: "${b.text}"${how}${accent}`;
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
// The numbers a .count passes through on its way (from=5 to 2 also shows 4 and 3).
const isCountStep = (v, s) => (s.counts || []).includes(v);

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
  const base = (st.modules["base.css"] || {}).text || "";
  const uiNums = new Set();
  for (const s of film.scenes) {
    const mod = st.modules[`scene-${s.id}.js`];
    if (!mod) { out.push(`#${s.id}: no scene module (scene-${s.id}.js)`); continue; }
    if (/rough:\s*true/.test(mod.text)) out.push(`#${s.id}: still rough`);
    // A scene that shows the app may keep its words in the shared ui.js (or shared.js) too.
    const code = s.ui ? [mod.text, ...["ui.js", "shared.js"].map(n => (st.modules[n] || {}).text || "")].join("\n") : mod.text;
    const shown = screenText(code).map(norm), all = norm(shown.join(" "));
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
    for (const t of shown) for (const nm of t.match(NUM) || []) {
      const v = String(parseFloat(nm.replace(/,/g, "")));
      if (allowedNums.has(v) || isCountStep(v, s) || retyped.some(x => String(x.v || "").includes(nm))) continue;
      // The app's own copy, rebuilt from its screenshot, carries numbers the format file doesn't: looked at by eye.
      if (s.ui) uiNums.add(`#${s.id}: ${nm} ("${t.slice(0, 50)}")`);
      else out.push(`#${s.id}: number ${nm} on screen ("${t.slice(0, 50)}") is not in the format file`);
    }
    // The scene's ground is the brief's: its colors are in base.css (or the scene), under its own class.
    if (s.ground) {
      const css = (base + "\n" + mod.text).toLowerCase();
      const missing = s.ground.filter(h => !css.includes(h.toLowerCase()));
      if (missing.length) out.push(`#${s.id}: its ground ${missing.join(", ")} is nowhere in base.css or the scene`);
      if (!css.includes(`g-${s.id}`)) warn.push(`#${s.id}: no .g-${s.id} class: its colors may be spelt out in the scene`);
    }
  }
  // Brand faces: every font asset in film.json is a store asset with the right type, and base.css names it.
  for (const a of film.assets) {
    const doc = st.assets[a.name];
    if (!doc) { out.push(`asset ${a.name} is not in the film`); continue; }
    if (doc.mime !== a.mime) out.push(`asset ${a.name} has mime ${doc.mime}, expected ${a.mime}`);
    const stem = a.name.replace(/\.[^.]+$/, "");
    if (a.mime.startsWith("font/") && !base.includes(stem) && !Object.values(st.modules).some(m => (m.text || "").includes(stem))) out.push(`the brand face ${stem} is uploaded but never used`);
  }
  // Every record Prism prepared is in the film and some module asks for it by name (a renamed one shows as missing art).
  const code = Object.entries(st.modules).filter(([n]) => /\.js$|\.css$/.test(n)).map(([, m]) => m.text || "").join("\n");
  for (const r of film.records || []) {
    if (!(st[r.collection] || {})[r.doc_id]) out.push(`record ${r.collection}/${r.doc_id} is not in the film (write it from its file_path)`);
    else if (!code.includes(r.doc_id)) out.push(`record ${r.collection}/${r.doc_id} is in the film but no scene uses it by that name`);
  }
  const known = new Set([...film.assets.map(a => a.name), ...(film.records || []).filter(r => r.collection === "assets").map(r => r.doc_id)]);
  for (const name of Object.keys(st.assets)) if (!known.has(name)) warn.push(`asset ${name} is in the film but not in the brief`);
  if (film.music !== "none" && !st.modules["score.js"]) out.push("no score.js: the brief asks for music");
  if (film.music === "none" && st.modules["score.js"]) out.push("score.js is there: the brief asks for silence");
  // Colors the piece never uses, anywhere in the film's code.
  for (const c of [...new Set(((film.deny || {}).colors || []).map(x => x.toLowerCase()))]) {
    const where = Object.entries(st.modules).filter(([, m]) => (m.text || "").toLowerCase().includes(c)).map(([n]) => n);
    if (where.length) out.push(`${c} is a color this piece never uses, but ${where.join(", ")} uses it`);
  }
  if (uiNums.size) warn.push(`numbers in the app's own copy (from its screenshots; check them on the contact sheet): ${[...uiNums].slice(0, 12).join("; ")}`);
  if ((film.gaps || []).length) warn.push(`flag on delivery, not confirmed: ${film.gaps.map(g => g.ask).join(" | ")}`);
  for (const w of warn) console.log(`  note: ${w}`);
  if (pageEdits.length) { console.log(`PAGE EDITS: ${pageEdits.length} line(s) retyped on the film page (vet them; ask before carrying them into content.md):`); for (const e of pageEdits) console.log(`  ${e}`); }
  if (!out.length) { console.log(`OK: the film matches ${path.join(dir, "film.json")} (${film.scenes.length} scenes, ${film.length} s, every line verbatim)`); return 0; }
  console.log(`CHECK: ${out.length} problem(s):`);
  for (const o of out) console.log(`  ${o}`);
  return 1;
}

// --- render: stills, seams and grounds from the player's headless entry, network blocked ------------------------------

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
  const problems = [], notes = [];
  if (res.error) { console.error(`[motion] the film did not load: ${res.error.message || res.error}`); await browser.close(); return 1; }
  const meta = res.meta;
  if (Math.abs(meta.duration - film.length) > 0.01) problems.push(`the film runs ${meta.duration} s, the format file ${film.length} s`);
  for (const sc of meta.scenes || []) if (sc.state !== "final") problems.push(`#${sc.id} is ${sc.state}`);
  const frame = t => page.evaluate(tt => window.__animation.frame(tt, { scale: 1 }), t);
  // Mean change between two frames (0 = the same picture, 1 = every pixel inverted), on a small copy.
  const diff = (a, b) => page.evaluate(async ([a, b]) => {
    const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const [x, y] = await Promise.all([load(a), load(b)]), w = 120, h = Math.round(120 * x.height / x.width);
    const px = i => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.drawImage(i, 0, 0, w, h); return g.getImageData(0, 0, w, h).data; };
    const p = px(x), q = px(y); let s = 0; for (let k = 0; k < p.length; k += 4) s += Math.abs(p[k] - q[k]) + Math.abs(p[k + 1] - q[k + 1]) + Math.abs(p[k + 2] - q[k + 2]);
    return s / (w * h * 3 * 255);
  }, [a, b]);
  // The colors around a frame's edge, where the ground shows.
  const edges = u => page.evaluate(async u => {
    const i = await new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = u; });
    const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d"); g.drawImage(i, 0, 0);
    const pts = []; for (const fx of [0.02, 0.25, 0.5, 0.75, 0.98]) for (const fy of [0.02, 0.98]) pts.push([fx, fy]); for (const fy of [0.3, 0.5, 0.7]) pts.push([0.02, fy], [0.98, fy]);
    return pts.map(([fx, fy]) => Array.from(g.getImageData(Math.floor(fx * (i.width - 1)), Math.floor(fy * (i.height - 1)), 1, 1).data.slice(0, 3)));
  }, u);
  outDir = outDir || path.join(dir, "stills");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const shots = [];
  const shoot = async (t, label) => { const u = await frame(t); const f = path.join(outDir, `t_${t.toFixed(2).padStart(6, "0")}.png`); fs.writeFileSync(f, Buffer.from(u.split(",")[1], "base64")); shots.push({ t, f, label }); return u; };
  await shoot(0, "frame 0");
  for (const [n, s] of film.scenes.entries()) {
    // The middle of the scene's hold (everything landed, nothing leaving yet): it still moves half a second later.
    const tm0 = s.hold ? s.start + (s.hold[0] + s.hold[1]) / 2 : s.start + Math.min(s.dur * 0.55, s.dur - 0.6);
    const settle = await shoot(+tm0.toFixed(2), `#${s.id}${s.hold ? " (hold)" : ""}`);
    const later = await frame(+(tm0 + 0.5).toFixed(2));
    if (await diff(settle, later) < 0.0004) problems.push(`#${s.id} is frozen around ${r2(tm0)} s: nothing moves for half a second while it holds`);
    // The ground the brief gave, where the edge shows it (flat grounds; a gradient is looked at by eye).
    if (s.ground && s.ground.length === 1 && !s.ui) {
      const px = await edges(settle), want = s.ground[0], d = c => Math.hypot(c[0] - hex(want)[0], c[1] - hex(want)[1], c[2] - hex(want)[2]);
      if (px.filter(c => d(c) < 30).length < 3) problems.push(`#${s.id}: the ground at the edges isn't ${want} (${s.bg})`);
    }
    // The seam into the next scene: its last frame and the next one's first are the same picture, unless the cut is asked for.
    const next = film.scenes[n + 1];
    if (next) {
      if (next.into && next.into !== "cut") await shoot(+(next.start - 0.2).toFixed(2), `into #${next.id} (${next.into})`);
      const a = await frame(+(next.start - 1 / 60).toFixed(4)), b = await frame(next.start);
      const d = await diff(a, b);
      if (next.into === "cut") notes.push(`seam into #${next.id}: a hard cut, as asked`);
      else if (d > 0.04) problems.push(`seam into #${next.id}: a hard cut (${(d * 100).toFixed(1)} % of the picture changes in one frame); the brief asks for ${next.into}`);
      else notes.push(`seam into #${next.id} (${next.into}): seamless (${(d * 100).toFixed(1)} %)`);
    }
  }
  await shoot(+(film.length - 0.05).toFixed(2), "last frame");
  // Seeking back to a time gives the same frame: the film is a pure function of time.
  const mid = film.scenes[Math.floor(film.scenes.length / 2)];
  const tm = +(mid.start + mid.dur / 2).toFixed(2);
  const a = await frame(tm); await frame(film.length - 0.1); const b = await frame(tm);
  if (a !== b) problems.push(`the frame at ${tm} s differs after seeking away and back: something depends on more than time`);
  const score = await page.evaluate(() => window.__animation.scoreReport()).catch(() => null);
  if (score && score.unknown && score.unknown.length) problems.push(`the score names sounds the player doesn't have: ${score.unknown.join(", ")}`);
  const log = await page.evaluate(() => window.__animation.consoleLog());
  for (const l of log) if (l.level === "error" || /raster-safety/.test(l.text)) problems.push(`runner ${l.level}: ${l.text.slice(0, 400)}`);
  // A contact sheet of the stills, labelled.
  const W = 300, H = Math.round(W * film.height / film.width), cols = Math.min(6, shots.length);
  const sheet = path.join(outDir, "contact-sheet.png");
  shots.sort((x, y) => x.t - y.t);
  const html = `<body style="margin:0;background:#2a2a2e;font:13px system-ui;color:#ddd"><div style="display:grid;grid-template-columns:repeat(${cols},${W}px);gap:12px;padding:12px">` +
    shots.map(s => `<div><img src="data:image/png;base64,${fs.readFileSync(s.f).toString("base64")}" style="width:${W}px;height:${H}px;display:block"><div style="padding-top:4px">${s.t.toFixed(2)} s · ${s.label}</div></div>`).join("") + "</div></body>";
  const sp = await browser.newPage({ viewport: { width: cols * (W + 12) + 12, height: 400 } });
  await sp.setContent(html); await sp.screenshot({ path: sheet, fullPage: true });
  await browser.close();
  if (missing.length) problems.push(`not rendered: ${missing.join(", ")} (uploads only the film holds; read them by id into a folder and pass --assets)`);
  for (const n of notes) console.log(`  ${n}`);
  console.log(`stills: ${outDir} (${shots.length}), contact sheet: ${sheet}`);
  if (score) console.log(`score: ${score.events} events, ${score.first}–${score.last} s`);
  if (!problems.length) { console.log("OK: the film loads, every seam is seamless or a cut that was asked for, every scene moves and stands on its ground"); return 0; }
  console.log(`CHECK: ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ${p}`);
  return 1;
}

module.exports = { parse, validate, plan, gaps, screensOf, attrs, screenText, techniquesFor, motifsFor, sceneColors, groundOf, contrast, holdFor, holdRule, sceneLines, T };
if (require.main !== module) return;

const [cmd, ...args] = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (cmd === "techniques") {
  const B = opt("--brand") ? require("./brand.js")(null, opt("--brand")) : null;
  for (const k of techniquesFor(B)) { const t = T.techniques[k]; console.log(`${k}: ${t.name} · layouts ${keys(t.layouts).join(", ")} · ${t.length[0]}–${t.length[1]} s · ${t.aspect}, ${t.energy} by default`); }
  if (B) { const m = motifsFor(B); console.log(m.length ? `motifs: ${m.map(x => `${x.id} (${x.on})`).join(", ")}` : "motifs: none"); }
} else if (cmd === "link" && pos[1]) {
  // The film this output was made into, kept beside its brief so later rounds revise the same film.
  const f = path.join(path.resolve(pos[0]), "film.json"), j = JSON.parse(fs.readFileSync(f, "utf8"));
  if (j.url && j.url !== pos[1]) console.log(`[motion] was ${j.url}`);
  j.url = pos[1]; fs.writeFileSync(f, JSON.stringify(j, null, 1) + "\n"); console.log(`film: ${j.url}`);
} else if (cmd === "gaps" && pos[0]) {
  // A walkthrough's open questions, to ask the person before the film is made; 1 while one still stops the brief.
  const f = path.resolve(pos[0]), doc = parse(fs.readFileSync(f, "utf8")), tech = T.techniques[doc.fm.technique] || {};
  const G = gaps(doc, f, doc.fm.aspect || tech.aspect);
  for (const g of G) console.log(`${g.block ? "ASK (needed)" : "ASK"}: ${g.ask}`);
  if (!G.length) console.log("no gaps");
  process.exit(G.some(g => g.block) ? 1 : 0);
} else if (cmd === "brief" && pos[0] && opt("--out")) brief(path.resolve(pos[0]), path.resolve(opt("--out")));
else if (cmd === "check" && pos[1]) process.exit(check(path.resolve(pos[0]), path.resolve(pos[1])));
else if (cmd === "render" && pos[2]) render(path.resolve(pos[0]), path.resolve(pos[1]), path.resolve(pos[2]), opt("--out") && path.resolve(opt("--out")), opt("--assets") && path.resolve(opt("--assets"))).then(c => process.exit(c), e => { console.error(`[motion] ${e.message}`); process.exit(1); });
else { console.error("usage: motion.js techniques [--brand id] | gaps formats/motion.md | brief formats/motion.md --out DIR | link DIR URL | check DIR STORE | render DIR STORE PLAYER [--out DIR] [--assets DIR]"); process.exit(2); }
