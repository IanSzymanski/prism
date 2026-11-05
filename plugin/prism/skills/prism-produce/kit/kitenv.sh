# Sourced by run.sh and setup.sh with KIT set. The module path is worked out from the kit's own location every time and
# never stored, so a moved or re-copied kit finds its tools. env.sh keeps only what belongs to the machine (a pip pandoc's
# folder, a downloaded browser, npm's global folder).
M="$KIT/mods"
NODE_PATH="$M/playwright/node_modules:$M/pptxgenjs/node_modules:$M/sharp/node_modules:$M/chromium/node_modules:$M/gsap/node_modules:$M/@wordpress/block-serialization-default-parser/node_modules:$KIT/node_modules"
[ -n "$PRISM_NPM_GLOBAL" ] && [ -d "$PRISM_NPM_GLOBAL" ] && NODE_PATH="$NODE_PATH:$PRISM_NPM_GLOBAL"
export NODE_PATH
# The stamp a ready marker holds: the kit's place, version and dependencies. Any change sets the tools up again.
PRISM_READY_STAMP="$KIT|$(cat "$KIT/VERSION" 2>/dev/null)|$(cksum < "$KIT/package.json" | cut -d' ' -f1)"
prism_ready() { [ -f "$KIT/.ready-$1" ] && [ "$(cat "$KIT/.ready-$1")" = "$PRISM_READY_STAMP" ]; }
prism_mark() { echo "$PRISM_READY_STAMP" > "$KIT/.ready-$1"; }
