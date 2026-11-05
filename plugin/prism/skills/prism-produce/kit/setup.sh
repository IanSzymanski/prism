#!/usr/bin/env bash
# Gets the build tools ready for one output type and remembers it. Usage: setup.sh [sheet|social|deck|illustration|web|all]
# sheet (also brochure), social (also email, carousel): pandoc + Chromium. deck: adds pptxgenjs, sharp and the Office fonts.
# illustration: Chromium plus GSAP, which the bench page carries and the checks play (the website has its own copy).
# web: only WordPress's block parser, which checks every page's markup; no browser.
# Works in Claude (Cowork) and ChatGPT sandboxes; anything missing comes from the npm and PyPI registries.
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"
cd "$KIT"
# One setup at a time: a second call waits here, then finds the tools ready.
exec 9>"$KIT/.setup.lock"; command -v flock >/dev/null && flock 9
PART="${1:-all}"
[ "$PART" = all ] && PARTS="sheet deck illustration web" || PARTS="$PART"
[ "$PARTS" = social ] && PARTS=sheet
say() { echo "setup: $*"; }
# Every step that can hang gets a time limit: GNU timeout, Homebrew's gtimeout on a Mac, else none.
if command -v timeout >/dev/null; then t() { timeout "$@"; }
elif command -v gtimeout >/dev/null; then t() { gtimeout "$@"; }
else t() { shift; "$@"; }; fi
# env.sh holds only what belongs to the machine; an older kit's NODE_PATH line (absolute, so stale once the kit moves) goes.
touch env.sh; grep -v '^export NODE_PATH=' env.sh > env.sh.new || true; mv env.sh.new env.sh; . ./env.sh

command -v node >/dev/null || { say "MISSING node"; exit 1; }
if [ -z "$PRISM_NPM_GLOBAL" ] || [ ! -d "$PRISM_NPM_GLOBAL" ]; then
  sed -i.bak '/PRISM_NPM_GLOBAL/d' env.sh; rm -f env.sh.bak
  G="$(npm root -g 2>/dev/null || true)"; [ -n "$G" ] && echo "export PRISM_NPM_GLOBAL=\"$G\"" >> env.sh; . ./env.sh
fi
. "$KIT/kitenv.sh"
has() { node -e "require('$1')" 2>/dev/null; }
pkg() { node -e "const p=require('./package.json').dependencies;console.log('$1@'+p['$1'])"; }
# Each package gets its own folder, so installing one never removes another.
inst() { mkdir -p "mods/$1" && t 180 npm install --prefix "mods/$1" --no-audit --no-fund --silent "$2"; }
need() { for m in "$@"; do has "$m" || { say "installing $m"; inst "$m" "$(pkg "$m")"; }; done; }

# A website page needs only the block parser.
if [ "$PARTS" = web ]; then need @wordpress/block-serialization-default-parser; prism_mark web; say "web tools ok"; say "ready (web)"; exit 0; fi

# pandoc: system copy, else the pip wheel that bundles the binary.
if command -v pandoc >/dev/null; then say "pandoc ok"; else
  say "installing pandoc (pypandoc_binary)"
  t 180 python3 -m pip install -q pypandoc_binary 2>/dev/null || t 180 python3 -m pip install -q --break-system-packages pypandoc_binary
  PD="$(python3 -c 'import os,pypandoc;print(os.path.dirname(pypandoc.get_pandoc_path()))')"
  echo "export PATH=\"$PD:\$PATH\"" >> env.sh; . ./env.sh
fi

# Chromium: Playwright's own, else a Playwright download, else the npm-packaged build.
need playwright
LAUNCH_ERR="$KIT/.launch-error"
launch() { t 45 node -e "require('playwright').chromium.launch(process.env.PRISM_CHROMIUM?{executablePath:process.env.PRISM_CHROMIUM}:{}).then(b=>b.close())" 2>"$LAUNCH_ERR"; }
# The npm-packaged browser, from a copy installed earlier or a new install, remembered in env.sh.
sparticuz() {
  export PRISM_CHROMIUM="$(t 60 node -e "require('@sparticuz/chromium').executablePath().then(p=>console.log(p))" 2>/dev/null)"
  sed -i.bak '/PRISM_CHROMIUM/d' env.sh; rm -f env.sh.bak
  echo "export PRISM_CHROMIUM=\"$PRISM_CHROMIUM\"" >> env.sh
}
[ -n "$PRISM_CHROMIUM" ] && [ ! -x "$PRISM_CHROMIUM" ] && unset PRISM_CHROMIUM
if launch; then say "chromium ok"
elif [ -d mods/chromium/node_modules/@sparticuz ] && sparticuz && launch; then say "chromium ok (npm build)"
else
  unset PRISM_CHROMIUM
  # The browser build for the Playwright that loads (the kit's pinned one, else a global one), never the newest.
  PWV="$(node -p "require('playwright/package.json').version" 2>/dev/null)"
  say "no working Chromium; trying a Playwright ${PWV:-} download"
  t 120 npx --yes "playwright${PWV:+@$PWV}" install chromium >/dev/null 2>&1 || true
  if ! launch; then
    say "installing @sparticuz/chromium"
    inst chromium @sparticuz/chromium@141
    sparticuz
    launch || { say "MISSING a working Chromium: $(grep -v '^\s*$' "$LAUNCH_ERR" | tail -1)"; rm -f "$LAUNCH_ERR"; exit 1; }
    say "chromium ok (npm build)"
  fi
fi
rm -f "$LAUNCH_ERR"

# PDF previews: poppler if present, else PyMuPDF. Optional, so it never fails setup.
pipi() { t 120 python3 -m pip install -q "$1" 2>/dev/null || t 120 python3 -m pip install -q --break-system-packages "$1" 2>/dev/null; }
command -v pdftoppm >/dev/null || python3 -c "import pymupdf" 2>/dev/null || pipi pymupdf || say "no PDF preview renderer (previews skipped)"
# Pillow: photos (run.sh images) and contact sheets (run.sh preview).
python3 -c "import PIL" 2>/dev/null || { say "installing Pillow"; pipi pillow || say "Pillow unavailable (photos and previews will fail)"; }
# pikepdf joins Chromium's letter-by-letter text into whole lines (copy, search, screen readers).
python3 -c "import pikepdf" 2>/dev/null || { say "installing pikepdf"; pipi pikepdf || say "pikepdf unavailable (PDF text stays letter by letter)"; }
prism_mark sheet

if [[ " $PARTS " == *" deck "* ]]; then
  need pptxgenjs sharp
  # Office copies of the fonts for deck previews; only the new folder is indexed, which is fast.
  mkdir -p "$HOME/.fonts" && node -e 'const fs=require("fs"),p=require("path"),k=process.argv[1];for(const b of fs.readdirSync(p.join(k,"brands"))){const f=p.join(k,"brands",b,"profile.json");if(!fs.existsSync(f))continue;const o=(JSON.parse(fs.readFileSync(f,"utf8")).office||{}).files||{};for(const x of Object.keys(o))console.log(p.join(k,"brands",b,x))}' "$KIT" | while read -r f; do cp "$f" "$HOME/.fonts/"; done && (t 20 fc-cache "$HOME/.fonts" >/dev/null 2>&1 || true)
  prism_mark deck
  say "deck tools ok"
fi
if [[ " $PARTS " == *" illustration "* ]]; then
  need gsap
  prism_mark illustration
  say "illustration tools ok"
fi
if [[ " $PARTS " == *" web "* ]]; then
  need @wordpress/block-serialization-default-parser
  prism_mark web
  say "web tools ok"
fi
say "ready ($PART)"
