-- Source text is material, never code (S1). A format file is written from pasted documents, transcripts and other people's
-- comments, and the page it becomes runs in a browser that can read local files, so nothing in it may run there:
--   * raw HTML is dropped, except an editor's comment (dropped silently: it never shows) and a few plain inline tags
--     with no attributes (<br>, <strong>, <em>, <sup>, <sub> ...), which Prism's own Markdown could have written anyway;
--   * attributes that run script (onload=, onerror=, srcdoc= ...) and javascript:, vbscript: and data:text/html addresses go.
-- It runs before every other filter, so the HTML the kit's own filters write is untouched. Each kind of removal is
-- reported once, in one line.
local said = {}
local function say(what)
  if said[what] then return end
  said[what] = true
  io.stderr:write("[safe] removed " .. what .. " (format files are Prism Markdown; HTML and scripts never run)\n")
end

local PLAIN = { b = true, strong = true, i = true, em = true, u = true, s = true, sup = true, sub = true, small = true, mark = true }

local function unsafe_url(u)
  local s = (u or ""):lower():gsub("[%s%c]", "")
  return s:match("^javascript:") or s:match("^vbscript:") or s:match("^data:text/html")
end

local function is_html(el) return el.format == "html" or el.format == "html5" or el.format == "html4" end

local function raw(el, inline)
  if not is_html(el) then return nil end
  local t = el.text
  if t:match("^%s*<!%-%-.-%-%->%s*$") then return {} end
  if inline and t:match("^%s*<[bB][rR]%s*/?%s*>%s*$") then return pandoc.LineBreak() end
  local tag, rest = t:match("^%s*</?([%a][%w]*)(.-)>%s*$")
  if inline and tag and PLAIN[tag:lower()] and rest:match("^%s*/?%s*$") then return nil end
  local name = (t:match("^%s*<%s*/?%s*([%a][%w-]*)") or "html"):lower()
  say("<" .. name .. ">")
  return {}
end

local function clean(attr)
  if not attr or not attr.attributes then return false end
  local drop = {}
  for k, v in pairs(attr.attributes) do
    local key = tostring(k):lower()
    if key:match("^on") or key == "srcdoc" or key == "formaction" or unsafe_url(v) then
      drop[#drop + 1] = k
    end
  end
  for _, k in ipairs(drop) do attr.attributes[k] = nil; say("the attribute " .. tostring(k) .. "=") end
  return #drop > 0
end

local function withattr(el) if clean(el.attr) then return el end end

return {
  {
    RawInline = function(el) return raw(el, true) end,
    RawBlock = function(el) return raw(el, false) end,
    Link = function(el)
      local changed = clean(el.attr)
      if unsafe_url(el.target) then say("a script address"); return el.content end
      if changed then return el end
    end,
    Image = function(el)
      local changed = clean(el.attr)
      if unsafe_url(el.src) then say("a script address"); return {} end
      if changed then return el end
    end,
    Div = withattr, Span = withattr, Header = withattr, Code = withattr, CodeBlock = withattr, Table = withattr, Figure = withattr,
  },
}
