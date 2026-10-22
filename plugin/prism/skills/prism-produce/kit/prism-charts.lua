-- Turns ```chart code blocks into inline SVG charts, so chart data lives in the Markdown.
-- Types: bar, hbar, line, donut. See README section "Charts" for the syntax.

local W = 640
-- Text scale: 1 on pages; a carousel panel is read on a phone, so its charts draw text (and the room it needs) larger.
local T = 1
local CAROUSEL_TEXT = 1.9
-- Colours are the brand's roles, set by the builder (brand.js env); a missing one stops the build rather than guessing.
-- An optional role may name a fallback: a flat brand without accent-strong gets a flat highlight.
-- `theme` "dark" reads the role's dark value (PRISM_DARK_COLOR_*), falling back to the light one.
local function role(n, fallback, theme)
  local pre = theme == "dark" and "PRISM_DARK_COLOR_" or "PRISM_COLOR_"
  local v = os.getenv(pre .. n) or (fallback and os.getenv(pre .. fallback))
  if not v and theme == "dark" then return role(n, fallback) end
  if not v then error("prism-charts.lua: PRISM_COLOR_" .. n .. " is not set; build through run.sh") end
  return v
end
local INK, BODY, HAIR, PAPER, HOT, DEEP, SERIES
-- Bars fade into the page or fill solid (the brand's options.charts.bars); on a dark or purple ground they are always solid,
-- since that ground is a gradient or image no fade could match.
local BARS_FLAT = os.getenv("PRISM_CHART_BARS") ~= "gradient"
local FLAT = BARS_FLAT
-- The chart's colors for its ground: light (the page), dark, or purple (dark, with highlights in the on-dark eyebrow
-- color, since the accent would vanish into the ground).
local function palette(ground)
  local d = ground ~= "light" and "dark" or nil
  FLAT = BARS_FLAT or d ~= nil
  INK, BODY, PAPER = role("TEXT_STRONG", nil, d), role("TEXT", nil, d), d and role("DARK_SURFACE") or role("SURFACE")
  HAIR = d and role("TEXT_MUTED", nil, d) or role("RULE")
  HOT, DEEP = role("ACCENT_STRONG", "ACCENT", d), role("ACCENT", nil, d)
  if ground == "purple" then HOT, DEEP = role("EYEBROW_ON_DARK", "ACCENT", d), role("EYEBROW_ON_DARK", "ACCENT", d) end
  -- Categorical order from the brand's chart roles: chart-1 always, then as many of 2-5 as the brand defines (no color is made up).
  SERIES = { role("CHART_1", nil, d) }
  for i = 2, 5 do if not os.getenv("PRISM_COLOR_CHART_" .. i) then break end; table.insert(SERIES, role("CHART_" .. i, nil, d)) end
end
palette("light")
local function needSeries(n)
  if n > #SERIES then error(("prism-charts.lua: this chart has %d series and the brand defines %d chart colours (prism-color-chart-1 to -%d); cut the series or map more chart colours"):format(n, #SERIES, #SERIES)) end
end
local KEYS = { type=1, caption=1, unit=1, max=1, highlight=1, marker=1, labels=1, center=1, series=1, height=1 }
local uid = 0

local function esc(s)
  return (tostring(s):gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;"))
end
local function trim(s) return (s:gsub("^%s+", ""):gsub("%s+$", "")) end
local function f(n) return string.format("%.2f", n) end

local function parse(text)
  local spec, rows = { type = "bar", labels = "ends" }, {}
  for line in (text .. "\n"):gmatch("(.-)\n") do
    line = trim(line:gsub("%s+#.*$", ""))
    local k, v = line:match("^([^:]+):%s*(.*)$")
    if k then
      k = trim(k)
      if KEYS[k] then spec[k] = v
      else
        local vals = {}
        for n in v:gmatch("[^,]+") do table.insert(vals, { s = trim(n), n = tonumber((trim(n):gsub("[^%d%.%-]", ""))) }) end
        table.insert(rows, { label = k, vals = vals })
      end
    end
  end
  return spec, rows
end

-- Round gridline step (1, 2, 2.5 or 5 x 10^n) with three to five steps that clear the data.
local STEPS = 4
local function niceMax(m)
  if m <= 0 then return 1 end
  local p = 10 ^ math.floor(math.log(m / 4, 10))
  for _, k in ipairs({ 1, 2, 2.5, 5, 10, 20 }) do
    local n = math.ceil(m / (k * p) - 1e-9)
    if n <= 5 then STEPS = math.max(3, n) return k * p * STEPS end
  end
  return m
end

local function highlightSet(spec, rows)
  local set, h = {}, spec.highlight
  if not h or h == "" then for i = 1, #rows do set[i] = true end return set end
  if h == "last" then set[#rows] = true return set end
  local a, b = h:match("^(.-)%s*%-%s*(.*)$")
  local from, to
  for i, r in ipairs(rows) do
    if a and r.label == trim(a) then from = i end
    if a and b ~= "" and r.label == trim(b) then to = i end
    if not a and r.label == trim(h) then set[i] = true end
  end
  if from then for i = from, (to or #rows) do set[i] = true end end
  return set
end

-- Ten smoothstep stops from solid colour toward paper: the same curve as .prism-fade.
-- Blended to solid colours rather than transparency, which PDF viewers render inconsistently.
local function mix(hex, t)
  local out = "#"
  for k = 0, 2 do
    local a = tonumber(hex:sub(2 + k * 2, 3 + k * 2), 16)
    local b = tonumber(PAPER:sub(2 + k * 2, 3 + k * 2), 16)
    out = out .. string.format("%02X", math.floor(a + (b - a) * t + 0.5))
  end
  return out
end
local function fadeGradient(id, x1, y1, x2, y2, c1, c2, floor)
  local s = ('<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s">'):format(id, x1, y1, x2, y2)
  if FLAT then return s .. ('<stop offset="0%%" stop-color="%s"/><stop offset="100%%" stop-color="%s"/>'):format(c2, c2) .. "</linearGradient>" end
  for i = 0, 10 do
    local t = i / 10
    local fade = (t * t * (3 - 2 * t)) * (1 - floor)
    s = s .. ('<stop offset="%d%%" stop-color="%s"/>'):format(i * 10, mix(i < 5 and c1 or c2, fade))
  end
  return s .. "</linearGradient>"
end

local function unitOf(spec)
  if not spec.unit then return "" end
  return spec.unit:match("^%%") and spec.unit or (" " .. spec.unit)
end
local function showLabel(spec, i, n, hl)
  if spec.labels == "all" then return true end
  if spec.labels == "none" then return false end
  return i == 1 or i == n or (spec.labels == "highlight" and hl)
end

local function grid(x0, x1, yb, yt, max)
  local s = ""
  for i = 0, STEPS do
    local v = max * i / STEPS
    local y = yb - (v / max) * (yb - yt)
    s = s .. ('<line x1="%s" x2="%s" y1="%s" y2="%s" class="%s"/>'):format(x0, x1, f(y), f(y), i == 0 and "base" or "grid")
    local lab = (v == math.floor(v)) and string.format("%d", v) or string.format("%.1f", v)
    s = s .. ('<text class="tick" x="%s" y="%s" text-anchor="end">%s</text>'):format(x0 - 8 * T, f(y + 3.5 * T), lab)
  end
  return s
end

local function markerAt(spec, rows, xs, yb, yt)
  if not spec.marker then return "" end
  local lab, note = spec.marker:match("^(.-)%s*|%s*(.*)$")
  lab = trim(lab or spec.marker)
  for i, r in ipairs(rows) do
    if r.label == lab and xs[i] then
      local x = xs[i]
      return ('<line x1="%s" x2="%s" y1="%s" y2="%s" class="marker"/><text class="note" x="%s" y="%s">%s</text>')
        :format(f(x), f(x), yt - 14 * T, yb, f(x + 7 * T), yt - 4 * T, esc(note or ""))
    end
  end
  return ""
end

local function bar(spec, rows, id)
  local H = tonumber(spec.height) or 210 * T
  local x0, x1, yb, yt = 40 * T, W - 6, H - 30 * T, 34 * T
  local dmax = 0
  for _, r in ipairs(rows) do dmax = math.max(dmax, r.vals[1].n or 0) end
  STEPS = 4
  local max = tonumber(spec.max) or niceMax(dmax)
  local step = (x1 - x0) / #rows
  local bw = math.min(64 * T, step * 0.62)
  local hl = highlightSet(spec, rows)
  local defs = fadeGradient(id .. "h", 0, 0, 0, 1, HOT, DEEP, 0.18) .. fadeGradient(id .. "m", 0, 0, 0, 1, HAIR, HAIR, 0.25)
  local s, xs = grid(x0, x1, yb, yt, max), {}
  for i, r in ipairs(rows) do
    local v = r.vals[1].n or 0
    local cx = x0 + step * (i - 1) + step / 2
    local top = yb - (v / max) * (yb - yt)
    local rr = math.min(4, (yb - top) / 2)
    xs[i] = x0 + step * (i - 1)
    s = s .. ('<path d="M%s,%s V%s Q%s,%s %s,%s H%s Q%s,%s %s,%s V%s Z" fill="url(#%s)"/>'):format(
      f(cx - bw / 2), yb, f(top + rr), f(cx - bw / 2), f(top), f(cx - bw / 2 + rr), f(top),
      f(cx + bw / 2 - rr), f(cx + bw / 2), f(top), f(cx + bw / 2), f(top + rr), yb, id .. (hl[i] and "h" or "m"))
    s = s .. ('<text class="lab" x="%s" y="%s" text-anchor="middle">%s</text>'):format(f(cx), yb + 18 * T, esc(r.label))
    if showLabel(spec, i, #rows, hl[i]) then
      s = s .. ('<text class="val" x="%s" y="%s" text-anchor="middle">%s%s</text>'):format(f(cx), f(top - 7 * T), esc(r.vals[1].s), esc(unitOf(spec)))
    end
  end
  return H, defs, s .. markerAt(spec, rows, xs, yb, yt)
end

local function hbar(spec, rows, id)
  local rowH = 30 * T
  local H = #rows * rowH + 12
  -- Row names right-aligned left of the axis; larger text needs a wider gutter (about half an em a character).
  local long = 0
  for _, r in ipairs(rows) do long = math.max(long, utf8.len(r.label) or #r.label) end
  local x0, x1 = T == 1 and 170 or math.min(W / 2, math.max(170, long * 11 * T * 0.56 + 14)), W - 70 * T
  local dmax = 0
  for _, r in ipairs(rows) do dmax = math.max(dmax, r.vals[1].n or 0) end
  local max = tonumber(spec.max) or dmax
  local hl = highlightSet(spec, rows)
  local defs = fadeGradient(id .. "h", 1, 0, 0, 0, HOT, DEEP, 0.18) .. fadeGradient(id .. "m", 1, 0, 0, 0, HAIR, HAIR, 0.25)
  local s = ('<line x1="%s" x2="%s" y1="4" y2="%s" class="base"/>'):format(x0, x0, H - 6)
  for i, r in ipairs(rows) do
    local v = r.vals[1].n or 0
    local y = 8 + (i - 1) * rowH
    local w = math.max(2, (v / max) * (x1 - x0))
    local bh = 16 * T
    s = s .. ('<path d="M%s,%s H%s Q%s,%s %s,%s V%s Q%s,%s %s,%s H%s Z" fill="url(#%s)"/>'):format(
      x0, y, f(x0 + w - 4), f(x0 + w), y, f(x0 + w), y + 4, y + bh - 4, f(x0 + w), y + bh, f(x0 + w - 4), y + bh, x0, id .. (hl[i] and "h" or "m"))
    s = s .. ('<text class="rowlab" x="%s" y="%s" text-anchor="end">%s</text>'):format(x0 - 10, y + 12 * T, esc(r.label))
    s = s .. ('<text class="val" x="%s" y="%s">%s%s</text>'):format(f(x0 + w + 8), y + 12.5 * T, esc(r.vals[1].s), esc(unitOf(spec)))
  end
  return H, defs, s
end

local function line(spec, rows, id)
  local names = {}
  if spec.series then for n in spec.series:gmatch("[^,]+") do table.insert(names, trim(n)) end end
  local ns = math.max(1, #names)
  if ns > 1 then needSeries(ns) end
  local H = (tonumber(spec.height) or 210 * T) + (ns > 1 and 22 * T or 0)
  local x0, x1, yb, yt = 40 * T, W - (ns > 1 and 60 * T or 16), (tonumber(spec.height) or 210 * T) - 30 * T, 34 * T
  local ends = {}
  local dmax = 0
  for _, r in ipairs(rows) do for j = 1, ns do dmax = math.max(dmax, (r.vals[j] or {}).n or 0) end end
  STEPS = 4
  local max = tonumber(spec.max) or niceMax(dmax)
  local step = (x1 - x0 - 20) / math.max(1, #rows - 1)
  local xs = {}
  for i = 1, #rows do xs[i] = x0 + 10 + step * (i - 1) end
  local y = function(v) return yb - (v / max) * (yb - yt) end
  local defs, s = "", grid(x0, x1, yb, yt, max)
  for i, r in ipairs(rows) do
    s = s .. ('<text class="lab" x="%s" y="%s" text-anchor="middle">%s</text>'):format(f(xs[i]), yb + 18 * T, esc(r.label))
  end
  s = s .. markerAt(spec, rows, xs, yb, yt)
  for j = 1, ns do
    local c = ns == 1 and DEEP or SERIES[j]
    local d = ""
    for i, r in ipairs(rows) do
      local v = (r.vals[j] or {}).n
      if v then d = d .. (d == "" and "M" or " L") .. f(xs[i]) .. "," .. f(y(v)) end
    end
    if ns == 1 and not FLAT then
      defs = defs .. fadeGradient(id .. "a", 0, 0, 0, 1, mix(HOT, .72), mix(DEEP, .72), 0.0)
      s = s .. ('<path d="%s L%s,%s L%s,%s Z" fill="url(#%sa)"/>'):format(d, f(xs[#rows]), yb, f(xs[1]), yb, id)
    end
    s = s .. ('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round" stroke-linecap="round"/>'):format(d, c, 2 * T)
    for i, r in ipairs(rows) do
      local v = (r.vals[j] or {})
      if v.n and (showLabel(spec, i, #rows, false)) then
        s = s .. ('<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="%s"/>'):format(f(xs[i]), f(y(v.n)), 4.5 * T, c, PAPER, 2 * T)
        if ns == 1 then
          s = s .. ('<text class="val" x="%s" y="%s" text-anchor="%s">%s%s</text>'):format(
            f(xs[i]), f(y(v.n) - 10 * T), i == 1 and "start" or (i == #rows and "end" or "middle"), esc(v.s), esc(unitOf(spec)))
        elseif i == #rows then
          table.insert(ends, { y = y(v.n), t = v.s .. unitOf(spec), c = c })
        end
      end
    end
  end
  if ns > 1 then
    -- End values sit right of the last point, nudged apart so they never overlap.
    table.sort(ends, function(a, b) return a.y < b.y end)
    for k = 2, #ends do ends[k].y = math.max(ends[k].y, ends[k - 1].y + 13 * T) end
    for _, e in ipairs(ends) do
      s = s .. ('<text class="val" x="%s" y="%s" fill="%s">%s</text>'):format(f(xs[#rows] + 10 * T), f(e.y + 4 * T), INK, esc(e.t))
    end
    local lx = x0
    for j, n in ipairs(names) do
      s = s .. ('<rect x="%s" y="%s" width="%s" height="%s" rx="2" fill="%s"/><text class="legend" x="%s" y="%s">%s</text>'):format(lx, H - 10 * T, 10 * T, 10 * T, SERIES[j], lx + 15 * T, H - 1, esc(n))
      lx = lx + (34 + #n * 6.2) * T
    end
  end
  return H, defs, s
end

local function donut(spec, rows, id)
  -- Slices past the brand's colours join "Other", which needs a colour of its own.
  needSeries(2)
  if #rows > #SERIES then
    local other = { label = "Other", vals = { { n = 0 } } }
    for i = #SERIES, #rows do other.vals[1].n = other.vals[1].n + (rows[i].vals[1].n or 0) end
    other.vals[1].s = tostring(other.vals[1].n)
    for i = #rows, #SERIES, -1 do table.remove(rows, i) end
    table.insert(rows, other)
  end
  -- The ring grows with the text (k), so the center figure stays inside it; the legend starts right of it.
  local k = T == 1 and 1 or 1.45
  local H, cx, cy, R, r, lx = math.max(200 * k, 30 * T * #rows + 20), 110 * k, 100 * k, 86 * k, 56 * k, 250 * k
  local total = 0
  for _, row in ipairs(rows) do total = total + (row.vals[1].n or 0) end
  local s, a = "", -math.pi / 2
  for i, row in ipairs(rows) do
    local v = row.vals[1].n or 0
    local a2 = a + (v / total) * 2 * math.pi
    local large = (a2 - a) > math.pi and 1 or 0
    local p = function(rad, ang) return f(cx + rad * math.cos(ang)) .. "," .. f(cy + rad * math.sin(ang)) end
    s = s .. ('<path d="M%s A%s,%s 0 %d 1 %s L%s A%s,%s 0 %d 0 %s Z" fill="%s" stroke="%s" stroke-width="2" stroke-linejoin="round"/>'):format(
      p(R, a), R, R, large, p(R, a2), p(r, a2), r, r, large, p(r, a), SERIES[i], PAPER)
    local ly = 30 + (i - 1) * 30 * T
    s = s .. ('<rect x="%s" y="%s" width="%s" height="%s" rx="3" fill="%s"/>'):format(lx, ly - 10 * T, 12 * T, 12 * T, SERIES[i])
    s = s .. ('<text class="rowlab" x="%s" y="%s">%s</text>'):format(lx + 22 * T, ly, esc(row.label))
    s = s .. ('<text class="val" x="%d" y="%s" text-anchor="end">%s%s</text>'):format(W - 10, ly, esc(row.vals[1].s), esc(unitOf(spec)))
    s = s .. ('<line x1="%s" x2="%d" y1="%s" y2="%s" class="grid"/>'):format(lx, W - 10, ly + 10 * T, ly + 10 * T)
    a = a2
  end
  if spec.center then
    local big, small = spec.center:match("^(.-)%s*|%s*(.*)$")
    s = s .. ('<text class="big" x="%s" y="%s" text-anchor="middle">%s</text>'):format(cx, cy + (small and 4 or 9) * T, esc(trim(big or spec.center)))
    if small then s = s .. ('<text class="lab" x="%s" y="%s" text-anchor="middle">%s</text>'):format(cx, cy + 22 * T, esc(small)) end
  end
  return H, "", s
end

local BUILD = { bar = bar, hbar = hbar, line = line, donut = donut }

local function chart(el, ctx)
  if not el.classes:includes("chart") then return nil end
  T = ctx.text
  palette(ctx.ground)
  local spec, rows = parse(el.text)
  local fn = BUILD[spec.type]
  if not fn or #rows == 0 then
    io.stderr:write("[charts] skipped a chart: unknown type or no data rows\n")
    return nil
  end
  uid = uid + 1
  local H, defs, body = fn(spec, rows, "cac" .. uid)
  local svg = ('<svg viewBox="0 0 %d %s" role="img" aria-label="%s"><defs>%s</defs>%s</svg>'):format(W, H == math.floor(H) and string.format("%d", H) or f(H), esc(spec.caption or "Chart"), defs, body)
  local cap = spec.caption and ("<figcaption>" .. esc(spec.caption) .. "</figcaption>") or ""
  local on = ctx.ground ~= "light" and " prism-chart--on-dark" or ""
  local style = T ~= 1 and (' style="--chart-text:%s"'):format(T) or ""
  return pandoc.RawBlock("html", '<figure class="prism-chart prism-chart--' .. spec.type .. on .. '"' .. style .. '>' .. svg .. cap .. "</figure>")
end

-- Charts take their context from the fences around them: a .carousel draws larger text; a .dark or .purple block (a post,
-- panel or card) draws on-dark colors.
local function walk(blocks, ctx)
  return blocks:walk({
    traverse = "topdown",
    CodeBlock = function(el) return chart(el, ctx) end,
    Div = function(el)
      local c, cl = { text = ctx.text, ground = ctx.ground }, el.classes
      if cl:includes("carousel") then c.text = CAROUSEL_TEXT end
      if cl:includes("purple") then c.ground = "purple" elseif cl:includes("dark") then c.ground = "dark" end
      if c.text == ctx.text and c.ground == ctx.ground then return nil end
      el.content = walk(el.content, c)
      return el, false
    end,
  })
end

function Pandoc(doc)
  doc.blocks = walk(doc.blocks, { text = 1, ground = "light" })
  return doc
end
