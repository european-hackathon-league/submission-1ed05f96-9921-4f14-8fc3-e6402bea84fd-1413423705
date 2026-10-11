# System overview

The whole system as built: L1 BMW principles and L2 market evidence (including a research agent for competitors and trends) → AI analysis into feature requests → the product manager's gate (keep, reject with a required reason, priority, wishlist) → three car profiles → each build saved as a generation → L3 social test, which runs only after profiles exist. The detailed screen-by-screen path is in [`07-pm-workflow.md`](07-pm-workflow.md); how a decision is audited is in [`08-decision-audit.md`](08-decision-audit.md); the backend research agents as built (and what is still deterministic code) are in [`10-backend-agents.md`](10-backend-agents.md).

```mermaid
flowchart TB
  %% Dixi: principles first, market evidence as the engine, the PM decides, every decision keeps who · when · why.
  %% Colours follow branding/tokens.css: grey = AI on its own, blue = AI proposes, red = human only.
  %% Layers: L1 deep blue (BMW principles), L2 BMW blue (market evidence), L3 light blue (social test, after profiles).

  subgraph SRC["① Inputs"]
    direction LR
    S1[("BMW data (local only)<br/>customer feedback · customer studies<br/>sales · option list")]
    S2[("Public web<br/>competitor features · market trends")]
    S4[/"Series managers<br/>fundamentals per series"/]
  end

  subgraph LAY["② Layers L1 + L2"]
    direction LR
    L1[("L1 · BMW principles (Supabase)<br/>series · market · Group<br/>owner + sources per principle")]
    PA["Principle assessor (AI)<br/>fit per request · evidence vs assumptions<br/>conflicts · gaps"]
    RA["Research agent (backend, live)<br/>lead + competitor and trend scouts<br/>Tavily MCP · sources checked · gaps"]
    L2[("L2 · Market evidence<br/>feature requests · studies · sales<br/>option list · market signals")]
  end

  subgraph AN["③ AI analysis (per market + series)"]
    direction TB
    CL["Group feedback into feature requests (data script)<br/>Exterior · Interior · Digital · Powertrain"]
    UR["Urgency<br/>how many customers ask, in this market"]
    LK["Link requests ↔ competitors / trends"]
  end

  subgraph GATE["④ PM gate"]
    direction LR
    KP{{"Keep"}}
    RJ{{"Reject<br/>reason required"}}
    PR{{"Priority<br/>drag to order"}}
    WL{{"Wishlist<br/>star a competitor feature or trend"}}
  end

  DM[("Decisions<br/>keep · reject · wish<br/>reason · by · at")]
  BU["⑤ Build 3 car profiles<br/>Fix the basics · Tech-forward · Comfort &amp; craft<br/>follow the PM's priority<br/>score = L1 (principles + priority) + L2 coverage"]
  GEN[("⑥ Generations<br/>profiles · decisions · priority<br/>saved per build")]
  PDF[["Profile page + PDF<br/>catalogue style · decision trail"]]
  CHAT["Generation chat (AI)<br/>PM asks about this build<br/>answers from retrieved facts + sources"]
  L3["⑦ L3 · Social test<br/>which profile tracks better (simulated)<br/>weight: 7 Series 2% · 5 Series 8% · 1 Series 20%"]

  S1 --> L2
  S2 --> RA --> L2
  S4 --> L1
  L2 --> CL --> UR --> LK
  L1 --> PA
  LK --> PA
  PA -- "principle fit in the score" --> KP & RJ & PR & WL
  LK --> KP & RJ & PR & WL
  KP & RJ & WL -- "who · when · why" --> DM
  KP & PR & WL --> BU
  L1 --> BU
  DM -. "rejected requests stay out" .-> BU
  BU --> GEN --> PDF
  DM --> PDF
  PDF --> CHAT
  GEN -. "facts: profiles · decisions · principles · runs" .-> CHAT
  GEN -- "after profiles exist" --> L3
  L3 -- "updates scores" --> GEN
  GEN -. "edit and rebuild: decisions + priority loaded" .-> GATE

  classDef auto fill:#eef1f6,stroke:#5b6676,color:#121722
  classDef propose fill:#e8f0fc,stroke:#1c69d4,color:#121722
  classDef human fill:#fdecea,stroke:#e22718,color:#121722,stroke-width:2px
  classDef l1 fill:#16588e,stroke:#16588e,color:#ffffff
  classDef l2 fill:#1c69d4,stroke:#1c69d4,color:#ffffff
  classDef l3 fill:#e5f3fe,stroke:#2f95e6,color:#121722
  classDef store fill:#ffffff,stroke:#16588e,color:#121722
  classDef src fill:#f7f9fc,stroke:#98a2b3,color:#121722

  class S1,S2 src
  class S4,KP,RJ,PR,WL human
  class CL,UR,LK auto
  class RA,BU,PA,CHAT propose
  class L1 l1
  class L2 l2
  class L3 l3
  class DM,GEN,PDF store
```
