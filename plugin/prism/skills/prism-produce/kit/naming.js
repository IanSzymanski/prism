// One naming rule for every exported file, so files from different pieces, outputs and rounds never mix:
//   <slug>-<output>-v<version>[-<part>].<ext>      e.g. cedar-hollow-html-email-v3.html, cedar-hollow-social-v2-post-1.png
// slug: the project folder (the one holding content.md), output: the format file's name, version: content.md's `version:`.
// The output is always kept, even when the slug ends with it (ca-one-sheet + sheet -> ca-one-sheet-sheet), so two outputs never share a tag.
// Usage from the shell: node naming.js formats/sheet.md   (prints the tag)
const fs = require("fs"), path = require("path");

const kebab = s => String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

function projectOf(formatFile) {
  let d = path.dirname(path.resolve(formatFile));
  for (let i = 0; i < 3; i++) { if (fs.existsSync(path.join(d, "content.md"))) return d; d = path.dirname(d); }
  return path.basename(path.dirname(path.resolve(formatFile))) === "formats" ? path.dirname(path.dirname(path.resolve(formatFile))) : null;
}

function tagFor(formatFile, meta = {}) {
  const proj = projectOf(formatFile);
  const output = kebab(meta.output || path.basename(formatFile, ".md"));
  const slug = kebab(meta.slug || (proj ? path.basename(proj) : "") || meta.title || "piece");
  // Quick mode has no content.md, so its tag has no version.
  let version = meta.version;
  if (!version && proj && fs.existsSync(path.join(proj, "content.md"))) { const m = /^version:\s*["']?v?(\d+)/m.exec(fs.readFileSync(path.join(proj, "content.md"), "utf8").replace(/\r\n/g, "\n").split(/\n---\s*\n/)[0]); if (m) version = m[1]; }
  return [slug, output, version ? "v" + String(version).replace(/^v/i, "") : ""].filter(Boolean).join("-");
}

const named = (tag, part, ext) => `${tag}${part ? "-" + kebab(part) : ""}${ext}`;

module.exports = { tagFor, named, kebab };
if (require.main === module) console.log(tagFor(process.argv[2]));
