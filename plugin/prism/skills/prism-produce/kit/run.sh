#!/usr/bin/env bash
# One entry point for every build: ./run.sh sheet|deck|social|blog|email|tag|check|preview|images|verify|fonts|vet|resolve|brands|library|state|palette|swatch|pin <args>
# Runs the setup a build needs the first time it is used, so no separate setup step is required.
KIT="$(cd "$(dirname "$0")" && pwd)"
cmd="$1"; shift
case "$cmd" in sheet|social|blog|email|wire|swatch) part=sheet ;; deck) part=deck ;; *) part="" ;; esac
if [ -n "$part" ] && [ ! -f "$KIT/.ready-$part" ]; then bash "$KIT/setup.sh" "$part" || exit 1; fi
[ -f "$KIT/env.sh" ] && . "$KIT/env.sh"
[ -n "$NODE_PATH" ] || export NODE_PATH="$KIT/node_modules:$(npm root -g 2>/dev/null)"
case "$cmd" in
  sheet)   node "$KIT/build-sheet.js" "$@" ;;
  deck)    node "$KIT/build-deck.js" "$@" ;;
  social)  node "$KIT/build-social.js" "$@" ;;
  blog)    node "$KIT/build-blog.js" "$@" ;;
  email)   node "$KIT/build-email.js" "$@" ;;
  tag)     node "$KIT/naming.js" "$@" ;;
  check)   node "$KIT/check-numbers.js" "$@" ;;
  preview) python3 "$KIT/preview.py" "$@" ;;
  images)  python3 "$KIT/images.py" "$@" ;;
  verify)  python3 "$KIT/verify.py" "$@" ;;
  fonts)   python3 "$KIT/fontpack.py" "$@" ;;
  wire)    node "$KIT/build-wire.js" "$@" ;;
  wire-diff) python3 "$KIT/wire_diff.py" "$@" ;;
  vet)     python3 "$KIT/vet.py" "$@" ;;
  resolve) node "$KIT/resolve.js" "$@" ;;
  brands)  node "$KIT/brands.js" "$@" ;;
  library) node "$KIT/library.js" "$@" ;;
  state)   node "$KIT/state.js" "$@" ;;
  palette) node "$KIT/palette.js" "$@" ;;
  swatch)  node "$KIT/swatch.js" "$@" ;;
  pin)     node "$KIT/pin.js" "$@" ;;
  setup)   bash "$KIT/setup.sh" "$@" ;;
  *) echo "usage: run.sh sheet|deck|social|blog|email|tag|check|preview|images|verify|fonts|vet|resolve|brands|library|state|palette|swatch|pin|wire|wire-diff|setup <args>"; exit 2 ;;
esac
