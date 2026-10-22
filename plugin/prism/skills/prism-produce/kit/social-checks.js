// In-page social fixes and checks a brand turns on in its profile (options.social). Each function runs inside the built page.

// A counter note ("02 / 07") is dropped, so nothing sits bottom right; other notes ("Swipe →", "Illustrative example") stay.
function dropCounters() {
  let n = 0;
  document.querySelectorAll(".post[data-note]").forEach(p => { if (/^\s*\d+\s*\/\s*\d+\s*$/.test(p.dataset.note)) { p.removeAttribute("data-note"); n++; } });
  return n;
}

// The point numbers on carousel panels ([01]{.num}) are dropped, with the paragraph they sit in when that holds nothing else.
function dropNumbers() {
  let n = 0;
  document.querySelectorAll(".carousel .post .num").forEach(e => {
    const p = e.parentElement;
    e.remove(); n++;
    if (p && p.matches("p") && !p.textContent.trim() && !p.children.length) p.remove();
  });
  return n;
}

// A purple post or panel takes the dark text roles; the brand layer gives it its own ground (core falls back to the accent).
function purpleAsDark() {
  document.querySelectorAll(".post.purple").forEach(p => p.classList.add("dark"));
}

// What each post or panel is made of, read before purpleAsDark so a purple ground is told apart from a dark one.
function summary() {
  const kind = el => el.matches(".num") || el.querySelector(":scope > .num") ? "num" : el.matches("h1, h2, h3") ? el.tagName.toLowerCase() :
    el.matches(".stats") ? "stats" : el.matches(".checks") ? "checks" : el.matches(".steps") ? "steps" : el.matches(".features") ? "cards" :
    el.matches("blockquote") ? "quote" : el.matches(".prism-chart, figure:has(.prism-chart)") ? "chart" : el.matches(".qr") ? "qr" :
    el.querySelector("img") ? "image" : el.matches(".eyebrow") || el.querySelector(":scope > .eyebrow") ? "eyebrow" : el.matches("ul, ol") ? "list" : "p";
  // Word count per text node, so words in neighbouring blocks never run together; the caption isn't in the graphic.
  const words = el => { let n = 0; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t; (t = w.nextNode());) if (!t.parentElement.closest(".caption")) n += (t.data.match(/\S+/g) || []).length; return n; };
  return [...document.querySelectorAll(".post")].map(p => {
    const car = p.closest(".carousel"), sig = [...p.children].filter(c => !c.matches(".caption")).map(kind);
    return { id: p.id || "", carousel: car ? (car.id || "carousel") : null, n: car ? [...car.querySelectorAll(".post")].indexOf(p) + 1 : 0,
      cover: p.classList.contains("cover"), end: p.classList.contains("end"), story: p.classList.contains("story"), email: p.classList.contains("email"),
      ground: p.classList.contains("purple") ? "purple" : p.classList.contains("dark") || p.classList.contains("photo-full") ? "dark" : "light",
      sig: sig.filter((k, i) => k !== sig[i - 1]).join("+"), words: words(p),
      photos: [...p.querySelectorAll("img")].filter(i => !i.closest(".qr__code")).map(i => i.getAttribute("src")),
      stats: [...p.querySelectorAll(".stats li > strong:first-child")].map(s => s.textContent.trim()) };
  });
}

// The checks, on that summary (plain data, so they also run outside a page). `on` lists which: words, layout, color, photo,
// stats (a carousel's stat figures no longer than `statChars` characters, spaces aside, so the big type never oversets).
function check(posts, on, statChars = 3) {
  const out = [], name = p => p.carousel ? `${p.carousel} panel ${p.n}` : `post ${p.id || "?"}`;
  const runs = (list, key, n) => { const hits = []; for (let i = n - 1; i < list.length; i++) if (list.slice(i - n + 1, i + 1).every(x => key(x) === key(list[i]))) hits.push(list.slice(i - n + 1, i + 1)); return hits; };
  const groups = [...new Set(posts.map(p => p.carousel))].map(c => ({ c, list: posts.filter(p => p.carousel === c && !p.email) }));
  if (on.includes("words")) for (const p of posts) {
    const max = p.story ? 35 : p.email ? 30 : 30;
    if (p.words > max) out.push(`words: ${name(p)} has ${p.words} words; keep one idea and cut to ${max} or fewer (a heading and one short sentence)`);
  }
  for (const { c, list } of groups) {
    const mid = c ? list.filter(p => !p.cover && !p.end) : list;
    if (on.includes("layout")) {
      if (c) for (let i = 1; i < mid.length; i++) { if (mid[i].sig === mid[i - 1].sig && mid[i].n === mid[i - 1].n + 1) out.push(`layout: ${c} panels ${mid[i - 1].n} and ${mid[i].n} have the same layout (${mid[i].sig}); give one of them another (stats, a list, steps, a quote)`); }
      else if (mid.length >= 3 && mid.every(p => p.sig === mid[0].sig)) out.push(`layout: all ${mid.length} posts have the same layout (${mid[0].sig}); vary them (a stat, a quote, a list)`);
    }
    if (on.includes("color")) {
      if (c && list.length >= 5 && mid.length && mid.every(p => p.ground === mid[0].ground)) out.push(`color: every middle panel of ${c} is on the ${mid[0].ground} ground; make one ${mid[0].ground === "light" ? "dark or purple" : "light"}`);
      else if (!c && mid.length >= 3 && mid.every(p => p.ground === mid[0].ground)) out.push(`color: all ${mid.length} posts are on the ${mid[0].ground} ground; mix in a ${mid[0].ground === "light" ? "dark or purple" : "light"} one`);
      for (const r of runs(mid, p => p.ground, 3)) if (!(c && mid.every(p => p.ground === mid[0].ground)) && !(!c && mid.length >= 3 && mid.every(p => p.ground === mid[0].ground))) out.push(`color: ${r.map(name).join(", ")} are three ${r[0].ground} grounds in a row; change the middle one`);
    }
    if (on.includes("photo")) {
      const withPhoto = list.filter(p => p.photos.length);
      for (const r of runs(list, p => p.photos.length > 0, 3)) if (r[0].photos.length) out.push(`photo: ${r.map(name).join(", ")} all lead with photos; give one of them a stat, quote or plain ground`);
      if (!c && list.length >= 4 && !withPhoto.length && posts.some(p => p.photos.length)) out.push(`photo: none of these ${list.length} posts has a photo; use one of the piece's photos on one`);
    }
  }
  if (on.includes("stats")) for (const p of posts) {
    if (!p.carousel) continue;
    for (const fig of p.stats || []) {
      const n = [...fig.replace(/\s+/g, "")].length;
      if (n > statChars) out.push(`stats: ${name(p)} has the figure "${fig}" (${n} characters); big figures take ${statChars} at most (41%, 9x, $2M): round it or move the unit into the label`);
    }
  }
  if (on.includes("photo")) {
    const seen = {};
    for (const p of posts) for (const src of new Set(p.photos.filter(s => !/placeholder/.test(s)))) (seen[src] = seen[src] || []).push(name(p));
    for (const [src, where] of Object.entries(seen)) if (where.length > 1) out.push(`photo: ${src.split("/").pop()} is used in ${where.join(" and ")}; use each photo once`);
  }
  return [...new Set(out)];
}

module.exports = { dropCounters, dropNumbers, purpleAsDark, summary, check };
