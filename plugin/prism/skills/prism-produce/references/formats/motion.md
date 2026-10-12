# Motion (an animated film, made in Claude Motion)

A short animated film from the approved words: a vertical story, a feed post, a square or a 16:9 clip. Prism doesn't render video. The format file is a direction script: `run.sh motion brief` turns it into a brief, Claude makes the film with the Motion artifact type from that brief, and Prism checks the film it made. The person exports the MP4 from the film's page. Claude only: needs the Motion artifact type (Team and Enterprise plans).

Each **technique** is a motion format with its own layouts and classes. `run.sh motion techniques --brand <brand>` lists the ones the brand uses:

| Technique | What it is |
|---|---|
| `stat-story` | Number-led: counts, charts that build, before and after. Layouts `title`, `stat`, `chart`, `compare`, `list`, `quote`, `closing` |
| `kinetic` | Type-led: one idea per scene, lines enter word by word, the accent word lands. Layouts `title`, `statement`, `list`, `quote`, `closing` |

## Front matter

```yaml
---
title: Harbor Point, notes in a day     # the film's name (never "Video")
technique: stat-story
aspect: story                           # story 1080×1920 (default) | post 1080×1350 | square 1080×1080 | wide 1920×1080
ground: light                           # light (default) | dark: the brand's dark surface
music: calm                             # calm (default) | bright | none
figures: illustrative                   # copy it from content.md when it says so
---
```

## Scenes

A film is a list of scenes, like a deck is a list of slides. Use `::::` for the scene so `:::` blocks nest inside.

```markdown
:::: {.scene .stat #result dur=4 name="Two days"}
[2]{.stat .xxl .count from=5 at=0.4 sfx=ding}

[days]{.unit .fade}

[from referral to first visit scheduled]{.label .words at=1.9}

::: notes
Direction for this scene only, never on screen.
:::
::::
```

- `#id`: lower-case letters, digits and `-`, a letter first. It never changes once the film exists: the film's comments and the person's own edits on the film page hang on it.
- `dur=` seconds (the layout's default when left out). `name=` is the label on the film's timeline (from the id when left out), one to three words.
- `.morph` on a scene opens it by transforming the last scene's subject into this one's, instead of a cut.
- The first scene is `.title` (frame 0 is the thumbnail, so the title reads at 0). The last is `.closing`, held 3 s at least.

## Blocks

Each block is one line (or one `:::` block), in the order they appear:

| Block | Markdown | Default size |
|---|---|---|
| Headline | `# Line {.classes}` | xl |
| Heading | `## Line {.classes}` | l |
| Eyebrow, subline, label, note, unit, attribution | `[Line]{.eyebrow}` `{.sub}` `{.label}` `{.note}` `{.unit}` `{.cite}` | xs, s, s, xs, l, xs |
| Big number | `[41%]{.stat .count from=20}` | xxl |
| Plain line | a paragraph | s |
| List | `- Item` lines; they enter one at a time | m |
| Quote | `> Quote` then `> [Name, Role]{.cite}` | l |
| Logo | `![Brand](prism:logo){.grow}` (`prism:logo-on-dark` on dark) | |
| Picture | `![](images/photo.jpg){.pan}` (images from content.md only) | |
| Chart | a `chart` code block, as in components.md | |
| Drawn object | `::: {.draw .build n=4}` + one sentence describing it; on-screen words in it go in "quotes" | |

A `*word*` in a line is the accent word (once per line). Every line is on screen exactly as written: Motion is told to keep the words verbatim, and the check fails a reworded line.

## Classes (fixed; nothing else is allowed)

One of each kind per block. A technique allows only its own (the build names the ones it refuses):

- **Size:** `.xs .s .m .l .xl .xxl`, from the brand's type, in px per aspect.
- **Enter:** `.fade` `.rise` `.slide` (kinetic) `.words` (word by word) `.type` (kinetic: typed) `.count from=N` (stat-story) `.pop` `.grow` `.wipe` `.drop` (stat-story) `.build` (piece by piece; `stagger=` seconds).
- **Hold:** `.drift` `.breathe` `.float` (kinetic) `.pan` (stat-story, pictures).
- **Exit:** `.out` (leaves before the scene ends).
- **Timing:** `at=` seconds into the scene; blocks without it follow in order.
- **Sound:** `sfx=tick|click|pop|ding|chime|sparkle|whoosh|thud|boing` on the block's entrance. `music:` in the front matter sets the score.

## Rules

- 10–30 s for stat-story, 8–30 s for kinetic; 300 s is the hard limit. About 3–5 s a scene; one idea per scene.
- Numbers, names and quotes come from content.md exactly; a count lands on the real value.
- `figures: illustrative`: a line in the film says so (the closing note is the usual place).
- Keep it short on screen: people watch on phones, often muted. Detail goes in the captions or the post, not the film.
- The brand digest's visual rules apply.

The build (`run.sh motion brief formats/motion.md --out <dir>`) refuses an unknown class, layout, attribute or sound, two classes of one kind on a block, a missing id or closing scene, or a film over 300 s, and names the line.
