# Deprecated: ChatGPT edition

As of October 2026 the ChatGPT edition of Prism is deprecated and frozen. Prism has outgrown what the ChatGPT edition can carry (agents, design mode, co-op, proof docs), so keeping the two in step no longer pays for itself.

- Nothing here is updated, built or tested. Plugin changes don't need to stay ChatGPT-compatible.
- Build the plugin with `python3 tools/build.py <VERSION>`.
- `convert.py` refuses to run unless `PRISM_CHATGPT_LEGACY=1` is set, and its edits may no longer apply to the current plugin.
