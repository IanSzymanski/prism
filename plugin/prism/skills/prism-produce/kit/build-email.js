#!/usr/bin/env node
// Markdown email (layout: email) -> email-safe HTML. Usage: node build-email.js formats/html-email.md out/html-email
// Writes <tag>.html (inline CSS; one small <style> block for dark mode and phones, which can't be inline),
// <tag>.txt (plain-text part), images/ (2x, compressed, each named <tag>-...), <tag>-images.zip (uploaded beside the HTML in Zoho Campaigns),
// <tag>-preview.png (desktop and phone, light and dark, simulated Outlook dark) and .prism-build.json (checked by verify.py).
// Core logic only: the palette, font stacks and logo width come from the brand profile (m365.email, checked by palette.js); logo, divider and preview fonts from its roles.
const { execFileSync } = require("child_process");
const path = require("path"), fs = require("fs"), crypto = require("crypto"), os = require("os");
const { chromium } = require("playwright");

const here = __dirname;
const md = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : path.join(path.dirname(md), "html-email"));
const { tagFor, named } = require("./naming.js");
const BR = require("./brand.js")(md), ORN = BR.ornaments, ORNE = { stat_rule: BR.option("email.stat_rule", false), quote_bar: BR.option("email.quote_bar", false) }, PAL = require("./palette.js"), M = PAL.forBrand(BR);
// Core email settings (not brand): icons, the Outlook simulation in previews, and the light-only default.
const B = {
  iconFont: BR.icons.css, iconClass: BR.icons.cls, outlookSim: true,
  // Outlook-only [data-ogsc]/[data-ogsb] dark rules stay off: Outlook applies them and then runs its own dark mode over the result, so colours are recoloured twice (measured October 2026).
  outlookOverrides: false,
  // light (default): one light email that clients' own dark modes recolour cleanly. auto: adds the email's dark CSS for Apple Mail and iOS, but Outlook recolours that a second time.
  scheme: "light",
  logo: { width: M.logoWidth || 168 }, divider: { kind: ORN.divider ? "ornament" : "rule", height: ORN.dividerHeight || 40 },
};
if (!M.fonts) { console.error(`[email] brand ${BR.id} has no email font stacks (profile m365.email.fonts)`); process.exit(1); }
// The brand's email palette (profile m365.email, approved by the brand); core's proposal with a warning if it isn't reviewed.
const L = { accentFill: M.light.accent, ...M.light }, D = { accentFill: M.dark.accent, ...M.dark }, F = M.fonts, R = parseInt(BR.role("prism-radius-button"));
const warn = [], say = m => warn.push(m);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, "images"), { recursive: true });

// ---------- source ----------
const src = fs.readFileSync(md, "utf8");
const fm = /^---\n([\s\S]*?)\n---\n?/.exec(src);
const meta = {};
for (const l of (fm ? fm[1] : "").split("\n")) { const m = /^([\w-]+):\s*(.*)$/.exec(l); if (m) meta[m[1]] = m[2].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "").trim(); }
const template = meta.template || "announcement";
// Every exported file carries the piece tag (slug, output, version), images included, so nothing mixes in an ESP library.
const TAG = tagFor(md, meta), OUT = { html: named(TAG, "", ".html"), txt: named(TAG, "", ".txt"), preview: named(TAG, "preview", ".png"), zip: named(TAG, "images", ".zip") };
// scheme: light (default) exports a light-only email: no dark CSS, no dark image twins, color-scheme "light only";
// each client's own dark mode recolours it, and the brand palette is chosen to survive that. auto adds our dark CSS.
const argScheme = (process.argv.indexOf("--scheme") > -1) ? process.argv[process.argv.indexOf("--scheme") + 1] : null;
// Default light: Outlook runs our dark CSS and then recolours it again (tested October 2026), while a light email with
// the Outlook-safe palette comes through its dark mode cleanly. auto is kept for clients that render dark CSS properly.
const scheme = argScheme || meta.scheme || B.scheme || "light";
if (!["auto", "light"].includes(scheme)) say(`unknown scheme "${scheme}"; use auto or light`);
const dualScheme = scheme !== "light";
if (!["announcement", "newsletter", "letter"].includes(template)) say(`unknown template "${template}"; use announcement, newsletter or letter`);
const base = (meta["image-base"] || "").replace(/\/?$/, meta["image-base"] ? "/" : "");

// Merge tags and shortcodes pass through untouched: Zoho CRM ${...}, Zoho Campaigns $[...]$, Handlebars/Liquid {{...}} {%...%},
// Mailchimp *|...|*, Salesforce %%...%%. They are swapped for private-use markers before parsing and restored at the end.
const SC = [/\$\{[^}\n]+\}/g, /\$\[[^\]\n]+\]\$/g, /\{\{[^}\n]+\}\}/g, /\{%[^%\n]+%\}/g, /\*\|[^|\n]+\|\*/g, /%%[^%\n]+%%/g];
const codes = [];
let body = fm ? src.slice(fm[0].length) : src;
const protect = s => SC.reduce((t, re) => t.replace(re, m => `\uE000${codes.push(m) - 1}\uE001`), s);
body = protect(body);
for (const k of ["subject", "preheader"]) if (meta[k]) meta[k] = protect(meta[k]);
for (const m of body.matchAll(/(\$\{|\$\[|\{\{|\{%|\*\||%%)[^\n]{0,30}/g)) say(`shortcode not closed: "${m[0]}"`);
const restore = s => s.replace(/\uE000(\d+)\uE001/g, (m, i) => codes[+i]);
const shortcodesUsed = () => [...new Set(codes)];

// Top-level blocks (same rules as the other builders: fenced divs nest, blank lines split).
function chunks(text) {
  const lines = text.split("\n"), out = []; let cur = [], fence = 0;
  const flush = () => { if (cur.some(l => l.trim())) out.push(cur.join("\n").trim()); cur = []; };
  for (const l of lines) {
    const f = /^(:{3,})\s*(\S.*)?$/.exec(l);
    if (f && f[2] && !fence) { flush(); fence = 1; cur.push(l); continue; }
    if (fence) { cur.push(l); if (f) fence += f[2] ? 1 : -1; if (!fence) flush(); continue; }
    if (!l.trim()) { flush(); continue; }
    cur.push(l);
  }
  flush(); return out;
}
const inner = b => b.replace(/^:{3,}.*\n?/, "").replace(/\n?:{3,}\s*$/, "");
const attrs = s => { const a = { cls: [] }; for (const m of (s || "").matchAll(/\.([\w-]+)|([\w-]+)="([^"]*)"/g)) m[1] ? a.cls.push(m[1]) : (a[m[2]] = m[3]); return a; };
const paras = s => s.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
const items = s => s.split(/\n(?=\s*(?:-|\d+\.)\s)/).map(x => x.replace(/^\s*(?:-|\d+\.)\s+/, "").replace(/\n\s*/g, " ").trim()).filter(Boolean);

// ---------- inline ----------
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const links = [];
const href = u => { const r = restore(u); if (!/^(https:\/\/|mailto:|tel:|\uE000|\$|\{\{|\*\||%%)/.test(u) || /^https?:\/\/(example\.com|#)?$/.test(r)) say(`link needs a full https address: "${r}"`);
  if (/^http:\/\//.test(u)) say(`link is not https: ${r}`); links.push(r); return esc(u); };
function inl(s, ctx = {}) {
  const keep = [];
  const hold = h => `\uE002${keep.push(h) - 1}\uE003`;
  let t = s.replace(/\[\]\{[^}]*\}/g, "")                                                     // icons are handled by their block
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)(\{[^}]*\})?/g, (m, txt, u) => hold(`<a href="${href(u)}" class="lk" style="color:${L.accent};text-decoration:${ctx.heading ? "none" : "underline"}">${inl(txt, ctx)}</a>`))
    .replace(/\[([^\]]*)\]\{[^}]*\}/g, "$1");
  t = esc(t).replace(/\\ /g, "&nbsp;")
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="font-weight:600">$1</strong>`)
    .replace(/\*([^*]+)\*/g, ctx.heading ? `<span class="ac" style="color:${L.accent}">$1</span>` : "<em>$1</em>");
  return t.replace(/\uE002(\d+)\uE003/g, (m, i) => keep[+i]);
}
const plain = s => restore(s).replace(/\[\]\{[^}]*\}/g, "").replace(/\[([^\]]+)\]\(([^)\s]+)\)(\{[^}]*\})?/g, "$1 ($2)").replace(/\[([^\]]*)\]\{[^}]*\}/g, "$1").replace(/[*]|\\(?= )/g, "").trim();

// ---------- images ----------
const jobs = [];
const imgIndex = new Map();
function asset(p, width, opts = {}) {
  const abs = BR.src(p, path.dirname(md));
  if (!fs.existsSync(abs)) { say(`missing image: ${p}`); return { key: null }; }
  const k = abs + "@" + width + (opts.halo || "") + (opts.square ? "sq" : "");
  if (!imgIndex.has(k)) {
    const name = TAG + "-" + path.basename(p).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") + (opts.suffix || "");
    let n = name, i = 2; while ([...imgIndex.values()].some(v => v.name === n)) n = `${name}-${i++}`;
    imgIndex.set(k, { name: n, abs, width, halo: opts.halo || null, ...opts });
  }
  return { key: k };
}
// Rendered later, once the image sizes are known: a placeholder that becomes the <img> (and its dark twin).
function img({ src, dark, alt, width, link, cls = "", style = "", halo, square }) {
  if (alt == null || alt === "") say(`image without alt text: ${src}`);
  const a = asset(src, width, { halo, square, suffix: square ? "-sq" : "" }), d = dark && dualScheme ? asset(dark, width, { square }) : null;
  return `\uE010${JSON.stringify({ a: a.key, d: d && d.key, alt: alt || "", width, link, cls, style })}\uE011`;
}

// Generated brand assets: the divider and icons, drawn once in Chromium.
const genJobs = { dividers: false, icons: new Set() };
const divider = () => { genJobs.dividers = true; return `\uE010${JSON.stringify({ gen: "divider" })}\uE011`; };
const icon = n => { genJobs.icons.add(n); return `\uE010${JSON.stringify({ gen: "icon", n })}\uE011`; };

// ---------- blocks ----------
const W = 600, P = 32, IN = W - P * 2 - (template !== "letter" ? 2 : 0);  // the boxed card has a 1px border each side
const font = (kind, size, lh, weight = 400, color = L.body, cls = "tb") =>
  ({ s: `font-family:${F[kind]};font-size:${size}px;line-height:${lh}px;font-weight:${weight};color:${color}`, cls });
const row = (html, pad = `0 ${P}px 18px`, extra = "") => `<tr><td class="px" style="padding:${pad}${extra}">${html}</td></tr>`;
const p = (t, f = font("sans", 16, 25), mb = 0) => `<p class="${f.cls}" style="margin:0${mb ? ` 0 ${mb}px` : ""};${f.s}">${t}</p>`;
const H = {
  h1: () => font("serif", 34, 40, 500, L.ink, "tx h1"),
  h2: () => font("serif", 24, 30, 500, L.ink, "tx"),
  h3: () => font("sans", 17, 24, 600, L.ink, "tx"),
  h4: () => ({ s: `font-family:${F.mono};font-size:12px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:${L.accent}`, cls: "ac" }),
  // On a tinted ground the small label takes the body colour: accent text that small falls below 4.5:1 on the tint in Outlook's dark mode.
  h4tint: () => ({ s: `font-family:${F.mono};font-size:12px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:${L.body}`, cls: "tb" }),
};
// Outlook ignores padding, width and height on <div> and <p>, so spacing and rules are table cells.
const spacer = h => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="${h}" style="height:${h}px;line-height:${h}px;font-size:0">&nbsp;</td></tr></table>`;
const rule = (c = L.hair, w = 1, cls = "hr") => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="${cls}" height="${w}" style="border-top:${w}px solid ${c};height:${w}px;line-height:${w}px;font-size:0">&nbsp;</td></tr></table>`;
const heading = (lvl, t, mb = 0, tint = false) => { const f = tint && lvl >= 4 ? H.h4tint() : H["h" + Math.min(lvl, 4)](); return `<h${lvl} class="${f.cls}" style="margin:0${mb ? ` 0 ${mb}px` : ""};${f.s}">${inl(t.replace(/\s*\{[^}]*\}\s*$/, ""), { heading: true })}</h${lvl}>`; };
const eyebrow = (t, tint = false) => p(inl(t), tint ? H.h4tint() : H.h4(), 10);

// Hybrid columns: inline-block divs that stack on their own on narrow screens, with ghost tables for Outlook.
function columns(cells, widths, gap = 16) {
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  const mso = (i) => i === 0 ? `<!--[if mso]><table role="presentation" width="${total}" cellpadding="0" cellspacing="0" border="0"><tr><td width="${widths[0]}" valign="top"><![endif]-->`
    : `<!--[if mso]></td><td width="${gap}"></td><td width="${widths[i]}" valign="top"><![endif]-->`;
  return `<div style="font-size:0;text-align:left">${cells.map((c, i) => `${mso(i)}<div class="col" style="display:inline-block;vertical-align:top;width:100%;max-width:${widths[i]}px;${i ? `margin-left:${gap}px;` : ""}font-size:16px"><div class="colpad">${c}</div></div>`).join("")}<!--[if mso]></td></tr></table><![endif]--></div>`;
}

function button(txt, u, a) {
  // Table buttons (Zoho's Outlook guidance): the colour and padding sit on the cell, the link inside it, no VML.
  // In Outlook only the label is clickable; everywhere else the whole button is.
  const sec = a.cls.includes("secondary");
  const cell = sec ? `border:1.5px solid ${L.accent};border-radius:${R}px;padding:12px 22px` : `background:${L.button};border-radius:${R}px;padding:14px 26px`;
  const col = sec ? L.accent : L.buttonText;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="${sec ? "bdr" : "btn"}"${sec ? "" : ` bgcolor="${L.button}"`} style="${cell}"><a href="${href(u)}" class="${sec ? "lk" : "btnl"}" style="display:inline-block;font-family:${F.sans};font-size:16px;line-height:20px;font-weight:600;color:${col};text-decoration:none">${inl(txt)}</a></td></tr></table>`;
}

let buttons = 0, lastKind = "", headerDone = false;
const text = [];   // plain-text part
const kinds = [];  // block kinds in order, for the brand divider's placement rules

function logoHtml(width = B.logo.width) {
  return img({ src: BR.asset("prism-asset-logo"), dark: BR.has("prism-asset-logo-on-dark") ? BR.asset("prism-asset-logo-on-dark") : null, alt: BR.name, width, halo: L.card, link: meta["logo-link"] });
}

function header(b) {
  const lines = b ? chunks(inner(b)) : [];
  const ey = lines.find(l => /\{\.eyebrow\}/.test(l)), h = lines.find(l => /^#\s/.test(l)), rest = lines.filter(l => l !== ey && l !== h);
  const issue = meta.issue ? p(inl(meta.issue), font("mono", 12, 16, 400, L.muted, "tm")) : "";
  if (ey) text.push(plain(ey).toUpperCase()); if (h) text.push(plain(h.replace(/^#\s+/, "")), "");
  for (const r of rest) text.push(plain(r), "");
  if (template === "letter") {
    return row(logoHtml(132), `32px ${P}px 28px`) + (h ? row(heading(1, h.replace(/^#\s+/, "")), `0 ${P}px 18px`) : "") + rest.map(r => row(p(inl(r)))).join("");
  }
  if (template === "newsletter") {
    const top = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle">${logoHtml(148)}</td><td align="right" valign="middle">${issue}</td></tr></table>`;
    return `<tr><td class="px hr" style="padding:26px ${P}px 22px;border-bottom:1px solid ${L.hair}">${top}</td></tr>` +
      `<tr><td style="height:28px;line-height:28px;font-size:0">&nbsp;</td></tr>` +
      (ey ? row(eyebrow(ey), `0 ${P}px 0`) : "") + (h ? row(heading(1, h.replace(/^#\s+/, "")), `0 ${P}px 16px`) : "") + rest.map(r => row(p(inl(r), font("sans", 17, 26)))).join("");
  }
  // announcement: a tinted band with the logo, eyebrow, headline and an optional standfirst.
  const bandInner = `${logoHtml()}${spacer(30)}${ey ? eyebrow(ey, true) : ""}${h ? heading(1, h.replace(/^#\s+/, "")) : ""}${rest.map(r => `${spacer(14)}${p(inl(r), font("sans", 17, 26))}`).join("")}`;
  return `<tr><td class="px bt" bgcolor="${L.tint}" style="background:${L.tint};border-radius:${R}px ${R}px 0 0;padding:30px ${P}px 34px">${bandInner}</td></tr><tr><td style="height:30px;line-height:30px;font-size:0">&nbsp;</td></tr>`;
}

function render(b) {
  const first = b.split("\n")[0];
  let m;
  if (/^#{1,4}\s/.test(first) && !b.includes("\n")) {
    const lvl = first.match(/^#+/)[0].length; text.push("", (lvl <= 2 ? plain(first.replace(/^#+\s+/, "")).toUpperCase() : plain(first.replace(/^#+\s+/, ""))), "");
    kinds.push("heading");
    return row(heading(lvl, first.replace(/^#+\s+/, "")), `${lvl === 2 ? 14 : 4}px ${P}px ${lvl === 4 ? 8 : 12}px`);
  }
  if ((m = /^:{3,}\s*\{?\s*\.?([\w-]+)([^}]*)\}?\s*$/.exec(first))) {
    // A brand component takes the core block it is like (an email can't carry the brand's CSS); its own class stays for the record.
    const like = BR.likeOf(...(first.match(/\.([\w-]+)/g) || []).map(k => k.slice(1)), m[1]);
    const cls = like && ["stats", "features", "cards", "media", "callout"].includes(like) ? like : m[1], a = attrs(first), x = inner(b);
    // Like a block email draws from its content (a quote, the closing card, a band): its content, drawn as usual.
    if (like && cls !== like) { kinds.push(like); return chunks(x).map(render).join(""); }
    kinds.push(cls);
    if (cls === "header") return "";
    if (cls === "ornament" || cls === "divider") { text.push("", "-----", ""); return row(B.divider.kind === "ornament" && cls === "ornament" ? divider() : rule(), `10px ${P}px 26px`); }
    if (cls === "stats") {
      const its = items(x).slice(0, 3), gap = 16, w = Math.floor((IN - gap * (its.length - 1)) / its.length);
      return row(columns(its.map(it => { const s = /^\*\*([^*]+)\*\*\s*(.*)$/.exec(it) || [, it, ""]; text.push(`${plain(s[1])}: ${plain(s[2])}`);
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="bda" style="${ORNE.stat_rule ? `border-top:2px solid ${L.accentFill};` : ""}padding:12px 0 6px">${p(inl(s[1]), font("serif", 32, 38, 500, L.accent, "ac"))}${p(inl(s[2]), font("sans", 14, 20), 0)}</td></tr></table>`; }), its.map(() => w), gap), `4px ${P}px 22px`);
    }
    if (cls === "features") {
      return row(items(x).map(it => { const ic = /\.ph-(?!light\b)([a-z0-9-]+)/.exec(it), s = /\*\*([^*]+)\*\*\s*(.*)$/.exec(it.replace(/\[\]\{[^}]*\}\s*/, "")) || [, "", it];
        text.push(`- ${plain(s[1])}${s[1] ? ": " : ""}${plain(s[2])}`);
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px"><tr>${ic ? `<td width="44" valign="top" style="padding-top:2px">${icon(ic[1])}</td>` : ""}<td valign="top">${s[1] ? p(inl(s[1]), font("sans", 16, 22, 600, L.ink, "tx")) : ""}${p(inl(s[2]), font("sans", 15, 23))}</td></tr></table>`; }).join("") + (text.push(""), ""), `0 ${P}px 10px`);
    }
    if (cls === "cards") {
      const its = items(x), w = Math.floor((IN - 16) / 2);
      const cells = its.map(it => { const im = /!\[([^\]]*)\]\(([^)\s]+)\)(\{[^}]*\})?/.exec(it), rest = it.replace(/!\[[^\]]*\]\([^)\s]+\)(\{[^}]*\})?\s*/, "");
        const lk = /\[([^\]]+)\]\(([^)\s]+)\)\s*$/.exec(rest), s = /^\*\*([^*]+)\*\*\s*(.*)$/.exec(lk ? rest.slice(0, lk.index).trim() : rest) || [, "", rest];
        text.push("", plain(s[1]), plain(s[2]) + (lk ? `\n${plain(lk[1])}: ${restore(lk[2])}` : ""));
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bc hr" style="background:${L.card};border:1px solid ${L.hair};border-radius:${R}px;margin:0 0 16px"><tr><td style="padding:0">${im ? img({ src: im[2], dark: attrs(im[3]).dark, alt: im[1], width: w, link: lk && lk[2], style: `border-radius:${R}px ${R}px 0 0` }) : ""}</td></tr><tr><td style="padding:16px 18px 18px">${s[1] ? p(inl(s[1], { heading: true }), font("sans", 17, 23, 600, L.ink, "tx"), 6) : ""}${p(inl(s[2]), font("sans", 15, 22), lk ? 10 : 0)}${lk ? p(`<a href="${href(lk[2])}" class="lk" style="color:${L.accent};font-weight:600;text-decoration:none">${inl(lk[1])} &rarr;</a>`, font("sans", 15, 20, 600, L.accent, "ac")) : ""}</td></tr></table>`; });
      const pairs = []; for (let i = 0; i < cells.length; i += 2) pairs.push(columns(cells.slice(i, i + 2), cells.slice(i, i + 2).map(() => w)));
      return row(pairs.join(""), `0 ${P}px 6px`);
    }
    if (cls === "media") {
      const im = /!\[([^\]]*)\]\(([^)\s]+)\)(\{[^}]*\})?/.exec(x), rest = chunks(x.replace(im ? im[0] : "", "").trim());
      const wi = 216, wt = IN - wi - 20;
      const txt = rest.map(r => /^#{2,4}\s/.test(r) ? heading(3, r.replace(/^#+\s+/, ""), 8) : /\{\.button/.test(r) ? `${spacer(6)}${(() => { const k = /\[([^\]]+)\]\(([^)\s]+)\)(\{[^}]*\})/.exec(r); return button(k[1], k[2], attrs(k[3])); })()}` : p(inl(r), font("sans", 15, 23), 10)).join("");
      for (const r of rest) text.push(plain(r.replace(/^#+\s+/, "")));
      text.push("");
      const pic = im ? img({ src: im[2], dark: attrs(im[3]).dark, alt: im[1], width: wi, style: `border-radius:${R}px` }) : "";
      return row(columns(a.cls.includes("flip") ? [txt, pic] : [pic, txt], a.cls.includes("flip") ? [wt, wi] : [wi, wt], 20), `6px ${P}px 22px`);
    }
    if (cls === "callout") {
      const parts = chunks(x).map(r => /^#{2,4}\s/.test(r) ? heading(4, r.replace(/^#+\s+/, ""), 8, true) : p(inl(r), font("sans", 15, 23), 8)).join("");
      for (const r of chunks(x)) text.push(plain(r.replace(/^#+\s+/, "")));
      text.push("");
      return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="bt" bgcolor="${L.tint}" style="background:${L.tint};border-radius:${R}px;padding:20px 22px 12px">${parts}</td></tr></table>`, `4px ${P}px 22px`);
    }
    if (cls === "signature") {
      const im = /!\[([^\]]*)\]\(([^)\s]+)\)(\{[^}]*\})?/.exec(x), ls = paras(x.replace(im ? im[0] : "", "").trim());
      for (const r of ls) text.push(plain(r));
      const t = ls.map((r, i) => p(inl(r), i ? font("sans", 14, 20, 400, L.muted, "tm") : font("sans", 16, 22, 600, L.ink, "tx"))).join("");
      return row(`<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${im ? `<td width="68" valign="middle">${img({ src: im[2], alt: im[1], width: 56, square: true, style: "border-radius:28px" })}</td>` : ""}<td valign="middle">${t}</td></tr></table>`, `8px ${P}px 26px`);
    }
    if (cls === "footer") { footer = x; kinds.pop(); return ""; }
    say(`unknown block ::: ${cls}; drawn as plain text`);
    return chunks(x).map(render).join("");
  }
  if (/^>/.test(first)) {
    const q = b.split("\n").map(l => l.replace(/^>\s?/, "")).join("\n"), ps = paras(q), cite = ps.find(t => /\{\.cite\}/.test(t));
    kinds.push("quote");
    for (const t of ps) text.push(t === cite ? "  " + plain(t) : `"${plain(t)}"`);
    text.push("");
    return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="bda" style="${ORNE.quote_bar ? `border-left:3px solid ${L.accentFill};padding:2px 0 2px 20px` : "padding:2px 0"}">${ps.filter(t => t !== cite).map(t => p(inl(t), font("serif", 20, 29, 400, L.ink, "tx"), 10)).join("")}${cite ? p(inl(cite), { s: `font-family:${F.mono};font-size:12px;line-height:16px;letter-spacing:1px;text-transform:uppercase;color:${L.muted}`, cls: "tm" }) : ""}</td></tr></table>`, `6px ${P}px 24px`);
  }
  if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)(\{[^}]*\})?\s*$/.exec(b))) {
    const a = attrs(m[3]), hero = a.cls.includes("hero");
    kinds.push(a.person === "true" || a.cls.includes("person") ? "photo-person" : "image");
    const pic = img({ src: m[2], dark: a.dark, alt: m[1], width: hero ? W : IN, link: a.href, style: hero ? "" : `border-radius:${R}px` });
    return hero ? `<tr><td style="padding:0 0 26px">${pic}</td></tr>` : row(pic, `4px ${P}px 22px`);
  }
  if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)(\{[^}]*\.button[^}]*\})\s*$/.exec(b))) {
    const a = attrs(m[3]); if (!a.cls.includes("secondary")) buttons++;
    kinds.push("button"); text.push(`${plain(m[1])}: ${restore(m[2])}`, "");
    return row(button(m[1], m[2], a), `6px ${P}px 26px`);
  }
  if (/^\s*(-|\d+\.)\s/.test(first)) {
    const num = /^\s*\d+\./.test(first); kinds.push("list");
    return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items(b).map((it, i) => { text.push(`${num ? i + 1 + "." : "-"} ${plain(it)}`);
      return `<tr><td width="22" valign="top" class="${num ? "ac" : "tb"}" style="font-family:${F.sans};font-size:16px;line-height:25px;color:${num ? L.accent : L.body};${num ? "font-weight:600" : ""}">${num ? i + 1 + "." : "&bull;"}</td><td valign="top" style="padding:0 0 6px">${p(inl(it))}</td></tr>`; }).join("")}</table>`, `0 ${P}px 16px`) + (text.push(""), "");
  }
  if (/^---+\s*$/.test(b)) { kinds.push("divider"); text.push("", "-----", ""); return row(rule(), `10px ${P}px 26px`); }
  kinds.push("text"); text.push(plain(b.replace(/\n/g, " ")), "");
  return row(p(inl(b.replace(/\n/g, " "))));
}

// ---------- assemble ----------
let footer = "";
const blocks = chunks(body);
const hb = blocks.find(b => /^:{3,}\s*\{?\s*\.?header\b/.test(b));
const subject = meta.subject ? restore(meta.subject) : (say("no subject in the front matter"), "");
const pre = meta.preheader ? restore(meta.preheader) : "";
text.push(...[]);
const rows = [header(hb), ...blocks.map(render)].join("\n");
text.unshift(...[]);
const footRows = footer ? paras(footer).map(t => { text.push(plain(t)); return p(inl(t), font("sans", 12, 18, 400, L.muted, "tm"), 8); }).join("") : "";
if (meta.note) text.push("", plain(meta.note));

// Brand checks the layout can catch.
// Palette checks (D8) are not run here: the brand's palette is checked when its design system and profile are made (run.sh palette <brand>).
// The brand's rule never sits beside these (profile generator rules), in this builder's block names.
const BESIDE = { "person-photo": "photo-person", "person-name": "signature", quote: "quote", signature: "signature" };
const ORN_RULES = (BR.res.roles["prism-generator-rule"] || { value: { rules: [] } }).value.rules || [];
const notBeside = [...new Set(ORN_RULES.filter(r => r.never === "beside").flatMap(r => r.of).map(x => BESIDE[x]).filter(Boolean))];
kinds.forEach((k, i) => { if (k === "ornament" && notBeside.some(x => kinds[i - 1] === x || kinds[i + 1] === x)) say("brand divider next to a person's photo, quote or signature: use a plain rule (---) there"); });
if (buttons > 2) say(`${buttons} primary buttons: an email should have one clear call to action (make the rest .secondary or links)`);
if (subject.length > 70) say(`subject is ${subject.length} characters; most inboxes show about 40 to 60`);
if (!pre) say("no preheader: inboxes will show the first line of the email instead");
else if (pre.length > 110) say(`preheader is ${pre.length} characters; keep it under about 100`);
if (!base) say("no image-base: images use relative paths (fine for a zip import; set image-base to the hosting folder for pasting the HTML)");
if (meta.note && !/illustrative|fictional|example/i.test(meta.note + body)) {}

const css = `
${dualScheme ? ":root{color-scheme:light dark;supported-color-schemes:light dark}" : ":root{color-scheme:light only;supported-color-schemes:light}"}
body{margin:0!important;padding:0!important;width:100%!important}
a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
.d{display:none;max-height:0;overflow:hidden}
@media (max-width:620px){.w{width:100%!important}.px{padding-left:20px!important;padding-right:20px!important}.col{max-width:100%!important;display:block!important;margin-left:0!important}.colpad{padding-bottom:12px!important}.fl{width:100%!important}.h1{font-size:28px!important;line-height:34px!important}}
${dualScheme ? "" : "/*"}@media (prefers-color-scheme:dark){
.bg{background:${D.page}!important}.bc{background:${D.card}!important}.bt{background:${D.tint}!important}
.tx{color:${D.ink}!important}.tb{color:${D.body}!important}.tm{color:${D.muted}!important}.ac,.lk{color:${D.accent}!important}
.hr{border-color:${D.hair}!important}.bda{border-color:${D.accentFill}!important}.bdr{border-color:${D.accent}!important}.btn{background:${D.button}!important}.btnl{color:${D.buttonText}!important}
.l{display:none!important}.d{display:block!important;max-height:none!important}}
${B.outlookOverrides ? "" : "/*"}[data-ogsb] .bg{background:${D.page}!important}[data-ogsb] .bc{background:${D.card}!important}[data-ogsb] .bt{background:${D.tint}!important}
[data-ogsc] .tx{color:${D.ink}!important}[data-ogsc] .tb{color:${D.body}!important}[data-ogsc] .tm{color:${D.muted}!important}[data-ogsc] .ac,[data-ogsc] .lk{color:${D.accent}!important}${dualScheme && B.outlookOverrides ? "" : "*/"}`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n+/g, "\n").trim();

const boxed = template !== "letter";
const shell = (content) => `<!DOCTYPE html>
<html lang="${meta.lang || "en"}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="${dualScheme ? "light dark" : "light only"}">
<meta name="supported-color-schemes" content="${dualScheme ? "light dark" : "light"}">
<title>${esc(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,p,a,li,span,strong{font-family:${F.msoSans}!important}h1,h2{font-family:${F.msoSerif}!important}</style><![endif]-->
${meta.webfonts === "false" || !F.webfonts ? "" : `<!--[if !mso]><!--><link href="${F.webfonts}" rel="stylesheet"><!--<![endif]-->\n`}<style>
${css}
</style>
</head>
<body class="${boxed ? "bg" : "bc"}" style="margin:0;padding:0;background:${boxed ? L.page : L.card}">
${pre ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${L.page}">${esc(pre)}${"&#8199;&#65279;&#847;".repeat(40)}</div>\n` : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="${boxed ? "bg" : "bc"}" bgcolor="${boxed ? L.page : L.card}" style="background:${boxed ? L.page : L.card}">
<tr><td align="center" style="padding:${boxed ? "24px 12px" : "0"}">
<!--[if mso]><table role="presentation" width="${W}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="w bc hr" bgcolor="${L.card}" style="max-width:${W}px;background:${L.card}${boxed ? `;border:1px solid ${L.hair};border-radius:${R}px` : ""}"${boxed ? ' data-card=""' : ""}>
${content}
<tr><td style="height:12px;line-height:12px;font-size:0">&nbsp;</td></tr>
</table>
${footRows || meta.note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="w" style="max-width:${W}px"><tr><td class="px" align="${boxed ? "center" : "left"}" style="padding:22px ${P}px 8px">${footRows}${meta.note ? p(inl(meta.note), font("mono", 11, 16, 400, L.muted, "tm")) : ""}</td></tr></table>` : ""}
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
`;

(async () => {
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"], ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-email-"));
  const gen = {};
  // Divider: the brand's ornament (ornaments.js divider), centred in the content width, in the light and dark theme.
  if (genJobs.dividers) {
    const DH = B.divider.height;
    const page = await browser.newPage({ viewport: { width: IN, height: DH }, deviceScaleFactor: 2 });
    for (const tone of ["light", "dark"]) {
      await page.setContent(`<body style="margin:0;background:transparent">${ORN.divider({ width: IN, theme: tone }, BR)}</body>`);
      const f = path.join(tmp, `divider-${tone}.png`); await (await page.$("svg")).screenshot({ path: f, omitBackground: true });
      gen["divider-" + tone] = f;
    }
    await page.close();
  }
  if (genJobs.icons.size) {
    const page = await browser.newPage({ viewport: { width: 200, height: 200 }, deviceScaleFactor: 2 });
    const cssUrl = "file://" + B.iconFont;
    for (const n of genJobs.icons) for (const tone of ["light", "dark"]) {
      const hf = path.join(tmp, "icon.html");
      fs.writeFileSync(hf, `<!doctype html><link rel="stylesheet" href="${cssUrl}"><body style="margin:0;background:transparent"><i class="${B.iconClass} ph-${n}" style="font-size:28px;display:inline-block;width:28px;height:28px;color:${({ light: L, dark: D })[tone].accent}"></i></body>`);
      await page.goto("file://" + hf, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const ok = await page.evaluate(() => getComputedStyle(document.querySelector("i"), "::before").content !== "none");
      if (!ok) { say(`unknown icon: ${n}`); continue; }
      const f = path.join(tmp, `icon-${n}-${tone}.png`); await (await page.$("i")).screenshot({ path: f, omitBackground: true });
      gen[`icon-${n}-${tone}`] = f;
    }
    await page.close();
  }

  // Resize and compress every image, then swap the placeholders for <img> tags. SVG brand assets are drawn to PNG first.
  const list = [...imgIndex.entries()];
  for (const [, v] of list) if (/\.svg$/i.test(v.abs)) v.abs = await BR.raster(v.abs, v.width * 2);
  const jobsFile = path.join(tmp, "jobs.json");
  fs.writeFileSync(jobsFile, JSON.stringify(list.map(([k, v]) => ({ src: v.abs, out: path.join(outDir, "images", v.name + path.extname(v.abs)), width: v.width, halo: v.halo, square: !!v.square, focus: v.square ? BR.focus(v.abs) : null }))));
  const done = list.length ? JSON.parse(execFileSync("python3", [path.join(here, "email_assets.py"), jobsFile]).toString()) : [];
  const info = new Map(list.map(([k], i) => [k, done[i]]));
  for (const r of done) {
    const v = list.find(([k]) => info.get(k) === r)[1];
    if (r.srcW < v.width * 1.5) say(`low resolution: ${path.basename(v.abs)} is ${r.srcW}px wide for a ${v.width}px slot (aim for ${v.width * 2}px)`);
    if (r.kb > 250) say(`large image: ${path.basename(r.out)} is ${r.kb} KB after compression`);
    if (r.animated) say(`animated GIF ${path.basename(r.out)}: Outlook shows only the first frame, so the first frame must carry the message`);
  }
  const url = f => base ? base + path.basename(f) : "images/" + path.basename(f);
  const genImg = (name, w, h, alt) => {
    const out = {};
    for (const tone of ["light", "dark"]) { const f = gen[`${name}-${tone}`]; if (!f) return ""; const dst = path.join(outDir, "images", `${TAG}-${path.basename(f)}`); fs.copyFileSync(f, dst); out[tone] = dst; }
    const tag = (f, c, st) => `<img class="${c}" src="${url(f)}" width="${w}" height="${h}" alt="${alt}" style="display:block;width:${w}px;height:${h}px;border:0${st}">`;
    if (!dualScheme) { fs.unlinkSync(out.dark); return tag(out.light, "", ""); }
    return tag(out.light, "l", "") + `<!--[if !mso]><!-->${tag(out.dark, "d", ";display:none;max-height:0;overflow:hidden;mso-hide:all")}<!--<![endif]-->`;
  };
  const fill = html => html.replace(/\uE010(.*?)\uE011/g, (m, j) => {
    const o = JSON.parse(j);
    if (o.gen === "divider") return genImg("divider", IN, B.divider.height, "");
    if (o.gen === "icon") return genImg(`icon-${o.n}`, 28, 28, "");
    const a = o.a && info.get(o.a); if (!a) return "";
    const h = Math.round(o.width * a.h / a.w);
    const tag = (r, c, st) => `<img class="${[c, o.width >= 200 ? "fl" : ""].filter(Boolean).join(" ")}" src="${url(r.out)}" width="${o.width}" height="${Math.round(o.width * r.h / r.w)}" alt="${esc(restore(o.alt))}" style="display:block;width:${o.width}px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none${o.style ? ";" + o.style : ""}${st}">`;
    const d = o.d && info.get(o.d);
    let t = tag(a, d ? "l" : "", "") + (d ? `<!--[if !mso]><!-->${tag(d, "d", ";display:none;max-height:0;overflow:hidden;mso-hide:all")}<!--<![endif]-->` : "");
    if (o.link) t = `<a href="${href(o.link)}" style="text-decoration:none">${t}</a>`;
    return t;
  });
  let html = restore(fill(shell(rows)));
  // Light only: keep just the classes the phone styles use (Outlook and Zoho both advise inline styles over classes).
  if (!dualScheme) html = html.replace(/ class="([^"]*)"/g, (m, c) => { const k = c.split(/\s+/).filter(x => ["px", "col", "colpad", "h1", "w", "fl"].includes(x)); return k.length ? ` class="${k.join(" ")}"` : ""; });
  html = html.replace(/ class=""/g, "").replace(/\n{2,}/g, "\n");
  // Outlook markup check (Zoho's Outlook guidance): flags anything the builder itself should never emit.
  const bodyHtml = html.slice(html.indexOf("<body"));
  const visible = bodyHtml.replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/g, "");
  for (const m of visible.matchAll(/<(div|p)\b[^>]*style="([^"]*)"/g)) if (/(^|;)\s*(padding|width|height)\s*:/.test(m[2]) && !/display:none/.test(m[2]) && !/display:inline-block/.test(m[2])) say(`Outlook: <${m[1]}> with padding, width or height (use a table cell): ${m[0].slice(0, 80)}`);
  for (const m of visible.matchAll(/<a\b[^>]*style="([^"]*)"/g)) if (/padding/.test(m[1]) && !/class="btn"/.test(m[0])) say(`Outlook: padding on a link is ignored: ${m[0].slice(0, 80)}`);
  for (const m of bodyHtml.matchAll(/<img\b[^>]*>/g)) { if (!/ width="\d+"/.test(m[0]) || !/style="[^"]*width:\d+px/.test(m[0])) say(`Outlook: image needs width as attribute and style: ${m[0].slice(0, 80)}`); if (/style="[^"]*(margin|padding)/.test(m[0])) say(`Outlook: image margin or padding is ignored: ${m[0].slice(0, 80)}`); }
  for (const m of bodyHtml.matchAll(/<(p|h[1-6]|td)\b[^>]*style="([^"]*font-size:(?!0)[^"]*)"/g)) if (!/line-height/.test(m[2])) say(`Outlook: text without a line-height: ${m[0].slice(0, 80)}`);
  if (/<button\b|float\s*:|position\s*:|background-image/.test(bodyHtml)) say("Outlook: <button>, float, position or a background image in the email");
  fs.writeFileSync(path.join(outDir, OUT.html), html);
  const txt = [subject && `Subject: ${subject}`, pre && `Preheader: ${pre}`, "", ...text].filter(x => x !== false).join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  fs.writeFileSync(path.join(outDir, OUT.txt), txt);
  const kb = Buffer.byteLength(html) / 1024;
  if (kb > 100) say(`${OUT.html} is ${kb.toFixed(0)} KB; Gmail clips messages over 102 KB`);
  const imgKb = fs.readdirSync(path.join(outDir, "images")).reduce((s, f) => s + fs.statSync(path.join(outDir, "images", f)).size, 0) / 1024;

  // Previews: desktop and phone, light and dark, from a copy that loads the local images.
  const local = path.join(outDir, ".preview.html");
  // The cuts the email uses, from the brand's font roles; the mono is requested at 400, so its one file is declared there.
  const cut = (r, w) => { const f = BR.role(r).files; return (f.find(x => +x.weight === w) || f[0]).path; };
  const ff = (fam, file, w) => `@font-face{font-family:${fam};src:url("file://${file}");font-weight:${w}}`;
  const sans = BR.role("prism-font-sans").files[0].family, serif = BR.role("prism-font-serif").files[0].family, mono = BR.role("prism-font-mono").files[0].family;
  const faces = `<style>${ff(sans, cut("prism-font-sans", 400), 400)}${ff(sans, cut("prism-font-sans", 600), 600)}${ff(serif, cut("prism-font-serif", 400), 400)}${ff(serif, cut("prism-font-serif", 500), 500)}${ff(`'${mono}'`, cut("prism-font-mono", 500), 400)}</style>`;
  fs.writeFileSync(local, (base ? html.split(base).join("images/") : html).replace("</head>", faces + "</head>"));
  const shots = [];
  const simFile = path.join(outDir, ".preview-outlook.html");
  if (B.outlookSim) fs.writeFileSync(simFile, require("./outlook-sim.js").simulate(fs.readFileSync(local, "utf8")).replace("</head>", faces + "</head>"));
  const views = [[680, "light"], [680, "dark"], [390, "light"], [390, "dark"]].concat(B.outlookSim ? [[680, "outlook"]] : []);
  for (const [w, scheme] of views) {
    const pg = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme === "outlook" ? "light" : scheme });
    await pg.goto("file://" + (scheme === "outlook" ? simFile : local), { waitUntil: "load" });
    await pg.evaluate(() => document.fonts.ready);
    const miss = await pg.evaluate(() => [...document.images].filter(i => i.style.display !== "none" && getComputedStyle(i).display !== "none" && !i.naturalWidth).map(i => i.getAttribute("src")));
    for (const s of miss) say(`image did not load in the preview: ${s}`);
    const f = path.join(tmp, `shot-${w}-${scheme}.png`); await pg.screenshot({ path: f, fullPage: true }); shots.push({ f, w, scheme }); await pg.close();
  }
  const sheet = await browser.newPage({ viewport: { width: 3020, height: 800 } });
  const sf = path.join(tmp, "sheet.html");
  fs.writeFileSync(sf, `<!doctype html><body style="margin:0;padding:28px;background:#E4E2DA;font:600 15px system-ui,sans-serif;color:#333333;display:flex;gap:28px;align-items:flex-start">${shots.map(s =>
    `<figure style="margin:0"><figcaption style="margin:0 0 10px">${s.scheme === "outlook" ? "Outlook dark (simulated)" : `${s.w === 680 ? "Desktop" : "Phone"} · ${s.scheme}`}</figcaption><img src="file://${s.f}" style="display:block;width:${s.w}px;box-shadow:0 1px 6px rgba(0,0,0,.18)"></figure>`).join("")}</body>`);
  await sheet.goto("file://" + sf, { waitUntil: "load" });
  await sheet.screenshot({ path: path.join(outDir, OUT.preview), fullPage: true });
  await browser.close();
  fs.unlinkSync(local); if (fs.existsSync(simFile)) fs.unlinkSync(simFile);
  fs.rmSync(tmp, { recursive: true, force: true });

  // Zip for an ESP import (Zoho Campaigns and most others accept HTML plus an images folder).
  // Zoho Campaigns takes the HTML on its own and a zip of the images (and any stylesheet) beside it.
  try { execFileSync("zip", ["-qr", OUT.zip, "images"], { cwd: outDir }); }
  catch { execFileSync("python3", ["-c", `import shutil;shutil.make_archive("${OUT.zip.replace(/\.zip$/, "")}","zip",".","images")`], { cwd: outDir }); }

  // Build stamp checked by verify.py: every file this build wrote.
  const sha = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name.startsWith(".") ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = walk(outDir);
  fs.writeFileSync(path.join(outDir, ".prism-build.json"), JSON.stringify({ kit: fs.readFileSync(path.join(here, "VERSION"), "utf8").trim(), format: "html-email", main: OUT.html,
    images: Object.fromEntries(files.filter(f => path.dirname(f) === outDir && f.endsWith(".png")).map(f => [path.basename(f), sha(f)])),
    files: Object.fromEntries(files.map(f => [path.relative(outDir, f), sha(f)])) }, null, 1));

  for (const w of [...new Set(warn)]) console.warn(`[email] ${w}`);
  const sc = shortcodesUsed();
  console.log(`wrote ${OUT.html} (${kb.toFixed(1)} KB, ${template}, ${dualScheme ? "light and dark" : "light only"}), ${OUT.txt}, ${done.length + Object.keys(gen).length} images (${imgKb.toFixed(0)} KB), ${OUT.zip} and ${OUT.preview} to ${outDir}`);
  if (sc.length) console.log(`shortcodes passed through: ${sc.join("  ")}`);
})();
