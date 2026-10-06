#!/usr/bin/env bash
# Gets the build tools ready for one output type and remembers it. Usage: setup.sh [sheet|social|deck|all]
# sheet (also brochure), social (also email, carousel): pandoc + Chromium. deck: adds pptxgenjs, sharp and the Office fonts.
# Works in Claude (Cowork) and ChatGPT sandboxes; anything missing comes from the npm and PyPI registries.
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"
cd "$KIT"
# One setup at a time: a second call waits here, then finds the tools ready.
exec 9>"$KIT/.setup.lock"; command -v flock >/dev/null && flock 9
PART="${1:-all}"
[ "$PART" = all ] && PARTS="sheet deck" || PARTS="$PART"
[ "$PARTS" = social ] && PARTS=sheet
say() { echo "setup: $*"; }
t() { timeout "$@"; }   # every step that can hang gets a time limit
touch env.sh; . ./env.sh

command -v node >/dev/null || { say "MISSING node"; exit 1; }
if ! grep -q NODE_PATH env.sh; then
  G="$(npm root -g 2>/dev/null || true)"
  M="$KIT/mods"
  echo "export NODE_PATH=\"$M/playwright/node_modules:$M/pptxgenjs/node_modules:$M/sharp/node_modules:$M/chromium/node_modules:$KIT/node_modules${G:+:$G}\"" >> env.sh; . ./env.sh
fi
has() { node -e "require('$1')" 2>/dev/null; }
pkg() { node -e "const p=require('./package.json').dependencies;console.log('$1@'+p['$1'])"; }
# Each package gets its own folder, so installing one never removes another.
inst() { mkdir -p "mods/$1" && t 180 npm install --prefix "mods/$1" --no-audit --no-fund --silent "$2"; }
need() { for m in "$@"; do has "$m" || { say "installing $m"; inst "$m" "$(pkg "$m")"; }; done; }

# pandoc: system copy, else the pip wheel that bundles the binary.
if command -v pandoc >/dev/null; then say "pandoc ok"; else
  say "installing pandoc (pypandoc_binary)"
  t 180 pip install -q pypandoc_binary 2>/dev/null || t 180 pip install -q --break-system-packages pypandoc_binary
  PD="$(python3 -c 'import os,pypandoc;print(os.path.dirname(pypandoc.get_pandoc_path()))')"
  echo "export PATH=\"$PD:\$PATH\"" >> env.sh; . ./env.sh
fi

# Chromium: Playwright's own, else a Playwright download, else the npm-packaged build.
need playwright
launch() { t 45 node -e "require('playwright').chromium.launch(process.env.PRISM_CHROMIUM?{executablePath:process.env.PRISM_CHROMIUM}:{}).then(b=>b.close())" 2>/dev/null; }
if launch; then say "chromium ok"; else
  say "no working Chromium; trying a Playwright download"
  t 120 npx --yes playwright install chromium >/dev/null 2>&1 || true
  if ! launch; then
    say "installing @sparticuz/chromium"
    inst chromium @sparticuz/chromium@141
    export PRISM_CHROMIUM="$(t 60 node -e "require('@sparticuz/chromium').executablePath().then(p=>console.log(p))")"
    echo "export PRISM_CHROMIUM=\"$PRISM_CHROMIUM\"" >> env.sh
    launch || { say "MISSING a working Chromium"; exit 1; }
    say "chromium ok (npm build)"
  fi
fi

# PDF previews: poppler if present, else PyMuPDF. Optional, so it never fails setup.
command -v pdftoppm >/dev/null || python3 -c "import pymupdf" 2>/dev/null || \
  { t 120 pip install -q pymupdf 2>/dev/null || t 120 pip install -q --break-system-packages pymupdf 2>/dev/null || say "no PDF preview renderer (previews skipped)"; }
# pikepdf joins Chromium's letter-by-letter text into whole lines (copy, search, screen readers).
python3 -c "import pikepdf" 2>/dev/null || { say "installing pikepdf"; t 120 pip install -q pikepdf 2>/dev/null || t 120 pip install -q --break-system-packages pikepdf 2>/dev/null || say "pikepdf unavailable (PDF text stays letter by letter)"; }
touch .ready-sheet

if [[ " $PARTS " == *" deck "* ]]; then
  need pptxgenjs sharp
  # Office copies of the fonts for deck previews; only the new folder is indexed, which is fast.
  mkdir -p "$HOME/.fonts" && node -e 'const fs=require("fs"),p=require("path"),k=process.argv[1];for(const b of fs.readdirSync(p.join(k,"brands"))){const f=p.join(k,"brands",b,"profile.json");if(!fs.existsSync(f))continue;const o=(JSON.parse(fs.readFileSync(f,"utf8")).office||{}).files||{};for(const x of Object.keys(o))console.log(p.join(k,"brands",b,x))}' "$KIT" | while read -r f; do cp "$f" "$HOME/.fonts/"; done && (t 20 fc-cache "$HOME/.fonts" >/dev/null 2>&1 || true)
  touch .ready-deck
  say "deck tools ok"
fi
say "ready ($PART)"
