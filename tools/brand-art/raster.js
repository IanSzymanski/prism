// Renders SVGs to PNGs at exact sizes in Chromium. Usage: raster.js JOB.json  ([[out.png, svg, width, height|null], ...])
// Height null keeps the SVG's own aspect ratio. IBM Plex Mono is loaded for labels when FONT_DIR is set.
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const fontDir = process.env.FONT_DIR, face = fontDir ? `@font-face{font-family:"IBM Plex Mono";src:url("file://${path.join(fontDir, "IBMPlexMono-Medium.ttf")}");font-weight:500}` : "";
  const b = await chromium.launch(), p = await b.newPage();
  for (const [out, svg, w, h] of jobs) {
    let H = h;
    if (!H) { const vb = /viewBox="([^"]+)"/.exec(svg)[1].split(/\s+/).map(Number); H = Math.round(w * vb[3] / vb[2]); }
    await p.setViewportSize({ width: w, height: H });
    await p.setContent(`<style>${face}html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${H}px}</style>${svg}`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: H } });
  }
  await b.close();
})();
