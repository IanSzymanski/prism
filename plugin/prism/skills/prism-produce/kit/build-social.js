#!/usr/bin/env node
// Markdown -> social images (PNG) in the document's brand, plus a captions file. Usage: node build-social.js posts.md [outdir]
const { execFileSync } = require("child_process");
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright");

const here = __dirname;
const md = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : path.join(path.dirname(md), path.basename(md, ".md")));
// Exported files carry the piece tag (slug, output, version) so posts from different pieces never mix.
const { tagFor, named } = require("./naming.js");
const TAG = tagFor(md);
const B = require("./brand.js")(md);
// Each carousel's geometry, measured in the page: the brand's ornaments draw its thread from this (none if the brand has no thread).
function carouselGeometry() {
  return [...document.querySelectorAll(".carousel")].map(car => {
    const panels = [...car.querySelectorAll(".post")];
    const dark = panels.find(p => p.classList.contains("dark"));
    return { W: car.offsetWidth, H: car.offsetHeight, darkLeft: dark ? dark.offsetLeft : null,
      panels: panels.map((p, i) => ({ n: i + 1, left: p.offsetLeft, width: p.offsetWidth, burst: parseFloat(p.dataset.burst || 0.5), dark: p.classList.contains("dark") })) };
  });
}
// Lists text in a story that falls outside its safe area (top, bottom and side margins from the story CSS).
function storyCheck(post) {
  const cs = getComputedStyle(post), box = post.getBoundingClientRect();
  const top = box.top + parseFloat(cs.getPropertyValue("--safe-top")), bottom = box.bottom - parseFloat(cs.getPropertyValue("--safe-bottom"));
  const left = box.left + parseFloat(cs.getPropertyValue("--side")) - 1, right = box.right - parseFloat(cs.getPropertyValue("--side")) + 1;
  const out = [];
  // Where the logo (::before) and note (::after) sit, so text can't run into them either.
  const marks = ["::before", "::after"].map(ps => {
    const p = getComputedStyle(post, ps);
    if (p.content === "none" || p.display === "none") return null;
    const h = parseFloat(p.height) || 30, y = p.top !== "auto" ? box.top + parseFloat(p.top) : box.bottom - parseFloat(p.bottom) - h;
    const w = parseFloat(p.width) || 120, x = p.left !== "auto" ? box.left + parseFloat(p.left) : box.right - parseFloat(p.right) - w;
    return { ps, x, y, w, h };
  }).filter(Boolean);
  const walker = document.createTreeWalker(post, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    if (!n.textContent.trim() || n.parentElement.closest(".caption")) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const b of r.getClientRects()) {
      if (b.top < top - 1 || b.bottom > bottom + 1 || b.left < left || b.right > right) {
        out.push(`"${n.textContent.trim().slice(0, 40)}" is outside the safe area; shorten the text or move it`); break;
      }
      const hit = marks.find(m => b.left < m.x + m.w && b.right > m.x && b.top < m.y + m.h && b.bottom > m.y);
      if (hit) { out.push(`"${n.textContent.trim().slice(0, 40)}" runs into the ${hit.ps === "::before" ? "logo" : "note"}; shorten the text`); break; }
    }
  }
  for (const m of marks) if (m.y < top - 1 || m.y + m.h > bottom + 1) out.push(`the ${m.ps === "::before" ? "logo" : "note"} is outside the safe area`);
  return [...new Set(out)];
}
const html = md.replace(/\.md$/, ".social.html");
fs.mkdirSync(outDir, { recursive: true });

execFileSync("pandoc", [md, "-s", "--template", path.join(here, "prism-social.html"),
  "--css", "file://" + B.icons.css,
  "--css", "file://" + B.css, "--css", "file://" + B.stylesheet(path.join(here, "prism-sheet.css")),
  "--css", "file://" + B.stylesheet(path.join(here, "prism-social.css")),
  ...[B.layer("sheet"), B.layer("social")].filter(Boolean).flatMap(f => ["--css", "file://" + f]),
  "--lua-filter", path.join(here, "prism-sheet.lua"), "--lua-filter", path.join(here, "prism-charts.lua"),
  "--wrap=none", "--resource-path", path.dirname(md), "-o", html], { env: B.env() });

(async () => {
  const browser = await chromium.launch({ ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
  const page = await browser.newPage({ viewport: { width: 8000, height: 1500 }, deviceScaleFactor: 1 });
  await page.goto("file://" + html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (await page.$(".carousel")) {
    if (B.ornaments.thread) {
      const svgs = (await page.evaluate(carouselGeometry)).map(g => B.ornaments.thread(g, B));
      await page.evaluate(svgs => document.querySelectorAll(".carousel").forEach((c, i) => svgs[i] && c.insertAdjacentHTML("beforeend", svgs[i])), svgs);
    }
  }
  const posts = await page.$$(".post");
  let captions = "# Post copy\n\nPaste each section with the image of the same name.\n\n";
  const missing = [], unsafe = [];
  // Caption blocks to plain text, keeping list items as "- " lines so hashtags and lists paste cleanly.
  await page.evaluate(() => {
    window.capText = c => [...c.children].map(b => /^(UL|OL)$/.test(b.tagName)
      ? [...b.children].map(li => "- " + li.textContent.trim()).join("\n") : b.textContent.trim()).filter(Boolean).join("\n\n");
  });
  // Caption text: inside the post, or (a common slip) the block right after it. Carousel panels share the carousel's caption.
  const readCaption = el => el.evaluate(e => {
    const c = e.querySelector(".caption") || (e.nextElementSibling?.classList.contains("caption") && !e.closest(".carousel") ? e.nextElementSibling : null);
    return c ? window.capText(c) : "";
  });
  for (const [i, el] of posts.entries()) {
    const car = await el.evaluate(e => { const c = e.closest(".carousel"); return c ? [c.id || "carousel", [...c.querySelectorAll(".post")].indexOf(e) + 1] : null; });
    const id = car ? `${car[0]}-${String(car[1]).padStart(2, "0")}` : ((await el.getAttribute("id")) || `post-${String(i + 1).padStart(2, "0")}`);
    await el.screenshot({ path: path.join(outDir, named(TAG, id, ".png")) });
    if (await el.evaluate(e => e.classList.contains("story"))) {
      // Stories: every piece of text (and the logo and note) must sit inside the safe area the app UI leaves clear.
      for (const o of await el.evaluate(storyCheck)) unsafe.push(`${id}: ${o}`);
      if (process.argv.includes("--guides")) {
        fs.mkdirSync(path.join(outDir, "_guides"), { recursive: true });
        // Red bands mark where the app's UI sits; nothing but photo should be in them.
        await el.evaluate(e => e.insertAdjacentHTML("beforeend", `<div class="prism-guides" style="position:absolute;inset:0;z-index:9;zoom:1;pointer-events:none">
          <i style="position:absolute;left:0;right:0;top:0;height:var(--safe-top);background:rgb(230 40 60 / .35)"></i>
          <i style="position:absolute;left:0;right:0;bottom:0;height:var(--safe-bottom);background:rgb(230 40 60 / .35)"></i>
          <i style="position:absolute;left:0;width:var(--side);top:var(--safe-top);bottom:var(--safe-bottom);background:rgb(230 40 60 / .2)"></i>
          <i style="position:absolute;right:0;width:var(--side);top:var(--safe-top);bottom:var(--safe-bottom);background:rgb(230 40 60 / .2)"></i></div>`));
        await el.screenshot({ path: path.join(outDir, "_guides", named(TAG, id, ".png")) });
        await el.evaluate(e => e.querySelector(".prism-guides").remove());
      }
    }
    if (car) continue;
    const cap = await readCaption(el);
    if (!cap) missing.push(id);
    captions += `## ${named(TAG, id, ".png")}\n\n${cap}\n\n`;
  }
  for (const c of await page.$$(".carousel")) {
    const id = (await c.getAttribute("id")) || "carousel";
    const cap = await c.$eval(":scope > .caption", c => window.capText(c)).catch(() => "");
    if (!cap) missing.push(`${id} (whole carousel)`);
    captions += `## ${id} (whole carousel)\n\n${cap}\n\n`;
  }
  fs.writeFileSync(path.join(outDir, named(TAG, "captions", ".md")), captions);
  // Build stamp checked by verify.py: the kit version and a fingerprint of every image this build wrote.
  const sha = f => require("crypto").createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  const pngs = fs.readdirSync(outDir).filter(f => f.endsWith(".png"));
  fs.writeFileSync(path.join(outDir, ".prism-build.json"), JSON.stringify({ kit: fs.readFileSync(path.join(here, "VERSION"), "utf8").trim(),
    images: Object.fromEntries(pngs.map(f => [f, sha(path.join(outDir, f))])) }, null, 1));
  await browser.close();
  fs.unlinkSync(html);
  console.log(`wrote ${posts.length} images and ${named(TAG, "captions", ".md")} (${TAG}-*) to ${outDir}`);
  // An empty caption is a broken deliverable, so the build reports it and exits with an error.
  for (const id of missing) console.error(`[social] missing caption: ${id}. Put a ::: caption block inside the post's :::: fence.`);
  if (missing.length) process.exitCode = 1;
  for (const u of unsafe) console.warn(`[social] story ${u}`);
})();
