-- Turns ```chart code blocks into inline SVG charts, so chart data lives in the Markdown.
-- Types: bar, hbar, line, donut. See README section "Charts" for the syntax.

local W = 640
-- Colours are the brand's roles, set by the builder (brand.js env); a missing one stops the build rather than guessing.
-- An optional role may name a fallback: a flat brand without accent-strong gets a flat highlight.
local function role(n, fallback)
  local v = os.getenv("PRISM_COLOR_" .. n) or (fallback and os.getenv("PRISM_COLOR_" .. fallback))
  if not v then error("prism-charts.lua: PRISM_COLOR_" .. n .. " is not set; build through run.sh") end
  return v
end
local INK, BODY, HAIR, PAPER = role("TEXT_STRONG"), role("TEXT"), role("RULE"), role("SURFACE")
local HOT, DEEP = role("ACCENT_STRONG", "ACCENT"), role("ACCENT")
-- Categorical order from the brand's chart roles.
local SERIES = { role("CHART_1"), role("CHART_2"), role("CHART_3"), role("CHART_4"), role("CHART_5") }
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
-- Bar style is the brand's (options.charts.bars): "gradient" fades each bar into the page; "flat" fills it solid.
local FLAT = os.getenv("PRISM_CHART_BARS") ~= "gradient"
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
    s = s .. ('<text class="tick" x="%s" y="%s" text-anchor="end">%s</text>'):format(x0 - 8, f(y + 3.5), lab)
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
      return ('<line x1="%s" x2="%s" y1="%s" y2="%d" class="marker"/><text class="note" x="%s" y="%s">%s</text>')
        :format(f(x), f(x), yt - 14, yb, f(x + 7), yt - 4, esc(note or ""))
    end
  end
  return ""
end

local function bar(spec, rows, id)
  local H = tonumber(spec.height) or 210
  local x0, x1, yb, yt = 40, W - 6, H - 30, 34
  local dmax = 0
  for _, r in ipairs(rows) do dmax = math.max(dmax, r.vals[1].n or 0) end
  STEPS = 4
  local max = tonumber(spec.max) or niceMax(dmax)
  local step = (x1 - x0) / #rows
  local bw = math.min(64, step * 0.62)
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
    s = s .. ('<text class="lab" x="%s" y="%s" text-anchor="middle">%s</text>'):format(f(cx), yb + 18, esc(r.label))
    if showLabel(spec, i, #rows, hl[i]) then
      s = s .. ('<text class="val" x="%s" y="%s" text-anchor="middle">%s%s</text>'):format(f(cx), f(top - 7), esc(r.vals[1].s), esc(unitOf(spec)))
    end
  end
  return H, defs, s .. markerAt(spec, rows, xs, yb, yt)
end

local function hbar(spec, rows, id)
  local rowH = 30
  local H = #rows * rowH + 12
  local x0, x1 = 170, W - 70
  local dmax = 0
  for _, r in ipairs(rows) do dmax = math.max(dmax, r.vals[1].n or 0) end
  local max = tonumber(spec.max) or dmax
  local hl = highlightSet(spec, rows)
  local defs = fadeGradient(id .. "h", 1, 0, 0, 0, HOT, DEEP, 0.18) .. fadeGradient(id .. "m", 1, 0, 0, 0, HAIR, HAIR, 0.25)
  local s = ('<line x1="%d" x2="%d" y1="4" y2="%d" class="base"/>'):format(x0, x0, H - 6)
  for i, r in ipairs(rows) do
    local v = r.vals[1].n or 0
    local y = 8 + (i - 1) * rowH
    local w = math.max(2, (v / max) * (x1 - x0))
    local bh = 16
    s = s .. ('<path d="M%d,%s H%s Q%s,%s %s,%s V%s Q%s,%s %s,%s H%d Z" fill="url(#%s)"/>'):format(
      x0, y, f(x0 + w - 4), f(x0 + w), y, f(x0 + w), y + 4, y + bh - 4, f(x0 + w), y + bh, f(x0 + w - 4), y + bh, x0, id .. (hl[i] and "h" or "m"))
    s = s .. ('<text class="rowlab" x="%d" y="%s" text-anchor="end">%s</text>'):format(x0 - 10, y + 12, esc(r.label))
    s = s .. ('<text class="val" x="%s" y="%s">%s%s</text>'):format(f(x0 + w + 8), y + 12.5, esc(r.vals[1].s), esc(unitOf(spec)))
  end
  return H, defs, s
end

local function line(spec, rows, id)
  local names = {}
  if spec.series then for n in spec.series:gmatch("[^,]+") do table.insert(names, trim(n)) end end
  local ns = math.max(1, #names)
  local H = (tonumber(spec.height) or 210) + (ns > 1 and 22 or 0)
  local x0, x1, yb, yt = 40, W - (ns > 1 and 60 or 16), (tonumber(spec.height) or 210) - 30, 34
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
    s = s .. ('<text class="lab" x="%s" y="%s" text-anchor="middle">%s</text>'):format(f(xs[i]), yb + 18, esc(r.label))
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
      s = s .. ('<path d="%s L%s,%d L%s,%d Z" fill="url(#%sa)"/>'):format(d, f(xs[#rows]), yb, f(xs[1]), yb, id)
    end
    s = s .. ('<path d="%s" fill="none" stroke="%s" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'):format(d, c)
    for i, r in ipairs(rows) do
      local v = (r.vals[j] or {})
      if v.n and (showLabel(spec, i, #rows, false)) then
        s = s .. ('<circle cx="%s" cy="%s" r="4.5" fill="%s" stroke="%s" stroke-width="2"/>'):format(f(xs[i]), f(y(v.n)), c, PAPER)
        if ns == 1 then
          s = s .. ('<text class="val" x="%s" y="%s" text-anchor="%s">%s%s</text>'):format(
            f(xs[i]), f(y(v.n) - 10), i == 1 and "start" or (i == #rows and "end" or "middle"), esc(v.s), esc(unitOf(spec)))
        elseif i == #rows then
          table.insert(ends, { y = y(v.n), t = v.s .. unitOf(spec), c = c })
        end
      end
    end
  end
  if ns > 1 then
    -- End values sit right of the last point, nudged apart so they never overlap.
    table.sort(ends, function(a, b) return a.y < b.y end)
    for k = 2, #ends do ends[k].y = math.max(ends[k].y, ends[k - 1].y + 13) end
    for _, e in ipairs(ends) do
      s = s .. ('<text class="val" x="%s" y="%s" fill="%s">%s</text>'):format(f(xs[#rows] + 10), f(e.y + 4), INK, esc(e.t))
    end
    local lx = x0
    for j, n in ipairs(names) do
      s = s .. ('<rect x="%s" y="%d" width="10" height="10" rx="2" fill="%s"/><text class="legend" x="%s" y="%d">%s</text>'):format(lx, H - 10, SERIES[j], lx + 15, H - 1, esc(n))
      lx = lx + 34 + #n * 6.2
    end
  end
  return H, defs, s
end

local function donut(spec, rows, id)
  if #rows > #SERIES then
    local other = { label = "Other", vals = { { n = 0 } } }
    for i = #SERIES, #rows do other.vals[1].n = other.vals[1].n + (rows[i].vals[1].n or 0) end
    other.vals[1].s = tostring(other.vals[1].n)
    for i = #rows, #SERIES, -1 do table.remove(rows, i) end
    table.insert(rows, other)
  end
  local H, cx, cy, R, r = 200, 110, 100, 86, 56
  local total = 0
  for _, row in ipairs(rows) do total = total + (row.vals[1].n or 0) end
  local s, a = "", -math.pi / 2
  for i, row in ipairs(rows) do
    local v = row.vals[1].n or 0
    local a2 = a + (v / total) * 2 * math.pi
    local large = (a2 - a) > math.pi and 1 or 0
    local p = function(rad, ang) return f(cx + rad * math.cos(ang)) .. "," .. f(cy + rad * math.sin(ang)) end
    s = s .. ('<path d="M%s A%d,%d 0 %d 1 %s L%s A%d,%d 0 %d 0 %s Z" fill="%s" stroke="%s" stroke-width="2" stroke-linejoin="round"/>'):format(
      p(R, a), R, R, large, p(R, a2), p(r, a2), r, r, large, p(r, a), SERIES[i], PAPER)
    local ly = 30 + (i - 1) * 30
    s = s .. ('<rect x="250" y="%d" width="12" height="12" rx="3" fill="%s"/>'):format(ly - 10, SERIES[i])
    s = s .. ('<text class="rowlab" x="272" y="%d">%s</text>'):format(ly, esc(row.label))
    s = s .. ('<text class="val" x="%d" y="%d" text-anchor="end">%s%s</text>'):format(W - 10, ly, esc(row.vals[1].s), esc(unitOf(spec)))
    s = s .. ('<line x1="250" x2="%d" y1="%d" y2="%d" class="grid"/>'):format(W - 10, ly + 10, ly + 10)
    a = a2
  end
  if spec.center then
    local big, small = spec.center:match("^(.-)%s*|%s*(.*)$")
    s = s .. ('<text class="big" x="%d" y="%d" text-anchor="middle">%s</text>'):format(cx, cy + (small and 4 or 9), esc(trim(big or spec.center)))
    if small then s = s .. ('<text class="lab" x="%d" y="%d" text-anchor="middle">%s</text>'):format(cx, cy + 22, esc(small)) end
  end
  return H, "", s
end

local BUILD = { bar = bar, hbar = hbar, line = line, donut = donut }

function CodeBlock(el)
  if not el.classes:includes("chart") then return nil end
  local spec, rows = parse(el.text)
  local fn = BUILD[spec.type]
  if not fn or #rows == 0 then
    io.stderr:write("[charts] skipped a chart: unknown type or no data rows\n")
    return nil
  end
  uid = uid + 1
  local H, defs, body = fn(spec, rows, "cac" .. uid)
  local svg = ('<svg viewBox="0 0 %d %d" role="img" aria-label="%s"><defs>%s</defs>%s</svg>'):format(W, H, esc(spec.caption or "Chart"), defs, body)
  local cap = spec.caption and ("<figcaption>" .. esc(spec.caption) .. "</figcaption>") or ""
  return pandoc.RawBlock("html", '<figure class="prism-chart prism-chart--' .. spec.type .. '">' .. svg .. cap .. "</figure>")
end
