# Prism architecture

How raw material becomes proofed, on-brand files, with the backlog's future features placed where they land. State: tree `0.16.0-dev`, backlog as of 8 October 2026 (the pinned Prism Backlog artifact is the source of truth for status).

**Legend** used in every diagram:

```mermaid
flowchart LR
  A["Shipped"]:::done
  B["In progress"]:::prog
  C["Planned / idea"]:::idea
  D["Research"]:::res
  E["Hard gate"]:::gate
  F["File"]:::file
  classDef done fill:#e2f2e9,stroke:#2f7d57,color:#1b1f2a
  classDef prog fill:#fbf0dc,stroke:#b9770f,stroke-dasharray:6 3,color:#1b1f2a
  classDef idea fill:#e6edfd,stroke:#3c66d6,stroke-dasharray:2 3,color:#1b1f2a
  classDef res fill:#fbe5e8,stroke:#c4404f,stroke-dasharray:2 3,color:#1b1f2a
  classDef gate fill:#ffffff,stroke:#1b1f2a,stroke-width:3px,color:#1b1f2a
  classDef file fill:#eceef3,stroke:#aab1c1,color:#1b1f2a
```

## 1. System overview

```mermaid
flowchart TB
  U(["Person in Cowork"])

  subgraph L1["Commands and skills"]
    direction LR
    SD["prism-draft<br/>/prism-interview"]:::done
    SP["prism-produce"]:::done
    SQ["prism-quick"]:::done
    CO["/prism-onboard"]:::done
    CT["/prism-tutorial"]:::done
  end

  subgraph L2["Agents and Claude surfaces"]
    direction LR
    AW["prism-writer"]:::done --> AR["prism-reviewer"]:::done --> DOC["Proof doc<br/>Claude Docs"]:::done
    AF["prism-formatter x N"]:::done --> CAN["Design canvas<br/>Claude Design"]:::done
  end

  subgraph L3[".prism-kit build kit"]
    direction LR
    RUN{{"run.sh"}}:::done
    WIRE["Design-mode tools"]:::done
    BLD["Builders"]:::done
    CHK["Checks + verify"]:::done
    PKG["packages.js"]:::prog
  end

  subgraph L4["Brand system"]
    direction LR
    DS[("Claude Design System")]:::done -. pinned .-> PROF["profile.json + snapshot"]:::done --> RES["resolve.js"]:::done
  end

  subgraph L5["Delivery"]
    direction LR
    FILES["PDF, PPTX, PNG,<br/>HTML email, blog"]:::done
    ZIP["Package zip"]:::prog
    EXP["Exports page"]:::prog
    CONN["Planable, Zoho,<br/>storage connectors"]:::idea
  end

  COOP["Co-op invitees"]:::prog

  U --> L1
  SD --> AW
  SP --> AF
  CAN <--> WIRE
  SQ --> RUN
  WIRE --> RUN
  RUN --> BLD --> CHK
  PKG --> RUN
  CO --> PROF
  RES --> BLD
  CHK --> FILES
  FILES --> ZIP & EXP
  FILES -.-> CONN
  COOP -. "edits, @claude" .-> DOC
  EXP -.-> COOP

  classDef done fill:#e2f2e9,stroke:#2f7d57,color:#1b1f2a
  classDef prog fill:#fbf0dc,stroke:#b9770f,stroke-dasharray:6 3,color:#1b1f2a
  classDef idea fill:#e6edfd,stroke:#3c66d6,stroke-dasharray:2 3,color:#1b1f2a
```

## 2. The piece pipeline

Approval of the proof is the one hard stop; every non-destructive step after it runs on its own (F7).

```mermaid
flowchart TD
  subgraph S1["1 · Intake"]
    RAW["Raw material<br/>notes, transcripts, docs, photos"]:::done
    INT["Interview F1<br/>audience, length, outputs, images"]:::done
    IMG["Asset intake F6<br/>uploads, brand library, focal points"]:::done
    CAP["App screen capture F16<br/>Playwright recipes"]:::idea
    SRC["Source connectors T2"]:::idea
  end

  subgraph S2["2 · Draft"]
    W["prism-writer"]:::done
    C1["content.md"]:::file
    C2["claims.md"]:::file
    C3["interview.md<br/>private"]:::file
    R["prism-reviewer<br/>flags, never rewrites"]:::done
  end

  subgraph S3["3 · Proof F5"]
    PD["Proof doc<br/>Content + Claims tabs"]:::done
    VET["Vet every edit"]:::done
    CO["Late co-editor edits F14"]:::prog
    AP{{"Approve"}}:::gate
  end

  subgraph S4["4 · Format"]
    PK["Template package F4<br/>case-study, demo-follow-up"]:::prog
    F["prism-formatter x N<br/>in parallel"]:::done
    FM["formats/id.md"]:::file
    ALT["Alternate layouts D4"]:::prog
    T1["Layout variety + rule cutoff T1"]:::idea
  end

  subgraph S5["5 · Design mode"]
    BD["Boards on the canvas<br/>build-wire.js"]:::done
    RB["Read-back wire_diff<br/>safe apply M11, sync M12"]:::done
    ST["state.json + changes log M8"]:::done
    M6["Cross-output check M6"]:::idea
    M10["Per-format content check M10"]:::res
    DONE{{"done"}}:::gate
  end

  subgraph S6["6 · Build and verify"]
    NUM["check-numbers"]:::done
    B["Builders"]:::done
    PV["Fit warnings + preview"]:::done
    VF{{"verify<br/>stamp + brand fonts"}}:::gate
    PC["packages check --built + claims"]:::prog
  end

  subgraph S7["7 · Deliver"]
    FL["Files in the workspace"]:::done
    RE["Re-export on later changes M5"]:::done
    ZP["Package zip F4"]:::prog
    EX["Exports page F13"]:::prog
    CN["Planable, Zoho, storage T2"]:::idea
  end

  RAW --> INT --> W
  IMG --> W
  CAP -.-> IMG
  SRC -.-> RAW
  W --> C1 & C2 & C3
  C1 --> R --> PD --> VET --> AP
  CO -.-> AP
  AP --> PK -.-> F
  AP --> F --> FM
  ALT -.-> F
  T1 -.-> F
  FM --> BD --> RB --> ST --> DONE
  M6 -.-> DONE
  M10 -.-> RB
  DONE --> NUM --> B --> PV --> VF
  PC -.-> VF
  VF -- OK --> FL --> RE
  FL --> ZP & EX
  FL -.-> CN

  QK["prism-quick<br/>one output, no proof stop"]:::done
  RAW -. bypass .-> QK --> NUM

  classDef done fill:#e2f2e9,stroke:#2f7d57,color:#1b1f2a
  classDef prog fill:#fbf0dc,stroke:#b9770f,stroke-dasharray:6 3,color:#1b1f2a
  classDef idea fill:#e6edfd,stroke:#3c66d6,stroke-dasharray:2 3,color:#1b1f2a
  classDef res fill:#fbe5e8,stroke:#c4404f,stroke-dasharray:2 3,color:#1b1f2a
  classDef gate fill:#ffffff,stroke:#1b1f2a,stroke-width:3px,color:#1b1f2a
  classDef file fill:#eceef3,stroke:#aab1c1,color:#1b1f2a
```

### Revision lanes after approval

```mermaid
flowchart LR
  REQ(["Change request<br/>chat, doc or canvas"]) --> Q{"Wording or facts?"}
  Q -- yes --> CL["content.md first<br/>version bump + changes: line"]:::done
  CL --> CK["vet, reviewer, claims"]:::done
  CK --> PA["Patched into every<br/>format file"]:::done
  Q -- "layout only" --> LL["That one format file"]:::done
  PA & LL --> RX["Re-export M5"]:::done

  classDef done fill:#e2f2e9,stroke:#2f7d57,color:#1b1f2a
```

## 3. The build kit

`plugin/prism/skills/prism-produce/kit/`, copied into each workspace as `.prism-kit`. `run.sh` is the only entry point; each part installs its own tools on first use.

```mermaid
flowchart LR
  RUN{{"run.sh"}}:::done

  subgraph B["Builders"]
    direction TB
    BS["build-sheet.js<br/>sheet, brochure, swatch"]:::done
    BK["build-deck.js<br/>pptxgenjs"]:::done
    BO["build-social.js<br/>posts, stories, carousels"]:::done
    BB["build-blog.js"]:::done
    BE["build-email.js"]:::done
    BW["build-wire.js<br/>design-mode boards"]:::done
  end

  subgraph T["Toolchain"]
    direction TB
    PAN["pandoc + Lua filters"]:::done
    CHR["Playwright Chromium"]:::done
    MISC["sharp, pikepdf,<br/>fontTools, Phosphor"]:::done
  end

  subgraph C["Checks and integrity"]
    direction TB
    CN["check-numbers.js"]:::done
    VT["vet.py"]:::done
    VR["verify.py"]:::done
    TP["tidy_pdf.py"]:::done
    PL["palette.js + outlook-sim.js"]:::done
  end

  subgraph BR["Brand access"]
    direction TB
    RS["resolve.js"]:::done
    BJ["brand.js"]:::done
    ON["onboard.js, pin.js"]:::done
    SW["swatch.js, library.js"]:::done
  end

  subgraph DM["Design-mode state"]
    direction TB
    WD["wire_diff.py"]:::done
    SJ["state.js"]:::done
  end

  subgraph FU["Packages, co-op, future"]
    direction TB
    PJ["packages.js F4"]:::prog
    EJ["exports.js F13"]:::prog
    CP["run.sh capture F16"]:::idea
  end

  RUN --> B & C & BR & DM & FU
  B --> T
  BR --> B

  classDef done fill:#e2f2e9,stroke:#2f7d57,color:#1b1f2a
  classDef prog fill:#fbf0dc,stroke:#b9770f,stroke-dasharray:6 3,color:#1b1f2a
  classDef idea fill:#e6edfd,stroke:#3c66d6,stroke-dasharray:2 3,color:#1b1f2a
```

## 4. The brand system

Core is structure; brands are presentation. Core never names a brand (`tests/core-brand-free.test.py`).

```mermaid
flowchart TD
  DS[("Claude Design System<br/>read as is, never changed")]:::done
  ROLES["roles.json<br/>84 roles, 16 required, fallbacks"]:::done

  subgraph BRAND["kit/brands/id"]
    direction LR
    PROF["profile.json<br/>roles to native names, theme,<br/>components, m365 email palette"]:::done
    SNAP["snapshot/<br/>sha256-pinned tokens, fonts, assets"]:::done
    LAY["layers/*.css"]:::done
    ORN["ornaments.js"]:::done
    DIG["digest.md"]:::done
    OFF["office/ fonts"]:::done
  end

  RES["resolve.js"]:::done
  OUT["resolved.json + prism.css"]:::file
  BLD["Builders"]:::done

  DS -- "pinned copy" --> SNAP
  DS -. "live drift check" .-> RES
  ROLES --> PROF
  PROF & SNAP --> RES --> OUT --> BLD
  LAY & ORN --> BLD
  DIG --> AG["Agents + quick mode"]:::done

  subgraph LIST["Brands"]
    CA["case-amplify<br/>default"]:::done
    PR["prism"]:::done
    DR["Drafts in .prism/brands"]:::done
  end
  LIST --- BRAND

  D4["Alternate layouts D4"]:::prog
  CAPR["capture/ recipes F16"]:::idea
  PKJ["packages.json in the<br/>design system F4"]:::prog
  T1R["Rule cutoff per brand T1"]:::idea
  D4 & CAPR & T1R -.-> BRAND
  PKJ -.-> DS

  classDef done fill:#e2f2e9,stroke:#2f7d57,color:#1b1f2a
  classDef prog fill:#fbf0dc,stroke:#b9770f,stroke-dasharray:6 3,color:#1b1f2a
  classDef idea fill:#e6edfd,stroke:#3c66d6,stroke-dasharray:2 3,color:#1b1f2a
  classDef file fill:#eceef3,stroke:#aab1c1,color:#1b1f2a
```

### Onboarding a brand (D11)

```mermaid
flowchart LR
  A["/prism-onboard<br/>interview"] --> B["onboard start"] --> C["map + report<br/>one round of questions"] --> D["Swatch board<br/>in design mode"]
  D -- "changes, re-pinned" --> C
  D -- done --> E["Bundle zip"] --> F["tools/add-brand.py"] --> G["pin + tests"] --> H["kit/brands/id"]
```

## 5. Co-op mode (future)

The owner's Prism does all the work; invitees need edit access only. Framework merged, not yet confirmed live; the F15 two-account test decides F10 and F12.

```mermaid
sequenceDiagram
  autonumber
  actor O as Owner
  participant P as Owner's Prism
  participant D as Proof doc + canvas
  actor I as Invitee
  participant X as Exports page

  O->>P: Work on this with @Dana (F9)
  P->>D: Owner line in About tab + canvas note
  P-->>O: Share, add Dana as Editor
  I->>D: Hand edits
  I->>D: @claude comment (F10, idea)
  D-->>P: Wake on comment
  P->>D: Apply via content lane, reply in thread
  I->>D: approve or done
  P-->>O: Sent to owner for approval (F11)
  O->>P: approve (F14) / done
  P->>X: Publish exported files (F13)
  X-->>I: Download PDF and images
  Note over I,P: An invitee's own Claude relays requests as comments (F12, idea)
```

## 6. Open backlog items

```mermaid
flowchart LR
  F8["F8 Co-op mode"]:::prog
  F15["F15 Two-account test<br/>READY · P1"]:::gate
  F9["F9 Invite + owner line"]:::prog
  F10["F10 @claude requests"]:::idea
  F11["F11 Owner-only gates"]:::prog
  F12["F12 Chat relayed as comment"]:::idea
  F13["F13 Shared exports"]:::prog
  F14["F14 Proof at approval"]:::prog
  T2["T2 Connectors · 0.19"]:::idea
  F4["F4 Packages · 0.18"]:::prog
  M6["M6 Outputs in same panel · 0.18"]:::idea
  M10["M10 Per-format check · 0.18"]:::res
  D4["D4 Alternate layouts"]:::prog
  T1["T1 Layout rules · 0.17"]:::idea
  F16["F16 App screens"]:::idea
  V1(["v1 · the only release"])

  F8 --> F9 & F10 & F11 & F12 & F13 & F14
  F15 -- unblocks --> F10 & F12
  F15 -- confirms --> F9 & F11 & F13
  T2 -- "fallback for decks, zips" --> F13
  F4 -- "claims check" --> M10
  M10 --> M6
  D4 --- T1
  F4 & F8 & M6 & M10 & D4 & T1 & T2 & F16 --> V1

  classDef prog fill:#fbf0dc,stroke:#b9770f,stroke-dasharray:6 3,color:#1b1f2a
  classDef idea fill:#e6edfd,stroke:#3c66d6,stroke-dasharray:2 3,color:#1b1f2a
  classDef res fill:#fbe5e8,stroke:#c4404f,stroke-dasharray:2 3,color:#1b1f2a
  classDef gate fill:#e2f2e9,stroke:#2f7d57,stroke-width:3px,color:#1b1f2a
```

| ID | Item | Status | Pri | Target |
|---|---|---|---|---|
| F15 | Co-op two-account platform test | ready | P1 | |
| F4 | Template packages | in progress | P2 | 0.18 |
| F8 | Co-op mode (parent of F9–F15) | in progress | P2 | |
| F9 | Invite and owner line | in progress | P2 | |
| F11 | Owner-only gates and notifications | in progress | P2 | |
| F13 | Shared exports | in progress | P2 | |
| F14 | Proof doc at and after approval | in progress | P2 | |
| D4 | Alternate layouts | in progress | P3 | |
| M10 | Per-format content check | research | P2 | 0.18 |
| F10 | Invitee requests by @claude comment | idea | P2 | |
| F12 | Invitee chat relayed as a comment | idea | P3 | |
| F16 | Case Amplify app screens | idea | P2 | |
| M6 | Additional outputs in the same panel | idea | P2 | 0.18 |
| T1 | Layout variety and header-length rules | idea | P2 | 0.17 |
| T2 | Connector support (Planable, Zoho) | idea | P2 | 0.19 |

Release targets are the backlog's working labels; per the standing rule only v1 is cut.
