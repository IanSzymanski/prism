// Website pages: the format file, sections, sides and spacers, the brand's site kit against the markup the editor saved,
// core's plain WordPress blocks, image slots and uploads, page.json, the checks and verify.
// Usage: node tests/web.test.js   (needs the kit's web setup: WordPress's block parser)
//   PRISM_WP_MODULES=<dir>/node_modules also checks core's blocks with WordPress's own block library
//   (npm install --prefix <dir> @wordpress/blocks @wordpress/block-library jsdom global-jsdom).
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), KIT = path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-web-"));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const run = (a, opt = {}) => spawnSync("bash", [path.join(KIT, "run.sh"), ...a], { encoding: "utf8", ...opt });
run(["web"]);  // first use sets up the block parser
const Wb = require(path.join(KIT, "build-web.js")), W = require(path.join(KIT, "web-blocks.js"));
const FIX = path.join(ROOT, "fixtures", "web.md"), VR = path.join(ROOT, "tests", "web", "vocational-rehabilitation.md");
const write = (name, md) => { const f = path.join(TMP, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, md); return f; };
const page = (body, more = "") => `---\nlayout: web\ntitle: Test page\nslug: test-page\n${more}---\n\n${body}`;
const hero = "::: hero\n# A *title*\n\n![A photo.](prism:placeholder){slot=hero}\n:::\n\n";
const errs = md => Wb.build(write("t.md", md)).errors.join(" | ");
const warns = md => Wb.build(write("t.md", md)).warns.join(" | ");

// 1. The format file: blocks in order, sections and sides worked out by the build.
const m = Wb.model(Wb.parse(fs.readFileSync(FIX, "utf8")), n => ({ name: n, weight: "light" }));
ok(m.errors.length === 0, `the fixture parses: ${m.errors}`);
ok(m.comps.map(c => c.name).join(",") === "hero,heading,media,title,heading,media,heading,media,heading,media,heading,media,band,heading,media,features,cta-card,heading,faq", `blocks in order: ${m.comps.map(c => c.name)}`);
ok(m.comps.filter(c => c.side).map(c => c.side[0]).join("") === "llrrllrrllrrl", `sides alternate, media under its heading: ${m.comps.filter(c => c.side).map(c => c.side[0]).join("")}`);
ok(Wb.sides([{ kind: "heading" }, { kind: "media" }, { kind: "media" }, { kind: "heading", pin: "right" }, { kind: "heading" }]).join(",") === "left,left,right,right,left", "a second media row flips; a pin carries on from itself");
const band = m.comps.find(c => c.name === "band");
ok(band.cards.length === 5 && band.cards[0].icon.name === "file-magnifying-glass" && band.els.some(e => e.type === "buttons"), "a band holds its text, its button and its cards");
const heroEls = m.comps[0].els.map(e => e.type).join(",");
ok(heroEls === "eyebrow,h1,lede,p,buttons,eyebrow,list,image", `hero elements: ${heroEls}`);
ok(Wb.build(FIX).comps[0].els.find(e => e.type === "buttons").items.map(b => b.kind + ":" + (b.icon ? b.icon.name + "-" + b.icon.weight : "")).join(",") === "primary:calendar-check-fill,secondary:", "buttons: kind and icon weight");

// 2. Case Amplify's site kit: the fixture rebuilds byte for byte the markup Ian pasted into the editor (ca-web's output).
let o = Wb.build(FIX);
ok(o.errors.length === 0 && o.warns.length === 0, `the fixture builds clean: ${o.errors} ${o.warns}`);
ok(o.markup === fs.readFileSync(path.join(ROOT, "tests", "web", "caseworker-burnout.blocks.html"), "utf8"), "caseworker-burnout: identical to the markup confirmed in the editor");
ok(Wb.build(FIX).markup === o.markup, "a rebuild is identical (ids are seeded by the page)");
ok(W.stray(o.markup).length === 0, "no text outside blocks");
const ids = W.flat(o.markup).map(b => b.attrs.uniqueID).filter(Boolean);
ok(ids.length > 100 && new Set(ids).size === ids.length, "every block id once");
ok((o.markup.match(/data-cta-card=""/g) || []).length === 1, "one CTA card");
ok(/<!-- wp:block \{"ref":4470\} \/-->\n\n<!-- wp:kadence\/spacer/.test(o.markup.slice(-600)), "the page ends on the synced stop and a spacer");
ok((o.markup.match(/<!-- wp:kadence\/spacer /g) || []).length === 12, `a spacer before every section and after the stop: ${(o.markup.match(/<!-- wp:kadence\/spacer /g) || []).length}`);
ok(o.slots.length === 7 && o.slots.every(s => !s.file) && /\[Image slot: hero\] A caseworker/.test(o.markup), "placeholders become named slots");

// 3. The live VR page: 201 blocks with its structure, 20 intentional cleanups (tests/web/README.md).
const vr = Wb.build(VR);
ok(vr.errors.length === 0, `the VR page builds: ${vr.errors}`);
const cmp = W.compare(fs.readFileSync(path.join(ROOT, "tests", "web", "vocational-rehabilitation.original.html"), "utf8"), vr.markup);
ok(cmp.original === 201 && cmp.generated === 201, `VR: same block count (${cmp.original}, ${cmp.generated})`);
ok(cmp.diffs.length === 20, `VR: exactly the 20 intentional differences, got ${cmp.diffs.length}`);
ok(vr.media.length === 7 && vr.slots.length === 0, "VR: the site's own photos stay as they are");
ok(vr.warns.some(w => /line \d+: an image without alt text/.test(w)), "VR: the photo without alt text is reported");

// 4. run.sh web in a piece: files named by the tag, photos to upload, page.json, verify.
const proj = path.join(TMP, "piece");
write("piece/content.md", "---\ntitle: Piece\nversion: 3\nstatus: approved\n---\n\n# Piece\n");
fs.mkdirSync(path.join(proj, "formats", "images"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "fixtures", "images", "harbor-phone.png"), path.join(proj, "formats", "images", "visit.png"));
fs.writeFileSync(path.join(proj, "formats", "images", ".focus.json"), JSON.stringify({ "visit.png": "40% 30%" }));
const src = fs.readFileSync(FIX, "utf8").replace("![A caseworker reviewing a stack of paperwork late in the day.](prism:placeholder){slot=workload}", "![A caseworker on a home visit.](images/visit.png)")
  .replace(/^(template|seo-title|description|keyphrase): .*\n/gm, "").replace("post: 0\n", "post: 0\ntemplate: inner\nseo-title: Reduce Caseworker Burnout | Test\ndescription: A short description.\nkeyphrase: caseworker burnout\nparent: 12\n");
const fmt = write("piece/formats/web.md", src), out = path.join(proj, "out", "web");
let r = run(["web", fmt, out]);
ok(r.status === 0, `run.sh web builds: ${r.stderr}`);
const files = fs.existsSync(out) ? fs.readdirSync(out).sort() : [];
ok(files.join(",") === ".prism-build.json,images,piece-web-v3-blocks.html,piece-web-v3-page.json", `files: ${files}`);
const pj = JSON.parse(fs.readFileSync(path.join(out, "piece-web-v3-page.json"), "utf8"));
ok(pj.prism_piece_id === "piece-web" && pj.version === 3 && pj.template === "inner" && pj.template_meta._kad_post_layout === "fullwidth", "page.json: piece id without the version, template and its page settings");
ok(pj.seo_title === "Reduce Caseworker Burnout | Test" && pj.description === "A short description." && pj.focus === "caseworker burnout" && pj.parent === 12, "page.json: search fields and parent");
const visit = pj.slots.find(s => s.name === "visit");
ok(visit && visit.file === "images/piece-web-v3-visit.png" && visit.focus === "40% 30%" && visit.alt === "A caseworker on a home visit.", `a piece photo is a slot with its file to upload: ${JSON.stringify(visit)}`);
ok(visit && visit.sha256 === crypto.createHash("sha256").update(fs.readFileSync(path.join(out, visit.file))).digest("hex"), "the upload's hash (the site skips a photo it already has)");
ok(pj.placeholder.id === 3901 && pj.slots.length === 7, "page.json: the placeholder and every slot");
ok(!/--brand|ERROR/.test(r.stderr) && /slot "visit" \(::: media, line \d+\): images\/visit.png, upload images\/piece-web-v3-visit.png/.test(r.stdout), "the build lists each slot");
r = spawnSync("python3", [path.join(KIT, "verify.py"), out], { encoding: "utf8" });
ok(r.status === 0 && /^OK/.test(r.stdout), `verify: ${r.stdout}`);
fs.appendFileSync(path.join(out, "piece-web-v3-blocks.html"), "<p>hand edit</p>\n");
r = spawnSync("python3", [path.join(KIT, "verify.py"), out], { encoding: "utf8" });
ok(r.status === 1 && /piece-web-v3-blocks.html was changed after the build/.test(r.stdout), `verify catches a hand edit: ${r.stdout}`);
r = spawnSync("node", [path.join(KIT, "check-numbers.js"), path.join(proj, "content.md"), path.join(ROOT, "tests", "web", "vocational-rehabilitation.md")], { encoding: "utf8" });
ok(/^CHECK: 1 number/.test(r.stdout) && /911/.test(r.stdout) && !/4246|4658|45|55/.test(r.stdout.split("\n")[1]), `number check: only real figures, not ids, widths or the post: ${r.stdout.slice(0, 200)}`);
r = run(["web", "compare", path.join(ROOT, "tests", "web", "vocational-rehabilitation.original.html"), path.join(ROOT, "tests", "web", "vocational-rehabilitation.original.html")]);
ok(/blocks: original 201, generated 201; blocks with differences: 0/.test(r.stdout), `compare: ${r.stdout.slice(0, 120)}`);

// 5. Mistakes the build stops on.
ok(/unknown block "::: gallery"/.test(errs(page(hero + "::: gallery\n![x](prism:placeholder)\n:::\n"))), "an unknown block");
ok(/one closing card per page/.test(errs(page(hero + "::: cta-card\n## A\n\nB\n\n[C](/c/){.button}\n[D](/d/){.button .secondary}\n:::\n\n::: cta-card\n## A\n\nB\n\n[C](/c/){.button}\n[D](/d/){.button .secondary}\n:::\n"))), "two closing cards");
ok(/text outside a block/.test(errs(page(hero + "## A heading\n\nA loose paragraph.\n"))), "text outside a block");
ok(/an eyebrow sits directly above a ## heading/.test(errs(page(hero + "[Lost]{.eyebrow}\n\n::: features\n- **A** b\n:::\n"))), "an eyebrow away from its heading");
ok(/goes in ::: hero/.test(errs(page(hero + "# Second title\n"))), "a # title outside the hero");
ok(/cols=50\/60/.test(errs(page(hero + "## A {cols=50/60}\n"))), "column widths that don't add up");
ok(/no icon "not-an-icon"/.test(errs(page(hero + "## A\n\n::: features\n- []{.icon .ph-not-an-icon} **A** b\n:::\n"))), "an icon Phosphor doesn't have");
ok(/rise=bounce/.test(errs(page(hero + "## A {rise=bounce}\n"))), "a motion the site doesn't have");
ok(/template: wide/.test(errs(page(hero, "template: wide\n"))), "a template the brand doesn't have");
ok(/slot "x" is used twice/.test(errs(page(hero + "## A\n\n::: media\n![a](prism:placeholder){slot=x}\n\nText.\n:::\n\n## B\n\n::: media\n![b](prism:placeholder){slot=x}\n\nText.\n:::\n"))), "one slot name twice");
ok(/needs \{id=<media library id>\}/.test(errs(page(hero + "## A\n\n::: media\n![a](https://example.com/a.jpg)\n\nText.\n:::\n"))), "a site photo without its media id");
ok(/not fetched yet|has no library image/.test(errs(page(hero + "## A\n\n::: media\n![a](brand:missing)\n\nText.\n:::\n"))), "a library photo that isn't there");
ok(/needs a ## heading, one paragraph/.test(errs(page(hero + "::: cta-card\n## A\n\nB\n\n[C](/c/){.button}\n:::\n"))), "the closing card needs both buttons (the brand's card)");

// 6. Warnings: one accent per heading, a heading for every group, icons the site hasn't used, sweeps a screen apart.
ok(/more than one accent word/.test(warns(page(hero + "## *Two* accent *words*\n"))), "two accent words");
ok(/::: media \(line \d+\) has no ## heading above it/.test(warns(page(hero + "::: media\n![a](prism:placeholder)\n\nText.\n:::\n"))), "a media row with no heading");
ok(/icon "acorn-light" isn't used on Case Amplify's site yet/.test(warns(page(hero + "## A\n\n::: features\n- []{.icon .ph-acorn} **A** b\n:::\n"))), "an icon the site hasn't used");
ok(/rise=sweep at most once per screen/.test(warns(page(hero + "## A {rise=sweep}\n\n::: {.media rise=sweep}\n![a](prism:placeholder)\n\nText.\n:::\n"))), "two sweeps in one section");
ok(!/sweep/.test(warns(page(hero + "## A {rise=sweep}\n\n## B\n\n## C {rise=sweep}\n"))), "sweeps a section apart are fine");
ok(/no description/.test(warns(page(hero))) && /seo-title: is \d+ characters/.test(warns(page(hero, `seo-title: ${"x".repeat(70)}\n`))), "search fields");

// 7. A brand without a site kit gets core's plain WordPress blocks, with the same sections and sides.
const prism = write("prism-web.md", fs.readFileSync(FIX, "utf8").replace("layout: web\n", "layout: web\nbrand: prism\n"));
o = Wb.build(prism);
ok(o.errors.length === 0 && !o.S.fromBrand, `builds in a brand with no site kit: ${o.errors}`);
ok(o.warns.some(w => /template: inner left out: Prism has no page templates/.test(w)), "a template line is left out in a brand without templates");
const names = [...new Set(W.flat(o.markup).map(b => b.blockName))].sort().join(",");
ok(names === "core/button,core/buttons,core/column,core/columns,core/details,core/group,core/heading,core/image,core/list,core/list-item,core/paragraph,core/spacer", `only core blocks: ${names}`);
ok(W.stray(o.markup).length === 0 && /prism-web-heading prism-web-right/.test(o.markup) && /has-text-align-center prism-web-title/.test(o.markup), "core blocks carry the sides and the centered title as classes");
ok(!/kadence|uniqueID|data-cta-card/.test(o.markup), "nothing of the brand's site kit");
const wp = process.env.PRISM_WP_MODULES;
if (wp) {
  const f = path.join(TMP, "core.html"); fs.writeFileSync(f, o.markup);
  const js = `require('global-jsdom')();window.matchMedia=window.matchMedia||(()=>({matches:false,addListener(){},removeListener(){}}));
const L=console.log;console.warn=console.error=console.info=()=>{};const b=require('@wordpress/blocks');require('@wordpress/block-library').registerCoreBlocks();
let n=0,bad=[];const w=x=>x.forEach(k=>{n++;if(!k.isValid)bad.push(k.name);w(k.innerBlocks)});w(b.parse(require('fs').readFileSync(process.argv[1],'utf8')));L(n+' '+bad.join(','));`;
  r = spawnSync("node", ["-e", js, f], { encoding: "utf8", env: { ...process.env, NODE_PATH: wp } });
  ok(/^\d+ $/.test(r.stdout.trim() + " ") && +r.stdout.split(" ")[0] > 100, `WordPress validates every core block: ${r.stdout.trim() || r.stderr.slice(-300)}`);
} else console.log("SKIP WordPress validation of core blocks (set PRISM_WP_MODULES; see the top of this file)");

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`web: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
