-- Keeps terms such as "SOC 2 Type II", the brand name and any hyphenated word built on them ("HIPAA-compliant",
-- "SOC 2-aligned") on one line. Terms come from PRISM_UNBROKEN (one per line, set by brand.js), longest first.
-- HTML gets a no-wrap span, so no special characters (or fonts for them) are needed; other formats (the deck's JSON)
-- get non-breaking spaces. content.md and format files stay plain.

local terms = {}
for line in (os.getenv("PRISM_UNBROKEN") or ""):gmatch("[^\n]+") do
  local words = {}
  for w in line:gmatch("%S+") do words[#words + 1] = w:lower() end
  if #words > 0 then terms[#terms + 1] = words end
end
table.sort(terms, function(a, b) return #table.concat(a, " ") > #table.concat(b, " ") end)

local html = FORMAT:match("html") ~= nil
local function isword(c) return c ~= nil and c ~= "" and c:match("[%w\128-\255]") ~= nil end
local function gap(el) return el and (el.t == "Space" or el.t == "SoftBreak") end

-- Tries one term at list[i]; returns before, matched text, after, and the index of the last inline used.
local function try(list, i, words)
  local first, n = list[i], #words
  if first.t ~= "Str" then return nil end
  local parts = {}
  for k = 1, n do
    local el = list[i + 2 * (k - 1)]
    if not el or el.t ~= "Str" or (k < n and not gap(list[i + 2 * k - 1])) then return nil end
    parts[k] = el.text
  end
  local w1, wn = words[1], words[n]
  local lo1, lon = parts[1]:lower(), parts[n]:lower()
  local s, before, after
  if n == 1 then
    -- A single word may sit anywhere inside the text, with no letter or digit touching it.
    local at = 1
    while true do
      s = lo1:find(w1, at, true)
      if not s then return nil end
      local e = s + #w1 - 1
      if not isword(lo1:sub(s - 1, s - 1)) and not isword(lo1:sub(e + 1, e + 1)) then
        before, after = parts[1]:sub(1, s - 1), parts[1]:sub(e + 1)
        parts[1] = parts[1]:sub(s, e)
        break
      end
      at = s + 1
    end
  else
    s = #lo1 - #w1 + 1
    if s < 1 or lo1:sub(s) ~= w1 or isword(lo1:sub(s - 1, s - 1)) then return nil end
    for k = 2, n - 1 do if parts[k]:lower() ~= words[k] then return nil end end
    if lon:sub(1, #wn) ~= wn or isword(lon:sub(#wn + 1, #wn + 1)) then return nil end
    before, after = parts[1]:sub(1, s - 1), parts[n]:sub(#wn + 1)
    parts[1], parts[n] = parts[1]:sub(s), parts[n]:sub(1, #wn)
  end
  -- Hyphenated words built on the term stay with it: "HIPAA-compliant", "SOC 2-aligned", "non-HIPAA".
  local pre = before:match("[%w\128-\255%-]*%-$") or ""
  local post = after:match("^%-[%w\128-\255%-]*[%w\128-\255]") or ""
  before, after = before:sub(1, #before - #pre), after:sub(#post + 1)
  parts[1] = pre .. parts[1]
  parts[n] = parts[n] .. post
  return before, parts, after, i + 2 * (n - 1)
end

local function keep(parts)
  if html then
    local inl = {}
    for k, p in ipairs(parts) do
      if k > 1 then inl[#inl + 1] = pandoc.Space() end
      inl[#inl + 1] = pandoc.Str(p)
    end
    return pandoc.Span(inl, { style = "white-space:nowrap" })
  end
  return pandoc.Str(table.concat(parts, "\u{00A0}"))
end

function Inlines(list)
  if #terms == 0 then return nil end
  local out, i, changed = pandoc.List(), 1, false
  local queue = pandoc.List(list)
  while i <= #queue do
    local hit
    for _, words in ipairs(terms) do
      local before, parts, after, last = try(queue, i, words)
      if before then hit = { before, parts, after, last }; break end
    end
    if hit then
      changed = true
      if hit[1] ~= "" then out:insert(pandoc.Str(hit[1])) end
      out:insert(keep(hit[2]))
      -- The rest of the last word may hold another term, so it is looked at again.
      local rest = hit[3]
      for _ = i, hit[4] do queue:remove(i) end
      if rest ~= "" then queue:insert(i, pandoc.Str(rest)) end
    else
      out:insert(queue[i]); i = i + 1
    end
  end
  if changed then return out end
end
