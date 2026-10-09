// The brand a document is built in, for every builder: require("./brand.js")(mdPath).
// Brand comes from the front matter `brand:` (else the profile marked default) and resolves through its profile.
const fs = require("fs"), path = require("path");
const { load, css, defaultBrand } = require("./resolve.js");
const KIT = __dirname, cache = {};
const UNBROKEN = ["SOC 1", "SOC 2", "SOC 3", "SOC 2 Type I", "SOC 2 Type II", "HIPAA", "HITRUST CSF", "ISO 27001", "ISO 27701", "ISO 9001", "PCI DSS",
  "NIST CSF", "NIST 800-53", "NIST SP 800-53", "FedRAMP High", "FedRAMP Moderate", "WCAG 2.1", "WCAG 2.2", "Section 508", "21 CFR Part 11", "42 CFR Part 2"];

module.exports = function brand(md, forceId) {
  const text = md && fs.existsSync(md) ? fs.readFileSync(md, "utf8") : "";
  const fm = /^---\n([\s\S]*?)\n---/.exec(text), id = forceId || ((fm && /^brand:\s*([\w-]+)/m.exec(fm[1])) || [])[1] || defaultBrand();
  if (cache[id]) return cache[id];
  const res = load(id);
  if (res.errors.length) { for (const e of res.errors) console.error(`[brand] ${e}`); console.error(`[brand] ${id}: cannot build; never approximate the brand`); process.exit(1); }
  for (const w of res.warnings.filter(w => w.startsWith("draft:"))) console.warn(`[brand] ${w}`);
  const dir = path.join(KIT, "cache", "brand", id);
  fs.mkdirSync(dir, { recursive: true });
  const brandCss = path.join(dir, "prism.css");
  fs.writeFileSync(brandCss, css(res));
  const role = n => { const r = res.roles[n]; if (!r) throw new Error(`[brand] ${id} has no role ${n}`); return r.value; };
  const B = {
    id, name: res.name, res, role, css: brandCss, office: res.office, content: res.content,
    // A colour role's value in a theme (default the first), e.g. color("prism-color-accent") -> "#3366CC".
    color: (n, theme) => { const v = role(n); return v[theme || res.themes[0]] ?? v[res.themes[0]]; },
    asset: n => role(n).path,
    // The core block a brand component behaves like (profile components[].like), by the class a format file gives it:
    // `::: testimonial` or `::: {.quote .testimonial}`. Decks and HTML emails, which can't use the brand's CSS, draw it as that block.
    // Only the component's own class counts: in `{.quote .testimonial}` that is testimonial, never the core quote.
    likeOf(...classes) {
      for (const [cid, c] of Object.entries(res.components || {})) {
        if (!c.like) continue;
        const dotted = (String(c.markup || "").match(/\.([\w-]+)/g) || []).map(x => x.slice(1)), bare = (/^:{3,}\s*([\w-]+)\s*$/.exec(c.markup || "") || [])[1];
        const ownClass = bare || dotted[dotted.length - 1];
        if (classes.some(k => k === cid || k === ownClass)) return c.like;
      }
      return null;
    },
    // Whether the brand has a role at all (mapped or derived); for optional assets such as the logo on dark grounds.
    has: n => !!res.roles[n],
    // Fills {{role}} and {{role@theme}} in a stylesheet (|uri encodes for data URIs) and returns the filled copy's path.
    stylesheet(file) {
      const out = path.join(dir, (file.startsWith(res.dir) ? "brand-" : "") + path.basename(file));
      const s = fs.readFileSync(file, "utf8").replace(/\{\{((?:prism|own)-[\w-]+)(?:@(\w+))?(\|uri)?\}\}/g, (_, n, t, u) => { const v = B.color(n, t); return u ? encodeURIComponent(v) : v; });
      fs.writeFileSync(out, s);
      return out;
    },
    // The brand's presentation layer for a format (sheet, brochure, social, blog), filled like a core stylesheet. A brand with
    // none gets core's default layer for that format (kit/layers/), so every component starts with a look; else null.
    layer(name) {
      const f = res.layers[name];
      if (f) return B.stylesheet(path.join(res.dir, f));
      const d = path.join(KIT, "layers", `${name}.css`);
      return fs.existsSync(d) ? B.stylesheet(d) : null;
    },
    // The brand's ornaments module (brands/<id>/ornaments.js): everything a builder draws. Missing functions mean "none".
    // The brand's Phosphor weight: its font stylesheet, path set and class.
    icons: (() => { const w = (res.icons && res.icons.weight) || "light"; const dir = path.join(KIT, "vendor", `phosphor-${w}`);
      return { weight: w, css: path.join(dir, "style.css"), paths: path.join(dir, "icons.json"), cls: w === "regular" ? "ph" : `ph-${w}` }; })(),
    // A raster copy of an asset for outputs that cannot rely on SVG (email clients, older PowerPoint): an SVG is drawn to a PNG
    // at widthPx in Chromium, keeping its own aspect ratio, and cached; anything else comes back as it is.
    async raster(file, widthPx) {
      if (!/\.svg$/i.test(file)) return file;
      const crypto = require("crypto"), svg = fs.readFileSync(file, "utf8");
      const out = path.join(dir, "raster", `${path.basename(file, ".svg")}-${Math.round(widthPx)}-${crypto.createHash("sha1").update(svg).digest("hex").slice(0, 8)}.png`);
      if (fs.existsSync(out)) return out;
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const vb = (/viewBox="([^"]+)"/.exec(svg) || [, "0 0 100 100"])[1].split(/[\s,]+/).map(Number), w = Math.round(widthPx), h = Math.round(w * vb[3] / vb[2]);
      const { chromium } = require("playwright");
      const b = await chromium.launch({ ...(process.env.PRISM_CHROMIUM ? { executablePath: process.env.PRISM_CHROMIUM } : {}) });
      const p = await b.newPage({ viewport: { width: w, height: h } });
      // Inlined as a data URI: a blank page cannot load local files.
      await p.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${w}px;height:${h}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`);
      await p.waitForFunction(() => document.images[0].complete);
      if (!(await p.evaluate(() => document.images[0].naturalWidth))) { await b.close(); throw new Error(`[brand] could not draw ${file}`); }
      await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
      await b.close();
      return out;
    },
    // An image source as a file: `prism:<asset>` is the brand's asset role (placeholders fall back to core's neutral ones),
    // anything else is a path relative to baseDir.
    // `brand:<id>` is a photo from the brand's image library.
    src(s, baseDir) {
      const lib = /^brand:([\w-]+)$/.exec(s);
      if (lib) {
        const e = res.library[lib[1]];
        if (!e) throw new Error(`[brand] ${id} has no library image "${lib[1]}" (run.sh library ${id})`);
        if (!e.path) throw new Error(`[brand] library photo "${lib[1]}" is not fetched yet from ${id}'s design system (run.sh library ${id} --need <format files>)`);
        return e.path;
      }
      const m = /^prism:([\w-]+)$/.exec(s);
      if (!m) return path.isAbsolute(s) ? s : path.resolve(baseDir, s);
      const r = res.roles["prism-asset-" + m[1]];
      if (r) return r.value.path;
      if (/^placeholder(-dark)?$/.test(m[1])) return path.join(KIT, "images", m[1] === "placeholder" ? "placeholder-light.png" : "placeholder-dark.png");
      throw new Error(`[brand] ${id} has no asset "${m[1]}" (prism-asset-${m[1]})`);
    },
    // An image's focal point as "x% y%": written in the markup, else from images.py (.focus.json beside the file) or the
    // library entry; null keeps the crop centred.
    focus(file, written) {
      if (written) return written;
      const e = Object.values(res.library).find(e => e.path && e.path === file);
      if (e) return e.focus || null;
      try { return JSON.parse(fs.readFileSync(path.join(path.dirname(file), ".focus.json"), "utf8"))[path.basename(file)] || null; } catch (e) { return null; }
    },
    get ornaments() { return res.ornamentsFile ? require(res.ornamentsFile) : {}; },
    // A profile option by dotted path, with core's default: option("images.fade", false).
    option(p, dflt) { let v = res.options; for (const k of p.split(".")) v = v == null ? undefined : v[k]; return v === undefined ? dflt : v; },
    // Colour and asset roles as environment variables for the Lua filters: PRISM_COLOR_ACCENT=#3366CC, PRISM_ASSET_LOGO=/path.
    // Terms never split across lines (prism-unbroken.lua): standards names, the brand's name and the profile's content.unbroken.
    unbroken: [...new Set([...UNBROKEN, res.name, ...((res.content && res.content.unbroken) || [])].filter(Boolean))],
    env() {
      const e = { ...process.env };
      for (const [n, r] of Object.entries(res.roles)) {
        if (r.kind === "color") e[n.toUpperCase().replace(/-/g, "_")] = r.value[res.themes[0]];
        if (r.kind === "asset") e[n.toUpperCase().replace(/-/g, "_")] = r.value.path;
      }
      for (const [n, l] of Object.entries(res.library)) { if (!l.path) continue; const k = "PRISM_LIBRARY_" + n.toUpperCase().replace(/-/g, "_"); e[k] = l.path; if (l.focus) e[k + "_FOCUS"] = l.focus; }
      e.PRISM_BRAND_NAME = B.name;
      e.PRISM_UNBROKEN = B.unbroken.join("\n");
      e.PRISM_CHART_BARS = B.option("charts.bars", "flat");
      e.PRISM_ICON_CLASS = B.icons.cls;
      // Placeholder photos: the brand's test images when it has them, otherwise core's neutral ones.
      for (const t of ["", "-dark"]) { const k = "PRISM_ASSET_PLACEHOLDER" + t.toUpperCase().replace("-", "_"); if (!e[k]) e[k] = path.join(KIT, "images", `placeholder${t ? "-dark" : "-light"}.png`); }
      return e;
    },
  };
  return (cache[id] = B);
};
