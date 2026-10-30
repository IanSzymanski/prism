// Case Amplify's site kit: each block of a web.md page as the Kadence markup its caseamplify.com pattern saves (from ca-web).
// The markup the editor saved is ground truth (tests/web/vocational-rehabilitation.original.html): a block's attributes and HTML
// must match it, or the editor shows "This block contains unexpected content". Site facts come from the profile's `web`.
// Motion classes, rules and the CTA card follow wave-system.md (§4.1 section rules, §4.4 ca-rise, §4.5 the card).
const fs = require("fs"), path = require("path");

module.exports = function site(W, S) {
  const { block, esc, txt: t } = W;
  const mark = w => `<mark true="true" class="kt-highlight">${w}</mark>`;
  const txt = (s, accent = mark) => t(s, accent);
  const fail = W.fail;

  // ---- Kadence blocks as the editor saves them ----
  const NB = () => ({ top: [null, "", ""], right: [null, "", ""], bottom: [null, "", ""], left: [null, "", ""] });
  // The three mark-border shapes Kadence saved on this site; "mixed" comes from headings with an accent color.
  const MB = {
    px: () => ({ markBorder: "", markBorderStyles: [{ ...NB(), unit: "px" }], tabletMarkBorderStyles: [{ ...NB(), unit: "px" }], mobileMarkBorderStyles: [{ ...NB(), unit: "px" }] }),
    mixed: () => ({ markBorder: "", markBorderStyles: [{ ...NB(), unit: "px" }], tabletMarkBorderStyles: [{ ...NB(), unit: "" }], mobileMarkBorderStyles: [{ ...NB(), unit: "" }] }),
    none: () => ({ markBorder: "", markBorderStyles: [{ ...NB(), unit: "" }], tabletMarkBorderStyles: [{ ...NB(), unit: "" }], mobileMarkBorderStyles: [{ ...NB(), unit: "" }] }),
  };
  function heading(attrs, html) {
    const id = attrs.uniqueID, tag = attrs.htmlTag || `h${attrs.level || 2}`;
    const color = attrs.colorClass ? ` has-${attrs.colorClass.replace(/palette(\d)/, "palette-$1")}-color has-text-color` : "";
    const cls = attrs.className ? " " + attrs.className : "";
    return block("kadence/advancedheading", attrs,
      `<${tag} class="kt-adv-heading${id}${cls} wp-block-kadence-advancedheading${color}" data-kb-block="kb-adv-heading${id}">${html}</${tag}>`);
  }
  function column(attrs, children, extraClass = "") {
    const cls = [attrs.className, extraClass].filter(Boolean).map(c => " " + c).join("");
    return block("kadence/column", attrs,
      `<div class="wp-block-kadence-column kadence-column${attrs.uniqueID}${cls}"><div class="kt-inside-inner-col">${children.join("\n\n")}</div></div>`);
  }
  const row = (attrs, columns) => block("kadence/rowlayout", attrs, columns.join("\n\n"));
  const image = (attrs, { url, alt, id }) => block("kadence/image", attrs,
    `<figure class="wp-block-kadence-image kb-image${attrs.uniqueID} size-full ${attrs.className}"><img src="${url}" alt="${alt}" class="kb-img wp-image-${id}"/></figure>`);
  const buttons = (attrs, btns) => block("kadence/advancedbtn", attrs,
    `<div class="wp-block-kadence-advancedbtn kb-buttons-wrap kb-btns${attrs.uniqueID}">${btns.join("\n\n")}</div>`);
  const html = s => block("html", null, s);
  // The section rule: the theme's script draws its path (wave-system.md §4.1).
  const rule = side => html(`<div class="rule"><svg data-rule="" data-anchor="${side}" aria-hidden="true"><path></path></svg></div>`);

  const BW = () => ["", "", "", ""];
  const ZERO = { thirdColumnWidth: 0, fourthColumnWidth: 0, fifthColumnWidth: 0, sixthColumnWidth: 0 };
  const side4 = c => ({ top: [c, "", 1], right: [c, "", 1], bottom: [c, "", 1], left: [c, "", 1], unit: "px" });
  const empty4 = () => ({ top: ["", "", ""], right: ["", "", ""], bottom: ["", "", ""], left: ["", "", ""], unit: "" });
  const rise = (v, fallback) => S.rise[v || fallback];
  const widths = (s, d) => (s || d).split("/").map(Number);
  const iconId = i => `icon-${i.name}-${i.weight}`;

  function twoColRow(ctx, { w, cls, collapse, meta, pre = {} }) {
    const o = { uniqueID: ctx.id(), tabletLayout: "row" };
    if (collapse) o.collapseOrder = "right-to-left";
    Object.assign(o, pre, { columnGutter: "custom", gutterType: "rem", customGutter: [8, "", ""], colLayout: "equal", firstColumnWidth: w[0], secondColumnWidth: w[1], ...ZERO, inheritMaxWidth: true, kbVersion: 2, className: cls });
    if (meta) o.metadata = meta;
    return o;
  }
  const midCol = (ctx, extra = {}) => ({ borderWidth: BW(), uniqueID: ctx.id(), verticalAlignment: "middle", kbVersion: 2, ...extra });
  const textCol = (ctx, extra = {}) => ({ id: 2, borderWidth: BW(), uniqueID: ctx.id(), verticalAlignment: "middle", kbVersion: 2, ...extra });

  // Links starting with http open in a new tab with nofollow, as the site does.
  function button(ctx, e) {
    const primary = e.kind === "primary", ext = /^https?:/.test(e.url) ? { target: "_blank", noFollow: true } : {};
    const a = { uniqueID: ctx.id(), text: e.text, link: e.url, ...ext };
    if (primary) a.padding = ["xs", "", "xs", ""];
    Object.assign(a, { borderRadius: [10, 10, 10, 10] });
    if (e.icon) Object.assign(a, { icon: iconId(e.icon), iconSide: "left", iconSize: [25, "", ""] });
    a.inheritStyles = primary ? "inherit" : "outline";
    return block("kadence/singlebtn", a, null);
  }

  // Lede, paragraph and list in the shared text-column style; lists are "•" lines, as on the live site.
  function bodyText(ctx, c, e) {
    if (e.type === "lede") return heading({ level: 5, uniqueID: ctx.id(), padding: ["", "", "xs", ""], ...MB.px() }, txt(e.text));
    if (e.type === "p") return heading({ uniqueID: ctx.id(), ...MB.px(), htmlTag: "p" }, txt(e.text));
    if (e.type === "list") return heading({ uniqueID: ctx.id(), color: "#888888", ...MB.px(), colorClass: "kb-palette-1", htmlTag: "p", fontSize: ["sm", "", ""], fontHeight: [2, "", ""] }, e.items.map(i => "• " + txt(i)).join("<br>"));
    fail(c, `"${e.type}" is not allowed here`);
  }

  function imageBlock(ctx, img, shadow) {
    const a = { id: Number(img.id), sizeSlug: "full", linkDestination: "none", uniqueID: ctx.id(), borderRadius: [15, 15, 15, 15] };
    if (shadow) Object.assign(a, { displayBoxShadow: true, boxShadow: [{ color: "#000000", opacity: 0.13, spread: 0, blur: 0, hOffset: 0, vOffset: 0, inset: false }] });
    a.className = "ca-fade";
    return image(a, { url: img.url, alt: esc(img.alt), id: img.id });
  }

  function lightCard(ctx, k, angle) {
    return column({ borderWidth: BW(), borderRadius: [15, 15, 15, 15], uniqueID: ctx.id(), verticalAlignment: "top", padding: ["sm", "sm", "sm", "sm"], backgroundType: "gradient", gradient: `linear-gradient(${angle}deg,var(--global-palette8) 66%,rgb(243,234,252) 100%)`, borderStyle: [side4("palette6")], tabletBorderStyle: [empty4()], mobileBorderStyle: [empty4()], kbVersion: 2 }, [
      heading({ level: 3, uniqueID: ctx.id(), ...MB.px(), fontSize: ["lg", "", ""], ...(k.icon ? { icon: iconId(k.icon) } : {}) }, txt(k.title)),
      heading({ uniqueID: ctx.id(), ...MB.px(), htmlTag: "p" }, txt(k.body || "")),
    ]);
  }

  const P = S.patterns;
  const spacer = (c, ctx) => {
    const id = ctx.id();
    return block("kadence/spacer", { spacerHeight: 256, tabletSpacerHeight: 128, dividerEnable: false, uniqueID: id },
      `<div class="wp-block-kadence-spacer aligncenter kt-block-spacer-${id}"><div class="kt-block-spacer kt-block-spacer-halign-center"></div></div>`);
  };
  return {
    spacer,

    // The page ends on the synced full-stop rule, then a spacer (wave-system.md §4.1).
    end: ctx => [block("block", { ref: S.synced.stop }, null), spacer({}, ctx)],

    hero: (c, ctx) => {
      const img = c.els.find(e => e.type === "image");
      const kids = [];
      let eyebrows = 0;
      for (const e of c.els) {
        if (e.type === "image") continue;
        else if (e.type === "buttons") kids.push(buttons({ hAlign: "left", uniqueID: ctx.id(), gap: ["sm", "", ""] }, e.items.map(b => button(ctx, b))));
        else if (e.type === "eyebrow" && eyebrows++ === 0) kids.push(heading({ level: 6, uniqueID: ctx.id(), fontWeight: "inherit", margin: ["", "", "0", ""], ...MB.px(), textTransform: "capitalize", htmlTag: "p", className: "eyebrow" }, txt(e.text)));
        else if (e.type === "eyebrow") kids.push(heading({ level: 6, uniqueID: ctx.id(), fontWeight: "inherit", margin: ["", "", "0", ""], padding: ["xs", "", "xs", ""], ...MB.px(), htmlTag: "p", className: "eyebrow" }, txt(e.text)));
        else if (e.type === "h1") kids.push(heading({ level: 1, uniqueID: ctx.id(), margin: ["md", "", "", ""], padding: ["0", "", "", ""], markColor: "palette3", ...MB.px() }, txt(e.text)), rule("left"));
        else if (e.type === "list") kids.push(heading({ level: 6, uniqueID: ctx.id(), color: "#888888", fontWeight: "inherit", margin: ["", "", "0", ""], ...MB.px(), textTransform: "capitalize", colorClass: "kb-palette-1", htmlTag: "p", fontSize: ["sm", "", ""], fontHeight: [2, "", ""] }, e.items.map(i => txt(i)).join("<br>")));
        else kids.push(bodyText(ctx, c, e));
      }
      const rowA = { uniqueID: ctx.id(), tabletLayout: "row", collapseGutter: "custom", customRowGutter: [30, "", ""], columnGutter: "custom", gutterType: "rem", customGutter: [8, "", ""], colLayout: "right-golden", firstColumnWidth: 50, secondColumnWidth: 50, ...ZERO, tabletPadding: ["xl", "", "5xl", ""], backgroundSettingTab: "gradient", inheritMaxWidth: true, gradient: "linear-gradient(180deg,rgba(141,22,212,0.16) 0%,var(--global-palette8) 36%)", padding: ["4xl", "", "sm", ""], kbVersion: 2, className: "ca-rise--lift", metadata: { name: "ca-innerHero", categories: ["hero"] } };
      return row(rowA, [
        column({ borderWidth: BW(), uniqueID: ctx.id(), verticalAlignment: "top", kbVersion: 2, className: "ca-rise--lift" }, kids),
        column({ id: 2, borderWidth: BW(), uniqueID: ctx.id(), verticalAlignment: "middle", kbVersion: 2, className: "ca-shadow" }, [imageBlock(ctx, img, false)]),
      ]);
    },

    // Heading on the left: rule to its right (ca-header/divider). Heading on the right: rule to its left (ca-divider/header).
    heading: (c, ctx) => {
      const eb = c.els.find(e => e.type === "eyebrow"), h = c.els.find(e => e.type === "h2");
      const kids = [];
      if (c.side === "left") {
        if (eb) kids.push(heading({ uniqueID: ctx.id(), align: "left", color: "", margin: ["", "", "0", ""], padding: ["", "", "0", ""], markColor: "palette3", ...MB.mixed(), textTransform: "capitalize", colorClass: "", htmlTag: "p", className: "eyebrow" }, txt(eb.text)));
        const spacing = eb ? { margin: ["0", "", "", ""], padding: ["sm", "", "", ""] } : {};
        kids.push(heading({ uniqueID: ctx.id(), color: "", ...spacing, markColor: "palette3", ...MB.mixed(), colorClass: "" }, txt(h.text)));
        return row(twoColRow(ctx, { w: widths(c.attrs.cols, "40/60"), cls: rise(c.attrs.rise, "rise"), meta: P.headerDivider }),
          [column(midCol(ctx), kids), column(midCol(ctx), [rule("right")])]);
      }
      if (eb) kids.push(heading({ uniqueID: ctx.id(), align: "right", color: "", margin: ["", "", "0", ""], padding: ["", "", "0", ""], markColor: "palette3", ...MB.mixed(), textTransform: "capitalize", colorClass: "", tabletAlign: "left", htmlTag: "p", className: "eyebrow" }, txt(eb.text)));
      kids.push(heading({ uniqueID: ctx.id(), align: "right", color: "", margin: ["sm", "", "", ""], padding: ["0", "", "", ""], markColor: "palette3", ...MB.mixed(), colorClass: "", tabletAlign: "left" }, txt(h.text)));
      return row(twoColRow(ctx, { w: widths(c.attrs.cols, "55/45"), cls: rise(c.attrs.rise, "rise"), collapse: true, meta: P.dividerHeader }),
        [column(midCol(ctx), [rule("left")]), column(midCol(ctx), kids)]);
    },

    // Image on the left uses ca-image/content; on the right, ca-content/image.
    media: (c, ctx) => {
      const img = c.els.find(e => e.type === "image");
      const left = c.side === "left";
      const kids = c.els.filter(e => e !== img).map(e => bodyText(ctx, c, e));
      const rowA = twoColRow(ctx, left
        ? { w: widths(c.attrs.cols, "60/40"), cls: rise(c.attrs.rise, "rise"), meta: P.imageContent }
        : { w: widths(c.attrs.cols, "35/65"), cls: rise(c.attrs.rise, "rise"), collapse: true, meta: P.contentImage });
      const imgCol = () => column(midCol(ctx), [imageBlock(ctx, img, !left)]);
      const txtCol = () => column(textCol(ctx), kids);
      return row(rowA, left ? [imgCol(), txtCol()] : [txtCol(), imgCol()]);
    },

    title: (c, ctx) => heading({ uniqueID: ctx.id(), align: "center", markColor: "palette3", ...MB.none(), className: rise(c.attrs.rise, "lift") }, txt(c.els[0].text)),

    band: (c, ctx) => {
      const kids = [], btns = [];
      for (const e of c.els) {
        if (e.type === "eyebrow") kids.push(heading({ level: 6, uniqueID: ctx.id(), color: "rgba(255,255,248,0.76)", fontWeight: "inherit", margin: ["", "", "0", ""], ...MB.px(), textTransform: "capitalize", colorClass: "", htmlTag: "p", className: "eyebrow" }, txt(e.text)));
        else if (e.type === "h2") kids.push(heading({ uniqueID: ctx.id(), color: "palette8", margin: ["sm", "", "", ""], padding: ["0", "", "", ""], markColor: "palette14", ...MB.mixed(), colorClass: "theme-palette8" }, txt(e.text)), rule("left"));
        else if (e.type === "p") kids.push(heading({ uniqueID: ctx.id(), color: "rgba(255,255,248,0.76)", margin: ["sm", "", "", ""], ...MB.px(), colorClass: "", htmlTag: "p" }, txt(e.text)));
        else if (e.type === "buttons") btns.push(...e.items);
        else fail(c, `"${e.type}" is not allowed in a band`);
      }
      if (btns.length) kids.push(buttons({ hAlign: "left", uniqueID: ctx.id() }, btns.map(b => button(ctx, b))));
      const glass = c.cards.map((k, i) => column({ ...(i ? { id: i + 1 } : {}), borderWidth: BW(), uniqueID: ctx.id(), kbVersion: 2 }, [
        column({ background: "#01000c", backgroundOpacity: 0.1, borderWidth: BW(), borderRadius: [15, 15, 15, 15], uniqueID: ctx.id(), shadow: [{ color: "#000000", opacity: 0.2, spread: 5, blur: 60, hOffset: 0, vOffset: 0, inset: false }], verticalAlignment: "top", overlayOpacity: 0.33, padding: ["sm", "sm", "sm", "sm"], gradient: "linear-gradient(135deg,rgb(248,248,248) 0%,var(--global-palette6) 100%)", overlayGradient: "linear-gradient(352deg,rgb(136,136,136) 4%,var(--global-palette5) 42%,var(--global-palette7) 66%,rgb(136,136,136) 99%)", borderStyle: [side4("rgba(255,255,248,0.3)")], tabletBorderStyle: [empty4()], mobileBorderStyle: [empty4()], overlayBlendMode: "overlay", kbVersion: 2 }, [
          heading({ level: 3, uniqueID: ctx.id(), color: "palette8", ...MB.px(), colorClass: "theme-palette8", fontSize: ["lg", "", ""], ...(k.icon ? { icon: iconId(k.icon) } : {}) }, txt(k.title)),
          heading({ uniqueID: ctx.id(), color: "rgba(255,255,248,0.76)", ...MB.px(), colorClass: "", htmlTag: "p" }, txt(k.body || "")),
        ], "kb-section-has-overlay"),
      ]));
      const inner = row({ uniqueID: ctx.id(), tabletLayout: "row", customRowGutter: [30, "", ""], columnGutter: "custom", gutterType: "rem", customGutter: [8, "", ""], colLayout: "equal", firstColumnWidth: 45, secondColumnWidth: 55, ...ZERO, inheritMaxWidth: true, kbVersion: 2, className: "ca-rise" }, [
        column({ borderWidth: BW(), uniqueID: ctx.id(), verticalAlignment: "middle", stickyOffset: [0, "", ""], kbVersion: 2 }, kids),
        column(midCol(ctx), [row({ uniqueID: ctx.id(), columns: c.cards.length, collapseGutter: "skinny", customRowGutter: [10, "", ""], columnGutter: "skinny", customGutter: [16, "", ""], colLayout: "row", kbVersion: 2, className: "ca-rise--lift" }, glass)]),
      ]);
      // The three nested columns mirror the saved page; ca-rise item resolution walks through them (wave-system.md §4.4).
      const wrapped = column({ borderWidth: BW(), uniqueID: ctx.id(), verticalAlignment: "middle", tabletPadding: ["", "0", "", ""], kbVersion: 2, className: "ca-rise" }, [
        column({ id: 2, borderWidth: BW(), uniqueID: ctx.id(), kbVersion: 2 }, [column(textCol(ctx), [inner])]),
      ]);
      const panel = row({ uniqueID: ctx.id(), columns: 1, tabletRowGutter: "wider", customRowGutter: ["", 60, ""], columnGutter: "custom", gutterType: "rem", customGutter: [8, "", ""], colLayout: "equal", overlayOpacity: 0, overlayBlendMode: "normal", tabletPadding: ["lg", "", "0", ""], backgroundSettingTab: "gradient", inheritMaxWidth: true, borderRadius: [30, 30, 30, 30], gradient: "linear-gradient(174deg,rgb(39,21,71) 0%,var(--global-palette2) 18%,rgb(59,0,119) 66%,rgb(73,3,136) 84%,rgb(106,14,160) 100%)", overlayGradient: "linear-gradient(346deg,var(--global-palette8) 0%,var(--global-palette6) 100%)", padding: ["xl", "", "xl", ""], kbVersion: 2 }, [wrapped]);
      return column({ borderWidth: BW(), uniqueID: ctx.id(), padding: ["", "sm", "", "sm"], tabletPadding: ["", "xs", "", "xs"], kbVersion: 2, className: "ca-rise ca-rise--lift" }, [panel]);
    },

    features: (c, ctx) => row({ uniqueID: ctx.id(), columns: c.cards.length, tabletLayout: "row", collapseGutter: "skinny", customRowGutter: [10, "", ""], columnGutter: "skinny", customGutter: [16, "", ""], colLayout: "two-grid", inheritMaxWidth: true, kbVersion: 2, className: rise(c.attrs.rise, "lift"), metadata: P.cards4 },
      c.cards.map(k => lightCard(ctx, k, 28))),

    stack: (c, ctx) => {
      const rowA = twoColRow(ctx, { w: widths(c.attrs.cols, "65/35"), cls: rise(c.attrs.rise, "lift"), collapse: true, meta: P.cardStack, pre: { tabletRowGutter: "wider", customRowGutter: ["", 60, ""] } });
      return row(rowA, [
        column({ borderWidth: BW(), uniqueID: ctx.id(), rowGap: [16, "", ""], rowGapVariable: ["sm", "", ""], verticalAlignment: "middle", kbVersion: 2, className: "ca-rise--lift" }, c.cards.map(k => lightCard(ctx, k, 195))),
        column(textCol(ctx, { className: "ca-rise--lift" }), c.els.map(e => bodyText(ctx, c, e))),
      ]);
    },

    // The CTA card (wave-system.md §4.5) as one HTML block; its SVG gradients are found by id, so once per page.
    "cta-card": (c) => {
      const h = c.els.find(e => e.type === "h2"), lede = c.els.find(e => e.type === "p");
      const [primary, ghost] = c.els.filter(e => e.type === "buttons").flatMap(e => e.items);
      if (!h || !lede || !primary || !ghost) fail(c, "needs a ## heading, one paragraph, a {.button} and a {.button .secondary}");
      const tpl = fs.readFileSync(path.join(__dirname, "cta-card.html"), "utf8").trimEnd();
      const fill = { heading: txt(h.text, w => `<em>${w}</em>`), lede: txt(lede.text), primaryHref: primary.url, primaryLabel: esc(primary.text), ghostHref: ghost.url, ghostLabel: esc(ghost.text) };
      return html(tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => fill[k]));
    },

    faq: (c, ctx) => {
      const panes = [];
      for (const e of c.els) {
        if (e.type === "h3") panes.push({ q: e.text, a: [] });
        else if (e.type === "p" && panes.length) panes[panes.length - 1].a.push(txt(e.text));
        else fail(c, "use ### for each question and paragraphs for answers");
      }
      const accId = ctx.id();
      const paneHtml = panes.map((p, i) => {
        const id = ctx.id();
        const answer = heading({ uniqueID: ctx.id(), ...MB.px(), htmlTag: "p" }, p.a.join("<br><br>"));
        return block("kadence/pane", { ...(i ? { id: i + 1 } : {}), titleTag: "h3", uniqueID: id },
          `<div class="wp-block-kadence-pane kt-accordion-pane kt-accordion-pane-${i + 1} kt-pane${id}"><h3 class="kt-accordion-header-wrap"><button class="kt-blocks-accordion-header kt-acccordion-button-label-show" type="button"><span class="kt-blocks-accordion-title-wrap"><span class="kt-blocks-accordion-title">${txt(p.q)}</span></span><span class="kt-blocks-accordion-icon-trigger"></span></button></h3><div class="kt-accordion-panel"><div class="kt-accordion-panel-inner">${answer}</div></div></div>`);
      });
      const acc = block("kadence/accordion", { uniqueID: accId, paneCount: panes.length, startCollapsed: true, linkPaneCollapse: false, contentBgColor: "palette8", contentBorderStyle: [{ top: ["palette3", "", ""], right: ["palette6", "", 1], bottom: ["palette6", "", 1], left: ["palette6", "", 1], unit: "px" }], contentBorderRadius: [15, 15, 15, 15], titleStyles: [{ size: [28, 25, ""], sizeType: "px", lineHeight: ["", 1.2, ""], lineType: "", family: "", google: "", style: "", weight: "", variant: "", subset: "", loadGoogle: true, padding: ["sm", "sm", "sm", "sm"], marginTop: 18, color: "palette5", background: "palette8", border: BW(), borderRadius: BW(), borderWidth: BW(), colorHover: "palette7", backgroundHover: "#eeeeee", borderHover: BW(), colorActive: "palette7", backgroundActive: "", borderActive: BW(), textTransform: "" }], titleBorder: [side4("palette6")], titleBorderHover: [side4("palette6")], titleBorderActive: [side4("palette3")], titleBorderRadius: [15, 15, 15, 15], iconStyle: "arrow", iconColor: { standard: "#888888", active: "palette7", hover: "palette5" }, faqSchema: true, columnGap: ["sm", "", ""] },
        `<div class="wp-block-kadence-accordion alignnone"><div class="kt-accordion-wrap kt-accordion-id${accId} kt-accordion-has-${panes.length}-panes kt-active-pane-0 kt-accordion-block kt-pane-header-alignment-left kt-accodion-icon-style-arrow kt-accodion-icon-side-right" style="max-width:none"><div class="kt-accordion-inner-wrap" data-allow-multiple-open="true" data-start-open="none">${paneHtml.join("\n\n")}</div></div></div>`);
      return row({ uniqueID: ctx.id(), columns: 1, colLayout: "equal", firstColumnWidth: 0, secondColumnWidth: 0, ...ZERO, inheritMaxWidth: true, kbVersion: 2, className: rise(c.attrs.rise, "lift") },
        [column({ borderWidth: BW(), uniqueID: ctx.id(), kbVersion: 2 }, [acc])]);
    },

    // The site's own page rules, before anything is drawn.
    check: (comps, ctx) => {
      let last = null;
      comps.forEach((c, i) => {
        if (c.attrs.rise && !S.rise[c.attrs.rise]) ctx.errors.push(`::: ${c.name} (line ${c.line}): rise=${c.attrs.rise} (use ${Object.keys(S.rise).join(", ")})`);
        if (c.attrs.rise === "sweep") {
          // A section is about a screen tall: two sweeps need a section between them (wave-system.md §4.4).
          const at = comps.slice(0, i + 1).filter(x => ["hero", "heading", "title", "band", "cta-card"].includes(x.name)).length;
          if (last !== null && at - last < 2) ctx.warn(`::: ${c.name} (line ${c.line}): rise=sweep at most once per screen; another sweep is in this or the section above`);
          last = at;
        }
      });
    },
  };
};
