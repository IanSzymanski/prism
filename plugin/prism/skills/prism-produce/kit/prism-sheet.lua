-- `![](prism:logo)` and other `prism:<asset>` sources are the brand's own files (asset roles), set by the builder.
-- `![](brand:<id>)` is a photo from the brand's image library (profile `library`), also set by the builder.
-- Every photo's crop centres on its focal point: `{focus="30% 40%"}` when written, else the one images.py found
-- (.focus.json beside the file), else the library's; without one the crop stays centred.
local focal_cache = {}
local function focal(file)
  local dir, name = file:match("^(.-)([^/]+)$")
  if focal_cache[dir] == nil then
    focal_cache[dir] = false
    local f = io.open(dir .. ".focus.json", "r")
    if f then
      local ok, t = pcall(pandoc.json.decode, f:read("a"), false)
      f:close()
      if ok and type(t) == "table" then focal_cache[dir] = t end
    end
  end
  return focal_cache[dir] and focal_cache[dir][name] or nil
end

local function base_dir()
  local f = PANDOC_STATE.input_files[1]
  return f and f:match("^(.*/)") or ""
end

function Image(img)
  local name = img.src:match("^prism:([%w-]+)$")
  local lib = img.src:match("^brand:([%w-]+)$")
  local focus = img.attributes.focus
  img.attributes.focus = nil
  if name then
    local p = os.getenv("PRISM_ASSET_" .. name:upper():gsub("-", "_"))
    -- A brand without a logo for dark grounds loses the logo there (never its light-ground logo on dark); other missing assets stop the build.
    if not p and name == "logo-on-dark" then
      io.stderr:write("[sheet] the brand has no logo for dark grounds (prism-asset-logo-on-dark): left out\n")
      return {}
    end
    if not p then error("prism-sheet.lua: the brand has no asset \"" .. name .. "\" (prism-asset-" .. name .. ")") end
    img.src = "file://" .. p
  elseif lib then
    local key = "PRISM_LIBRARY_" .. lib:upper():gsub("-", "_")
    local p = os.getenv(key)
    if not p then error("prism-sheet.lua: library photo \"" .. lib .. "\" is not in the brand's library or not fetched yet (run.sh library <brand> --need <format files>)") end
    img.src = "file://" .. p
    focus = focus or os.getenv(key .. "_FOCUS")
  elseif not img.src:match("^%a+:") then
    local file = img.src:sub(1, 1) == "/" and img.src or base_dir() .. img.src
    focus = focus or focal(file)
  end
  -- The page centres the crop on it once the frame size is known (focus.js).
  if focus then img.attributes["data-focus"] = focus end
  return img
end

-- Wraps h2 text in a span (so a brand ornament can sit beside it as one flex item) and numbers each section
-- (data-n and .prism-n-<n>) so a brand layer can vary its heading ornament by section.
local section = 0
function Header(h)
  if h.level == 2 then
    section = section + 1
    h.content = { pandoc.Span(h.content, { class = "h2-text" }) }
    h.attributes["data-n"] = tostring(section)
    h.classes:insert("prism-n-" .. section)
  end
  return h
end

-- Icons are written []{.icon .ph-NAME}; the brand's Phosphor weight class is added here.
function Span(s)
  if s.classes:includes("icon") then
    local w = os.getenv("PRISM_ICON_CLASS") or "ph-light"
    if not s.classes:includes(w) then s.classes:insert(w) end
    return s
  end
end

-- Groups everything after the image in a media row into one text column.
function Div(el)
  if el.classes:includes("media") and #el.content > 1 then
    local first = el.content[1]
    local rest = pandoc.List({})
    for i = 2, #el.content do rest:insert(el.content[i]) end
    el.content = pandoc.List({ first, pandoc.Div(rest, { class = "media__text" }) })
  end
  return el
end

-- A one-pager carries no document type: "One-pager" or "One sheet" in the top-right corner says nothing.
function Meta(meta)
  local t = meta.doctype and pandoc.utils.stringify(meta.doctype):lower():gsub("[%s%-]", "")
  if t == "onepager" or t == "onesheet" or t == "onesheeter" then meta.doctype = nil end
  return meta
end

-- Brochures: every three panel slots become one printed side (outside first, then inside). A `.wide` panel takes two, a `.full` panel all three.
function Pandoc(doc)
  local out, side, n = pandoc.List({}), pandoc.List({}), 0
  local function flush()
    if #side > 0 then
      n = n + 1
      out:insert(pandoc.Div(side, { class = "spread " .. (n == 1 and "outside" or "inside") }))
      side = pandoc.List({})
    end
  end
  local found, slots = false, 0
  for _, b in ipairs(doc.blocks) do
    if b.t == "Div" and b.classes:includes("panel") then
      found = true
      side:insert(b)
      slots = slots + (b.classes:includes("full") and 3 or b.classes:includes("wide") and 2 or 1)
      if slots >= 3 then flush(); slots = 0 end
    else
      flush()
      out:insert(b)
    end
  end
  flush()
  if found then doc.blocks = out end
  return doc
end
