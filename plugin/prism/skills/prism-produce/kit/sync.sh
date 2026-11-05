#!/usr/bin/env bash
# Brings a workspace's copy of the kit up to this kit. Run it from the plugin's own kit, never from the copy:
#   bash <plugin>/skills/prism-produce/kit/sync.sh <workspace>/.prism-kit
# A new copy, a different kit (a plugin upgrade, a moved plugin) or an old copy with no stamp is replaced whole, keeping
# only the installed tools (mods/, node_modules/); setup runs again on the next build. Prints one line when it changes
# anything and nothing when the copy is current.
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DST="${1:-.prism-kit}"
mkdir -p "$DST"
DST="$(cd "$DST" && pwd)"
[ "$SRC" = "$DST" ] && exit 0
# One sync or setup at a time.
exec 9>"$DST/.setup.lock"; command -v flock >/dev/null && flock 9
KEEP='mods|node_modules|.setup.lock'
# The kit's own files; the copy is compared file by file against this list, so a file edited or deleted in the copy
# (a build script "fixed" in place) is put back too. Files only the copy has (caches, logs) don't count.
LIST="$(mktemp)"; trap 'rm -f "$LIST"' EXIT
(cd "$SRC" && find . -type f ! -path './mods/*' ! -path './node_modules/*' ! -path './cache/*' ! -path '*/__pycache__/*' \
  ! -name '.ready-*' ! -name env.sh ! -name .setup.lock ! -name .kit-stamp ! -name .launch-error ! -name setup.log -print0 | LC_ALL=C sort -z) > "$LIST"
fingerprint() { (cd "$1" && xargs -0 cksum < "$LIST" 2>&1 | cksum | cut -d' ' -f1); }
ver() { cat "$1/VERSION" 2>/dev/null || echo "?"; }
want="$(ver "$SRC") $(fingerprint "$SRC")"
have="$(cat "$DST/.kit-stamp" 2>/dev/null || true)"
# Current when the stamp matches (the kit hasn't changed, nor its file list) and every file still matches.
[ "$want" = "$have" ] && [ "$want" = "$(ver "$DST") $(fingerprint "$DST")" ] && exit 0
was="$(ver "$DST")"; [ -f "$DST/run.sh" ] || was=""
# Replace everything but the installed tools: files the new kit dropped must not linger (an old brand would still list).
find "$DST" -mindepth 1 -maxdepth 1 | grep -Ev "/($KEEP)\$" | while IFS= read -r f; do rm -rf "$f"; done
(cd "$SRC" && tar --exclude=./mods --exclude=./node_modules --exclude=./cache --exclude='./.ready-*' --exclude=./env.sh \
  --exclude=./.setup.lock --exclude=./.kit-stamp -cf - .) | (cd "$DST" && tar -xf -)
echo "$want" > "$DST/.kit-stamp"
if [ -z "$was" ]; then echo "kit: $(ver "$SRC") ready in $DST"
elif [ "$was" = "$(ver "$SRC")" ]; then echo "kit: refreshed $DST ($was, changed files)"
else echo "kit: updated $DST from $was to $(ver "$SRC")"; fi
