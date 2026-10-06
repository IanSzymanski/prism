-- `![](prism:logo)` and other `prism:<asset>` sources are the brand's own files (asset roles), set by the builder.
function Image(img)
  local name = img.src:match("^prism:([%w-]+)$")
  if not name then return nil end
  local p = os.getenv("PRISM_ASSET_" .. name:upper():gsub("-", "_"))
  if not p then error("prism-sheet.lua: the brand has no asset \"" .. name .. "\" (prism-asset-" .. name .. ")") end
  img.src = "file://" .. p
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
