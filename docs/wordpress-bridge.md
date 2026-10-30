# WordPress bridge: ca-prism-bridge (spec, not built)

A WordPress plugin on the Case Amplify subsite that takes what `run.sh web` builds and creates draft pages, so nobody pastes markup by hand. It is not part of Prism: Prism's side of the contract is `<tag>-blocks.html`, `<tag>-page.json` and `images/`. Carried over from ca-web's `docs/PLUGIN-SPEC.md` (Oct 30), with Prism's file names.

Until it exists, and until Ian says the "Case Amplify Website" connector is ready, Prism delivers the files and the page is pasted into a new draft's Code editor.

## Architecture

- Register the tools with the WordPress Abilities API (in core since 6.9) and expose them over MCP with the official MCP Adapter plugin, not a custom MCP server.
- Connector: "Case Amplify Website". Never the IntelliTect "Website" connector.
- Auth: application password or OAuth; check `edit_pages` and `upload_files`. Saving `core/html` blocks (the CTA card, the section rules) needs `unfiltered_html`, which on a multisite only super admins have. A non-super-admin save has its SVG and `data-` attributes stripped: test this first, and either save as a user with the capability or allow those tags on the server.
- The plugin ships no front-end CSS or JS. The child theme owns styling and motion.

## What Prism hands over

`<tag>-page.json`:

| Key | What |
|---|---|
| `prism_piece_id` | The piece and output (`<project>-web`), stable across versions and slug changes: the page's identity |
| `version` | content.md's version for this build |
| `title`, `slug`, `parent`, `post` | The page. `post` is 0 for a new page; Kadence block ids start with it (`0_…`) |
| `template`, `template_meta` | The template name and the page settings it means (profile `web.templates`; for `inner`, the Kadence page meta) |
| `seo_title`, `description`, `focus` | Yoast: `_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, `_yoast_wpseo_focuskw` |
| `markup` | The blocks file's name |
| `placeholder` | `{id, url}` of the photo unfilled slots show (media 3901) |
| `slots` | `[{name, alt, component, line, file, source, sha256, focus}]`: `file` is the photo to upload from `images/` (null when the page still needs one), `focus` its focal point as `x% y%` |
| `media` | `[{id, url, alt}]`: photos already in the media library |

In the markup a slot is the placeholder image: `kb-img wp-image-3901`, its `src`, `"id":3901` in the block's attributes, and alt text starting `[Image slot: <name>] `.

## Tools

### `ca/upload-media`

- Input: the file as base64 or a URL, filename, alt text, optional focal point.
- Sideload into the media library. Store the file's SHA-256 in attachment meta and return the existing attachment when the same file was uploaded before (page.json carries the hash, so Prism-built photos are never uploaded twice).
- Output: `{ id, url, width, height }`.

### `ca/build-page`

- Input: `markup`, `title`, `slug`, `parent`, `template`, `seo_title`, `description`, `focus`, `prism_piece_id`, `slots: { name: mediaId }`.
- Steps:
  1. Find the page by `prism_piece_id` (post meta `_ca_prism_piece`); none means a new draft.
  2. Swap the `0_` prefix of every Kadence uniqueID for the real post id, in attributes and HTML (pattern `(?<!\d)0_[0-9a-f]{6}-[0-9a-f]{2}`).
  3. Fill each supplied slot: the placeholder's class, `src`, `"id"` and the `[Image slot: name] ` prefix of its alt text.
  4. `parse_blocks()` the result and reject it when any non-whitespace text sits outside a block (Prism checks the same before delivering).
  5. Save `post_content`. Status is always `draft`.
  6. Apply the template's page meta and the Yoast meta.
  7. Store a hash of the saved content in `_ca_prism_hash`.
- Update: when the page exists and its content hash differs from `_ca_prism_hash`, someone edited it in WordPress. Until Ian decides where edits live (below), refuse and return a summary of the changed blocks (Prism's `run.sh web compare` gives the same list from the two markups).
- Output: `{ id, edit_url, preview_url, unfilled_slots: [...] }`.

### `ca/get-page-status`

- Input: `prism_piece_id` or a page id. Output: status, last push time, whether it was edited in WordPress since, unfilled slots.

### `ca/list-components`

The component vocabulary and the pattern ids it depends on, so Prism can confirm the site still has them before building (profile `web.patterns`, `web.synced`).

## Open decision: where edits live (Ian)

After a push Ian can edit blocks in WordPress, and the next push would overwrite them.

- (a) Prism owns the page: the plugin refuses a push when the page changed since the last one.
- (b) WordPress owns the page after its first publish.
- (c) Two-way: a reverse converter (blocks to web.md). `run.sh web compare` and the VR fixture are its starting point.

Prism's produce skill already asks for the page's markup and compares it before rebuilding a page edited on the site, which works under any of the three.

## Tests

1. Push `fixtures/web.md`'s build: a draft whose body classes match the VR page's (`content-title-style-hide content-width-fullwidth content-style-unboxed content-vertical-padding-hide`), no "unexpected content" warnings, all seven slots listed.
2. Push the VR page as a new page: the editor validates every block.
3. Push as a non-super-admin: the CTA card's SVG survives, or the HTML filter problem above shows.
4. Push the same piece twice: one page, updated.
5. Edit a block in WordPress, push again: refused, with the changed blocks.
6. Cookiebot: the page works on first load in a fresh private window after "reject all" (wave-system.md §5.4).
