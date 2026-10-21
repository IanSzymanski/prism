# Motion (an animated film, made in Claude Motion)

A short animated film from the approved words: a vertical story, a feed post, a square or a 16:9 clip. Prism doesn't render video. The format file is a direction script: `run.sh motion brief` turns it into a brief, Claude makes the film with the Motion artifact type from that brief, and Prism checks the film it made (`references/film.md`). The person exports the MP4 from the film's page. Claude only: needs the Motion artifact type (Team and Enterprise plans).

Each **technique** is a motion format with its own layouts, classes and defaults. `run.sh motion techniques --brand <brand>` lists the ones the brand uses and its motifs:

| Technique | What it is |
|---|---|
| `stat-story` | Number-led: counts, charts that build, before and after. Layouts `title`, `stat`, `chart`, `compare`, `list`, `quote`, `closing` |
| `kinetic` | Type-led: one idea per scene, lines that mask up, split and stamp in. Layouts `title`, `statement`, `list`, `quote`, `closing` |
| `walkthrough` | A product walkthrough: the app rebuilt full-screen from its screenshots, a step card, a cursor and a camera that pushes in on each action. Layouts `title`, `app`, `step`, `closing`. 16:9 and calm by default. See "UI walkthroughs" below |

## Front matter

```yaml
---
title: Harbor Point, notes in a day     # the film's name (never "Video")
technique: stat-story
piece: case-study                       # the kind of film: case-study, announcement, walkthrough…
aspect: story                           # story 1080×1920 (default) | post 1080×1350 | square 1080×1080 | wide 1920×1080
energy: lively                          # calm | lively | bold (the technique's default when left out)
music: calm                             # calm (default) | bright | none
figures: illustrative                   # copy it from content.md when it says so
read: 20                                # characters a second a viewer reads (20 by default); sets every scene's hold
data: demo                              # walkthrough only: demo | stand-in (the data its screenshots show)
assumed: the sign-up address            # walkthrough only: details nobody confirmed, separated by ; (flagged on delivery)
---
```

## The brand's rules for a kind of film

A brand can keep its own motion rules for a kind of film, in its profile (`motion.pieces.<piece>`): backdrops, classes and colors it never uses, its own grounds (a gradient drawn from a brand asset), colors per ground, a backdrop's look, a brand transition drawn from its motif (forced out of a ground, if the brand says so) and plain rules (for example, durations in days shown as a calendar). Name the kind with `piece:`; `run.sh motion brief` applies them, refuses a class or backdrop they rule out, and warns when the brand has rules but no `piece:` is named. Read the brief's "This brand's … films" section and lay the film out to suit it. A kind the brand has no rules for uses core's vocabulary as it is.

## The brand's film settings

A brand can also set how all its films look and sound, in its profile (`motion.film`), and `run.sh motion brief` applies them to every film in the brand:

- `music`: the film's music when the front matter names none (`none` makes films silent; `music:` in the front matter still wins).
- `deny_motifs`: motifs its films never use. They are left out of backdrops, dividers and the brand's motif transitions, and a scene that names one is refused.
- `gradients`: the only gradient grounds its films use, each as CSS (`{"night": {"css": "...", "say": "..."}}`, keyed by ground name). The brief prints each one's CSS for Motion to use exactly; a scene on any other gradient (`bg=`) is refused.
- `icons: "lucide"`: icons are drawn from the vendored Lucide set (stroke icons, `kit/vendor/lucide`). A format file still writes `.ph-<name>`: Phosphor names map to Lucide through `vendor/lucide/from-phosphor.json`, and a Lucide name works as it is.
- `tone` and `feel`: house rules at the top of the brief.
- `words`: `max_per_scene` (the brief warns over it: write fewer words) and `scale` (type sizes are multiplied by it, and visuals are drawn large).
- `walkthrough`: `cards: false` (no title or closing scene: the film opens and ends on the app, and each step's `##` line is an annotation instead of a step card, one line, no `.sub`), `ui: "full-frame"` (the app covers the frame, never a device or window on a ground), `ui_in_out: true` (the UI builds in at the start and animates out at the end) and `annotations` (`fill`, a role or hex; `text`; `lines`; `tether`).

Read the brief's "<brand> films" section and write the film to suit it: fewer, larger words, and no scene the brand leaves out.

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
- `dur=` seconds, a minimum (the layout's default when left out). Every scene holds after its last entrance lands, its backdrop and hold moves still going, before anything leaves. The hold grows with the words on screen: a second for every 20 characters (`read:` in the front matter changes the rate), 3 s at least and 12 s at most, so a scene with a long list stays up long enough to read. `hold=` on a scene sets its hold by hand (1 to 30 s). When `dur=` is too short the build lengthens the scene and says by how much, so set it to what the build reports. `name=` is the label on the film's timeline (from the id when left out), one to three words.
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
| Picture | `![](images/photo.jpg){.pan frame=card}` (`frame=` `card`, `circle`, `arch`, `browser`, `phone`, `tablet`, `laptop`; a screenshot in `phone`, `tablet` or `laptop` sits in core's device mockup); images from content.md only | |
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

## UI walkthroughs (`technique: walkthrough`)

A walkthrough shows someone using the product: the opening screen, the app meeting the viewer, a few numbered steps (one task each) and an end card. Its scenes follow the house rules for walkthrough videos, which the brief spells out for Motion: full-screen UI, slow pacing, the camera pushing in on what matters and pulling back out, focus on one subject at a time, nothing overset, smooth typing, transitions instead of cuts.

```markdown
:::: {.scene .title #open}
[Product walkthrough · Illustrative demo]{.eyebrow}

# Write a visit note in *four steps* {.xl}
::::

:::: {.scene .app #meet}
![Visit notes](images/notes.png){.screen}

## Meet Harbor Point

[Every visit note your team writes, in one list.]{.sub}
::::

:::: {.scene .step #write}
![New visit note](images/new-note.png){.screen}

## Write it once

[Pick the client and the visit, then type what happened.]{.sub}

[Sam Ortiz]{.fill field="Client" zoom=1.6}

[Home visit]{.choose field="Visit type"}

[Save and share]{.click sfx=click}

[Note shared with your team]{.toast}
::::

:::: {.scene .step #phone screen=phone}
![Visit notes on a phone](images/phone.png){.screen}

## Read it anywhere

[The same note, on the phone, for the next visit.]{.sub}

[Sam Ortiz]{.focus zoom=1.8}
::::

:::: {.scene .closing #close}
## Visit notes, written once and shared.

[Start at harborpoint.example.com]{.cta}

![Brand](prism:logo){.grow}
::::
```

**Layouts.** `.title` is the opening screen (about 4 s; it zooms through into the app and never persists). `.app` meets the app: the UI builds in (header, navigation, content, staggered) with the whole screen in view, then the camera pushes in. `.step` is one numbered step, one continuous scene. `.closing` is the end card: one short line, the call to action and the logo; Prism adds the recap of the steps from their titles.

**Screenshots are layout guides.** `![Page name](images/screen.png){.screen}` in an `.app` or `.step` scene is the screenshot Motion rebuilds that page from, as live HTML: the same layout, copy and colors, crisp at any zoom, every control pressable. It is never shown as a picture. One per scene; a scene without one stays on the page the scene before ended on. Screenshots come from content.md's images, like any picture, and the whole window is best (1440 px wide or more for desktop).

**The step card** is the scene's `## title` and one `.sub` sentence. Prism adds the number, the eyebrow ("Step 2 of 4") and the progress dots, sets it bottom-left inside the safe area, and collapses it to a chip about 2 s after it lands. The words on an `.app` or `.step` scene are only the card and the actions: anything else goes on the title or end card.

**Actions** are what the viewer sees happen, one per line, in order. Each waits for the step card to collapse and for the action before it to land and hold (about 1.6 s), so only one thing moves at a time; `at=` sets one by hand.

| Action | Markdown | What Motion shows |
|---|---|---|
| Click | `[New note]{.click}` | The cursor travels to the control with that label, settles, clicks: the button presses and ripples |
| Type | `[Sam Ortiz]{.fill field="Client"}` | The field shows its focus ring; the words type in at an even 33 letters a second, the caret solid while typing |
| Choose | `[Home visit]{.choose field="Visit type"}` | The menu opens, the choice highlights and is clicked |
| Focus | `[Visit notes]{.focus zoom=1.5}` | The camera pushes in on it |
| Back | `[]{.back}` | The camera pulls back to the whole screen |
| Scroll | `[Intake history]{.scroll}` | The page scrolls until it is in view |
| Open, close | `[Assign a reviewer]{.open}`, `[Assign a reviewer]{.close}` | A dialog or panel scales in from where it opens; everything behind it dims and blurs |
| Wait | `[Save and share]{.wait}` | A spinner on it turns into a check |
| Toast | `[Note shared]{.toast}` | A toast slides in (bottom right; at the top on tall stages) |
| Show | `[New row]{.show}` | Something appears the way the UI shows it: a row, card or badge rising in |

`zoom=1.4`–`2` on an action pushes the camera in on it first; it stays in until a `.back` or the end of the scene, when the camera pulls back to the whole screen so the chrome matches the next scene. The labels in actions are on-screen words like any other: they must match the UI, so they come from the screenshots.

**Screens and aspect ratios.** `screen=desktop|tablet|phone` on a scene is the layout the app shows (else the screenshot's shape, else the scene before's, else the stage's own). How it sits depends on the stage: a desktop app fills a wide stage edge to edge; on a story stage it fills the height and the camera pans with the action; a phone app on a wide stage sits in core's phone mockup. Hand-offs are picked from what is on either side: the same screen keeps its chrome (`chrome`: only the page content changes), a new screen reframes (`reframe`: the window pulls back and changes shape into the new proportions), the title zooms through into the app (`zoom-through`), and the UI fades out before the end card (`fade`). A chrome hand-off across two screens, or a cut, is refused. Another aspect of the same walkthrough (a story cut of a wide film) is a second format file with the same scene ids and `aspect: story`.

**Data and assumptions.** `data: demo` rebuilds the screenshots' copy as it is. `data: stand-in` (the screenshots show real people's data) replaces every name and detail with invented ones, and a line on screen must say the film is illustrative. `assumed:` lists details nobody confirmed (a URL, a price); they are carried to delivery and flagged.

**Gaps.** `run.sh motion gaps formats/motion.md` lists what only the person can answer, as questions: a scene with no screenshot to rebuild, a screenshot that's missing or too small, a screen change with no screenshot of the new layout, a screenshot of the wrong shape, unknown data, an end card with no call to action, an address on screen that content.md doesn't have, each assumed detail. `ASK (needed)` stops the brief until it is answered; the rest are asked when there's a chance, and flagged on delivery when not.

## Rules

- 10–30 s for stat-story, 8–30 s for kinetic, 30–150 s for a walkthrough (two to seven steps, each under 20 s); 300 s is the hard limit. About 3–5 s a scene (9–20 s a walkthrough step); one idea per scene.
- Neighbouring scenes never look alike: vary the ground, the backdrop and how they arrive (the build warns when two in a row match).
- Numbers, names and quotes come from content.md exactly; a count lands on the real value.
- `figures: illustrative`: a line in the film says so (the closing note is the usual place).
- Keep it short on screen: people watch on phones, often muted. Detail goes in the captions or the post, not the film.
- The brand digest's visual rules apply, and each motif's own rules.

The build (`run.sh motion brief formats/motion.md --out <dir>`) refuses an unknown class, layout, ground, backdrop, transition, attribute, icon or sound, two classes of one kind on a block, an emphasis with no accent word, a motif the brand doesn't have, a missing id or closing scene, or a film over 300 s, and names the line. It warns when a block has under 0.6 s on screen before it leaves.
