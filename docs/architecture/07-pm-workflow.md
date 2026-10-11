# Product manager workflow

The product manager's path: market → series → AI analysis (customer feedback, plus a research agent for competitors and trends) → one list where the PM keeps, rejects (with a required reason), reorders priority and wishlists competitor/trend features → build car profiles that follow that priority → pipeline complete: the build is saved as a generation and opens its own dashboard (Profiles, Analytics for the L3 social test, Decisions; profile pages export a PDF). /dashboard lists every generation.

```mermaid
flowchart TD
  %% The product manager's path through Dixi, screen by screen. Implemented in web/: /dashboard/[market]/[series].
  %% Layers: L1 = BMW principles · L2 = customer feedback + competitors + trends · L3 = social response to the profiles (low weight).
  %% Every reject asks for a reason; the reason is saved as a decision and shown on the profiles.
  %% The PM's priority order is a human input: profiles pick and list requests in that order.

  landing["Landing page"] --> home
  picker["New analysis<br/>globe: pick a market"]
  picker --> series["Pick a series<br/>1 · 5 · 7"]
  series --> analyse

  subgraph analyse ["AI analysis"]
    direction TB
    l2in["L2 · Customer feedback<br/>likes · dislikes · wishes"]
    research["L2 · Research agent<br/>competitor features people like<br/>+ market trends, with sources<br/>saved research, or a live run the PM starts<br/>(backend: lead + 2 scouts on Tavily, gaps listed)"]
    cluster["Group feedback into feature requests<br/>(BMW taxonomy, data script)"]
    cat["Categorise<br/>Exterior · Interior · Digital · Powertrain"]
    urgency["Urgency<br/>how many customers ask for it"]
    link["Link feedback ↔ competitors / trends<br/>matching requests get highlighted"]
    l2in --> cluster --> cat --> urgency --> link
    research --> link
  end

  memory[("Decision memory<br/>past keeps / rejects + reasons<br/>from earlier generations (Supabase)")] --> score["Dixi score<br/>demand · backing · principle fit<br/>past reject lowers it, unless demand grew"]
  assessor["L1 · Principle assessor (AI)<br/>fit per request · cited principles<br/>evidence vs assumptions · conflicts"] -- "principle fit" --> score
  l1db[("L1 principles<br/>series · market · Group<br/>(Supabase)")] --> assessor
  settings["Settings<br/>scoring weights"] --> score
  link --> score --> list["One list<br/>competitors &amp; trends on top · feature requests below<br/>filter: category · urgency · backed by market"]

  list --> pick{{"PM decides per request"}}
  pick -- "Keep" --> kept["Kept requests"]
  pick -- "Reject" --> why["Reason box<br/>why is it rejected?<br/>(required)"]
  list -- "Drag to reorder" --> prio["Priority order<br/>#1, #2, #3 …"]
  list -- "Star a competitor feature or trend" --> wish["Wishlist<br/>not asked for by customers yet"]

  why --> mem[("Decisions<br/>keep · reject + reason · wishlist<br/>who · when")]
  kept --> mem
  wish --> mem

  kept --> build["Build"]
  prio -- "picks + orders requirements" --> build
  wish -- "added where the profile's theme fits" --> build
  l1["L1 · BMW principles<br/>per series"] --> build
  mem -. "rejected requests stay out" .-> build
  build --> profiles["3 car profiles<br/>Fix the basics · Tech-forward · Comfort &amp; craft<br/>score = L1 (principles + your priority) + L2 coverage"]

  profiles --> done(["Pipeline complete<br/>saved as a generation"]) --> sess[("Generations<br/>every build saved: profiles · decisions · priority · social test")]
  home["Dashboard /dashboard<br/>tabs: Generations (KPIs + cards) · New analysis (globe)"] --> sess
  home -- "New analysis" --> picker
  sess -- "open a generation" --> dash
  sess -. "feeds" .-> memory
  dash -. "Edit and rebuild: decisions + priority loaded" .-> list

  subgraph dash ["Generation dashboard /dashboard/generations#id"]
    direction TB
    tabP["Tab · Profiles<br/>3 cards: score bar · top requirements · wishlist"]
    tabA["Tab · Analytics<br/>launch social test · 14-day engagement per profile<br/>reach · engagement · positive · momentum"]
  end

  tabP --> page["Profile page (catalogue style, like BMW's option list)<br/>cover · at a glance · requirements matrix ■ □ vs other profiles<br/>ⓘ trace per requirement: feedback → competitors/trends → decision (who · when · why) → profile<br/>KPIs · requirements in your priority order + draft targets + options<br/>why the agent chose it · L1 principles · competitors &amp; trends<br/>decision trail incl. reject reasons"]
  mem --> page
  page --> pdf["Download PDF<br/>A4 profile report"]

  tabA --> post["Post the profiles on social media<br/>(simulated for now)"]
  post --> l3["L3 · Which profile tracks better<br/>low weight per series"]
  l3 -- "updates scores" --> tabP

  classDef screen fill:#ffffff,stroke:#1c69d4,color:#121722
  classDef ai fill:#e8f0fc,stroke:#1c69d4,color:#121722
  classDef human fill:#fdecea,stroke:#e22718,color:#121722,stroke-width:2px
  classDef memory fill:#0f3d75,stroke:#0f3d75,color:#ffffff
  classDef layer fill:#eef1f6,stroke:#5b6676,color:#121722

  class landing,picker,series,list,page,tabP,tabA,pdf,home screen
  class cluster,cat,urgency,link,build,profiles,done,score ai
  class pick,why,kept,prio,wish human
  class mem,sess,memory memory
  class l1,l2in,research,l3,post layer
```
