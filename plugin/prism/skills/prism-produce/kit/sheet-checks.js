// In-page sheet checks and fixes a brand turns on in its profile (options.sheet). Each runs inside the built page.

// A closing card whose QR block has no text of its own: the card's copy (eyebrow, heading, text) moves beside the code.
function qrBesideCopy() {
  document.querySelectorAll(".cta-card > .qr").forEach(q => {
    if (q.querySelector(".qr__text")) return;
    const card = q.parentElement, text = document.createElement("div");
    text.className = "qr__text";
    for (const c of [...card.children]) if (c !== q) text.appendChild(c);
    q.appendChild(text); card.classList.add("qr-beside");
  });
}

// One word alone on the last line of the title, a heading, a paragraph or a list item.
function orphans() {
  // Joins the last two words of an element with a non-breaking space; false when there is no space to join.
  const joinLastTwo = el => {
    const texts = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) texts.push(n);
    // The last space before the last word, across text nodes (the word may sit in its own *emphasis*).
    const all = texts.map(t => t.data).join(""), end = all.replace(/\s+$/, "").length, k = all.slice(0, end).search(/ [^ ]*$/);
    if (k < 0) return false;
    for (let i = 0, at = 0; i < texts.length; at += texts[i++].data.length)
      if (k < at + texts[i].data.length) { const t = texts[i], j = k - at; t.data = t.data.slice(0, j) + "\u00a0" + t.data.slice(j + 1); return true; }
    return false;
  };
  const out = [], r = document.createRange();
  const lastLine = el => {
    const words = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) if (!n.parentElement.closest("sup, .footnote-ref")) for (const m of n.data.matchAll(/[^\s]+/g)) {
      r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const b = r.getClientRects()[0]; if (b) words.push({ w: m[0], top: b.top });
    }
    if (!words.length) return null;
    const lines = [];
    for (const x of words) { const l = lines[lines.length - 1]; if (l && Math.abs(l.top - x.top) < 4) l.words.push(x.w); else lines.push({ top: x.top, words: [x.w] }); }
    return lines.length > 1 ? lines[lines.length - 1].words : null;
  };
  const sel = [".prism-mast h1", ...["main.prism-sheet", ".panel"].flatMap(r => ["h1", "h2", "h3", "p", "li"].map(t => `${r} ${t}`))].join(", ");
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest(".stats, .prism-chart, figure, .qr__code, .prism-postage")) continue;
    const last = lastLine(el);
    //   joins words on purpose (the writer's `\ `), so a pair joined that way is one line-end and never counts.
    if (!last || last.length > 1 || !/\w/.test(last[0])) continue;
    const start = el.textContent.trim().replace(/\s+/g, " ").slice(0, 40);
    // A title or heading is fixed in place: its last two words are joined, so the line breaks one word earlier.
    if (/^H[1-3]$/.test(el.tagName) && joinLastTwo(el)) {
      const again = lastLine(el);
      if (!again || again.length > 1) { out.push(`${el.tagName === "H1" ? "title" : "heading"} orphan fixed: "${start}" now keeps "${last[0]}" with the word before it`); continue; }
    }
    out.push(el.tagName === "H1" ? `title orphan: "${start}" ends with "${last[0]}" alone on its last line; join its last two words with \\ ` :
      `orphan: "${start}…" ends with "${last[0]}" alone on its last line; reword it or join its last two words with \\ `);
  }
  return out;
}

// Formats a sheet's sections use. Cards in any layout (1x2, 1x3, 1x4, 2x2) are one format, so a page of cards is not variety.
function variety() {
  const kind = el => el.matches(".stats") ? "stats" : el.matches(".features") ? "cards" : el.matches(".flow") ? "flow" :
    el.matches("ol, ul") ? "list" : el.matches("blockquote") ? "quote" : el.matches(".prism-chart, figure:has(.prism-chart)") ? "chart" :
    el.matches("table") ? "table" : el.matches(".callout") ? "callout" : el.matches(".band") ? "band" : el.matches(".cols") ? "columns" :
    el.matches(".checks") ? "checklist" : el.matches(".media, .gallery, figure, .hero-image") ? "image" : null;
  const sections = [];
  // A sheet's blocks; a brochure's inside spread (its last), panel by panel: flap, back and cover have fixed shapes.
  const spreads = document.querySelectorAll(".spread"), inside = spreads[spreads.length - 1];
  const blocks = inside ? inside.querySelectorAll(".panel > *, .panel > .col > *") : document.querySelectorAll("main.prism-sheet > *");
  for (const el of blocks) {
    if (el.matches("h2")) { sections.push({ name: el.textContent.trim(), kinds: [] }); continue; }
    if (!sections.length || el.matches(".cta-card, hr")) continue;
    const k = kind(el); if (k) sections[sections.length - 1].kinds.push(k);
  }
  const out = [], used = new Set(sections.flatMap(s => s.kinds));
  const cards = sections.filter(s => s.kinds.includes("cards"));
  if (cards.length > 2) out.push(`variety: ${cards.length} sections use cards (${cards.map(s => `"${s.name}"`).join(", ")}); keep cards to two at most and show the rest another way (a list, stats, a quote, a table, columns)`);
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1].kinds[0], b = sections[i].kinds[0];
    if (a && a === b) out.push(`variety: "${sections[i - 1].name}" and "${sections[i].name}" both lead with ${a} back to back; give one of them another format`);
  }
  if (sections.length >= 3 && used.size < 3) out.push(`variety: ${sections.length} sections share ${used.size || "no"} format${used.size === 1 ? "" : "s"} (${[...used].join(", ") || "text only"}); mix in others (stats, cards, a list, a quote, a chart or table)`);
  return out;
}

module.exports = { qrBesideCopy, orphans, variety };
