// Social checks and options: the words, layout, color and photo checks on a post summary; counters dropped and purple read as
// dark in a real page; and build-social.js honouring options.social (thread, counter, checks). Usage: node tests/social-checks.test.js
// (needs the kit's Chromium; run.sh sets it up on first use)
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const SC = require(path.join(KIT, "social-checks.js"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const ALL = ["words", "layout", "color", "photo"];
const post = o => ({ id: "p", carousel: null, n: 0, cover: false, end: false, story: false, email: false, ground: "light", sig: "h2+p", words: 10, photos: [], ...o });
const has = (out, re) => out.some(w => re.test(w));

// 1. The checks on plain summaries.
let out = SC.check([post({ id: "long", words: 42 })], ALL);
ok(has(out, /^words: post long has 42 words/), `a long post is reported: ${out}`);
ok(!has(SC.check([post({ story: true, words: 34 })], ALL), /^words/), "a story may carry 35 words");
ok(!SC.check([post({ id: "long", words: 42 })], []).length, "nothing is reported when no check is on");
const car = (n, o) => post({ carousel: "c", n, ...o });
const panels = [car(1, { cover: true, sig: "h1" }), car(2, { sig: "num+h2+p" }), car(3, { sig: "num+h2+p" }), car(4, { sig: "num+h2+checks" }), car(5, { sig: "h2+p", end: true, ground: "dark" })];
out = SC.check(panels, ALL);
ok(has(out, /^layout: c panels 2 and 3 have the same layout/), `two panels in a row with one layout are reported: ${out}`);
ok(has(out, /^color: every middle panel of c is on the light ground/), "a carousel with only light middle panels is reported");
out = SC.check([car(1, { cover: true }), car(2, { sig: "h2+p" }), car(3, { sig: "stats", ground: "purple" }), car(4, { sig: "quote", ground: "dark" }), car(5, { end: true, ground: "dark" })], ALL);
ok(!has(out, /^(layout|color)/), `a varied carousel passes: ${out}`);
out = SC.check([post({ id: "a" }), post({ id: "b" }), post({ id: "c" })], ALL);
ok(has(out, /^layout: all 3 posts have the same layout/) && has(out, /^color: all 3 posts are on the light ground/), `a uniform set of posts is reported: ${out}`);
out = SC.check([post({ id: "a", photos: ["images/x.jpg"] }), post({ id: "b", photos: ["images/x.jpg"], ground: "dark", sig: "quote" }), post({ id: "c", photos: ["images/y.jpg"], sig: "stats", ground: "purple" })], ALL);
ok(has(out, /^photo: x\.jpg is used in post a and post b/), `a photo used twice is reported: ${out}`);
ok(has(out, /^photo: post a, post b, post c all lead with photos/), "three photo posts in a row are reported");
ok(!has(SC.check([post({ id: "a", photos: ["prism:placeholder.png"] }), post({ id: "b", photos: ["prism:placeholder.png"], sig: "x" })], ["photo"]), /is used in/), "placeholders may repeat");
out = SC.check([car(2, { stats: ["41%", "2.6x", "$1.2 M"] }), post({ id: "solo", stats: ["2.6x"] })], ["stats"]);
ok(has(out, /^stats: c panel 2 has the figure "2\.6x" \(4 characters\)/) && has(out, /"\$1\.2 M" \(5 characters\)/), `long stat figures on a carousel are reported: ${out}`);
ok(!has(out, /"41%"/) && !has(out, /post solo/), "3-character figures and single posts pass");
ok(!has(SC.check([car(2, { stats: ["2.6x"] })], ["stats"], 4), /^stats/), "a brand may set its own limit");

// 2. In a page: counters dropped (other notes kept), purple read before it turns dark, the summary's signatures.
(async () => {
  const { chromium } = require(require.resolve("playwright", { paths: [path.join(KIT, "node_modules"), KIT] }));
  const browser = await chromium.launch({ ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
  const page = await browser.newPage();
  await page.setContent(`<div class="carousel" id="car">
    <div class="post panel cover" data-note="Swipe →"><h1>Cover</h1></div>
    <div class="post panel purple" data-note="02 / 03"><p><span class="num">01</span></p><h2>Two</h2><p>One sentence here.</p><div class="caption"><p>not counted at all ever</p></div></div>
    <div class="post panel dark end" data-note=" 03 / 03 "><h2>End</h2></div></div>
    <div class="post square" id="solo" data-note="Illustrative example"><h2>Solo</h2><p><img src="images/a.jpg"></p></div>`);
  let sum = await page.evaluate(SC.summary);
  ok(sum[1].sig === "num+h2+p", `the point number is read: ${sum[1].sig}`);
  ok(await page.evaluate(SC.dropNumbers) === 1, "the carousel's point number is dropped");
  sum = await page.evaluate(SC.summary);
  ok(sum.length === 4 && sum[1].ground === "purple" && sum[2].ground === "dark", `grounds are read: ${JSON.stringify(sum.map(s => s.ground))}`);
  ok(sum[1].sig === "h2+p" && sum[1].words === 4, `a panel's layout and words, without its caption: ${sum[1].sig} ${sum[1].words}`);
  ok(sum[3].photos[0] === "images/a.jpg" && sum[3].carousel === null, "a single post's photos are listed");
  const dropped = await page.evaluate(SC.dropCounters);
  const notes = await page.evaluate(() => [...document.querySelectorAll(".post")].map(p => p.getAttribute("data-note")));
  ok(dropped === 2 && notes[0] === "Swipe →" && notes[1] === null && notes[2] === null && notes[3] === "Illustrative example", `counters go, other notes stay: ${JSON.stringify(notes)}`);
  await page.evaluate(SC.purpleAsDark);
  ok(await page.evaluate(() => document.querySelector(".post.purple").classList.contains("dark")), "a purple post takes the dark text roles");
  await browser.close();

  // 3. build-social.js reads its options from the brand, so another brand's builds don't change.
  const src = fs.readFileSync(path.join(KIT, "build-social.js"), "utf8");
  ok(/B\.option\("social\.thread", true\) !== false/.test(src), "the thread line is left out only when the brand says thread: false");
  ok(/B\.option\("social\.counter", true\) === false\) await page\.evaluate\(SC\.dropCounters\)/.test(src), "counters are dropped only when the brand says counter: false");
  ok(/B\.option\("social\.checks", \[\]\)/.test(src), "the checks run only when the brand lists them");
  ok(/B\.option\("social\.numbers", true\) === false\) await page\.evaluate\(SC\.dropNumbers\)/.test(src), "point numbers are dropped only when the brand says numbers: false");
  ok(/B\.option\("social\.stat_chars", 3\)/.test(src), "the stat limit is the brand's, 3 by default");
  const css = fs.readFileSync(path.join(KIT, "prism-social.css"), "utf8");
  ok(/\.post\.dark\.purple\{background:var\(--prism-color-accent\)\}/.test(css), "core's purple falls back to the accent");

  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
