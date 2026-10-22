---
title: One connected record
brand: case-amplify
feature: Connected case context
problem: A participant's story is split across forms, notes, messages and documents.
answer: The pieces come together in one case record that staff with access can work from.
heading: The whole case, in one place
copy: Intake answers, session notes, messages and documents connect to the participant's case record, so the next person on the case starts with the full picture.
ground: haze
size: full
figures: illustrative
---

::: {.card #intake box="6 14 22" phone="6 5 42"}
[Intake form]{.label}
[]{.bars n=2 w="85 60"}
:::

::: {.card #notes box="6 62 22" phone="52 5 42"}
[Session note]{.label}
[]{.bars n=2 w="75 90"}
:::

::: {.card #messages box="72 14 22" phone="6 80 42"}
[Messages]{.label}
[]{.bars n=2 w="90 50"}
:::

::: {.card #docs box="72 62 22" phone="52 80 42"}
[Documents]{.label}
[]{.bars n=2 w="65 80"}
:::

:::: {.panel #record box="34 20 32" phone="6 24 88" title="Case record"}
[Maria Lopez | Participant]{.row .key pill="Active" tone=accent}
[Goal | Full-time work by spring]{.field}
[Housing, Transportation, Employment]{.tags}
[Reviewed by her caseworker]{.pill tone=accent fx=pop}
::::

[]{.tether from=intake to=record .wide-only}
[]{.tether from=notes to=record .wide-only}
[]{.tether from=messages to=record .wide-only}
[]{.tether from=docs to=record .wide-only}
