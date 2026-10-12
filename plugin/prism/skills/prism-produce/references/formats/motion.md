# Motion (an animated film, made in Claude Motion)

A short animated film from the approved words: a vertical story, a feed post, a square or a 16:9 clip. Prism doesn't render video. The format file is a direction script: `run.sh motion brief` turns it into a brief, Claude makes the film with the Motion artifact type from that brief, and Prism checks the film it made (`references/film.md`). The person exports the MP4 from the film's page. Claude only: needs the Motion artifact type (Team and Enterprise plans).

Each **technique** is a motion format with its own layouts, classes and defaults. `run.sh motion techniques --brand <brand>` lists the ones the brand uses and its motifs:

| Technique | What it is |
|---|---|
| `stat-story` | Number-led: counts, charts that build, before and after. Layouts `title`, `stat`, `chart`, `compare`, `list`, `quote`, `closing` |
| `kinetic` | Type-led: one idea per scene, lines that mask up, split and stamp in. Layouts `title`, `statement`, `list`, `quote`, `closing` |

## Front matter

```yaml
---
title: Harbor Point, notes in a day     # the film's name (never "Video")
technique: stat-story
aspect: story                           # story 1080×1920 (default) | post 1080×1350 | square 1080×1080 | wide 1920×1080
energy: lively                          # calm | lively | bold (the technique's default when left out)
music: calm                             # calm (default) | bright | none
figures: illustrative                   # copy it from content.md when it says so
---
```

## Scenes

A film is a list of scenes, like a deck is a list of slides. Use `::::` for the scene so `:::` blocks nest inside.

```markdown
:::: {.scene .stat #result dur=4 name="Two days" in=slide bg=main backdrop=rings}
[2]{.stat .xxl .count from=5 at=0.4 sfx=ding}

[days]{.unit}

[from referral to first visit scheduled]{.label .words at=1.6}

::: notes
Direction for this scene only, never on screen.
:::
::::
```

- `#id`: lower-case letters, digits and `-`, a letter first. It never changes once the film exists: the film's comments and the person's own edits on the film page hang on it.
- `dur=` seconds (the layout's default when left out). `name=` is the label on the film's timeline (from the id when left out), one to three words.
- `bg=` the scene's ground, from the brand: `light`, `tint`, `wash`, `main` (the brand color, full bleed), `dark`, `deep`, or a brand gradient: `glow`, `mist`, `night`, `vivid`. Ink and the scene's other colors are picked from the brand by contrast. Left out, the layout's default, never the same as the scene before.
- `backdrop=` a moving layer behind the words: `shapes`, `rings`, `dots`, `grid`, `glow`, `stripes`, `ribbons`, `bars`, `motif` (the brand's own mark), `none`. Left out, the layout's default. `motif=` picks one of the brand's motifs.
- `in=` how the scene arrives: `wipe`, `iris`, `slide`, `blinds`, `fade`, `zoom`, `morph`, or `cut` for a deliberate hard cut. Every transition is two halves that meet on the same frame, so the cut can't be seen. Left out, the technique cycles through its transitions. The first scene has none.
- The first scene is `.title` (frame 0 is the thumbnail, so the title reads at 0). The last is `.closing`, held 3 s at least; nothing leaves it.

## Blocks

Each block is one line (or one `:::` block), in the order they arrive:

| Block | Markdown | Default size |
|---|---|---|
| Headline | `# Line {.classes}` | xl |
| Heading | `## Line {.classes}` | l |
| Eyebrow, subline, label, note, unit, attribution | `[Line]{.eyebrow}` `{.sub}` `{.label}` `{.note}` `{.unit}` `{.cite}` | xs, s, s, xs, l, xs |
| Big number | `[41%]{.stat .count from=20}` | xxl |
| Plain line | a paragraph | s |
| List | `- Item` lines, each may lead with an icon: `- []{.icon .ph-flag} Court dates flagged`. Style it with a `:::` block: `::: {.checks .build}` … `:::` (`plain`, `chips`, `cards`, `steps`, `checks`) | s |
| Icon | `[]{.icon .ph-calendar .pop}`, or `[Label]{.icon .ph-calendar}`; from the brand's icon set | l |
| Quote | `> Quote` then `> [Name, Role]{.cite}` | l |
| Logo | `![Brand](prism:logo){.grow}`: the on-dark logo is chosen on dark grounds | |
| Picture | `![](images/photo.jpg){.pan frame=card}` (`frame=` `card`, `circle`, `arch`, `browser`, `phone`); images from content.md only | |
| Chart | a `chart` code block, as in components.md | |
| Motif | `[]{.motif .draw}`: the brand's motif as a divider (`name=` picks one) | |
| Drawn object | `::: {.draw .build n=4}` + one sentence describing it; on-screen words in it go in "quotes" | |

A `*word*` in a line is the accent word (once per line). Every line is on screen exactly as written: Motion is told to keep the words verbatim, and the check fails a reworded line.

## Classes (fixed; nothing else is allowed)

One of each kind per block. Every block already has the technique's default entrance, hold and exit, so set a class only to change one. A technique allows only its own (the build names the ones it refuses):

- **Size:** `.xs .s .m .l .xl .xxl`, from the brand's type, in px per aspect.
- **Enter:** `.fade` `.rise` `.slide` `.words` (word by word) `.mask` (rises from behind its baseline) `.type` (kinetic) `.split` (kinetic: letters assemble) `.zoom` `.blur` `.flip` `.count from=N` (stat-story) `.pop` `.grow` `.stamp` `.bounce` `.wipe` `.drop` (stat-story) `.build` (piece by piece; `stagger=` seconds) `.draw` (draws itself on).
- **Emphasis** (the accent word, after it lands): `.highlight` (a marker band behind it), `.underline`, `.circle`.
- **Hold:** `.drift` `.breathe` `.float` `.pan` `.wobble` `.pulse`.
- **Exit:** `.out` (the way it came) `.out-left` `.out-up` `.out-down` `.out-zoom` `.out-fade`, or `.stay` to ride the transition out. Exits run in reverse order of arrival and finish before the transition starts.
- **Timing:** `at=` seconds into the scene; blocks without it follow in order.
- **Sound:** `sfx=tick|click|pop|ding|chime|sparkle|whoosh|thud|boing` on the block's entrance. `music:` in the front matter sets the score; every transition gets a whoosh.

## Rules

- 10–30 s for stat-story, 8–30 s for kinetic; 300 s is the hard limit. About 3–5 s a scene; one idea per scene.
- Neighbouring scenes never look alike: vary the ground, the backdrop and how they arrive (the build warns when two in a row match).
- Numbers, names and quotes come from content.md exactly; a count lands on the real value.
- `figures: illustrative`: a line in the film says so (the closing note is the usual place).
- Keep it short on screen: people watch on phones, often muted. Detail goes in the captions or the post, not the film.
- The brand digest's visual rules apply, and each motif's own rules.

The build (`run.sh motion brief formats/motion.md --out <dir>`) refuses an unknown class, layout, ground, backdrop, transition, attribute, icon or sound, two classes of one kind on a block, an emphasis with no accent word, a motif the brand doesn't have, a missing id or closing scene, or a film over 300 s, and names the line. It warns when a block has under 0.6 s on screen before it leaves.
