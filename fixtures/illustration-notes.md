---
title: Session to draft note
brand: case-amplify
feature: AI-assisted documentation
problem: After a session, the caseworker retypes the conversation into a case note.
answer: A draft note comes from the conversation, each fact tied to its source passage, for the caseworker to verify and correct.
heading: From conversation to a note you can check
copy: Case Amplify drafts the case note from the session transcript and labels where each fact came from, so caseworkers can verify and correct it.
ground: grape
size: wide
figures: illustrative
---

::: {.card #transcript box="5 14 38" phone="5 6 90"}
[Session transcript]{.label}
[I start the warehouse job on Monday.]{.quote .mark #said}
[My sister can drive me for now.]{.line}
[]{.bars n=2 w="80 55"}
:::

:::: {.panel #draft box="51 9 44" phone="5 46 90" title="Draft case note"}
[Starts warehouse job Monday]{.line .ai .strong cite=1 #fact}
[Transportation from family for now]{.line .ai cite=2}
[Next appointment | Needs a date]{.field .missing}
[Checked]{.button .approve was="Check sources" tone=accent}
::::

[]{.tether from=said to=fact phone-sides="l l"}

::: notes
The problem is the retyping; the answer is the draft tied to its source, and the story ends on the caseworker checking its sources.
:::
