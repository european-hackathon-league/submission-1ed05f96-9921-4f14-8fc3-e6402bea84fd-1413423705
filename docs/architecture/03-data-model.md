# Data model

The entities as built in `web/src/lib/pipeline/` (`types.ts`, `profiles.ts`, `sessions.ts`, `analytics.ts`, `series.ts`): series, markets, feature requests, option items, market signals, principles, decisions, generations, profiles, profile requirements and social-test campaigns.

**Where it lives today.** Decisions and the priority order are stored per market + series in the browser (`localStorage`, keys `dixi:decisions:*` and `dixi:priority:*`); generations are stored there too (`dixi:sessions`, last 30). `by` and `created_by` come from a simple local "who is deciding" identity (`dixi:user`, `web/src/lib/user.ts`) until there is a login. Series, markets, feature requests, option items, studies and sales come from `web/data-local/pipeline.json`, built locally by `scripts/build-pipeline-data.py` and git-ignored; without it (e.g. on Vercel) the app uses example data with the same shape. Principles live in `series.ts` and market signals in `market-signals.ts` (example content and public sources). **Planned:** the same entities as Supabase tables, with a real login replacing the local identity.

```mermaid
erDiagram
  %% Matches web/src/lib/pipeline/*.ts. GENERATION is called Session in code.
  SERIES ||--o{ PRINCIPLE : "L1 · owns"
  SERIES ||--o{ FEATURE_REQUEST : "L2 · has"
  SERIES ||--o{ OPTION_ITEM : "option list today"
  MARKET ||--o{ FEATURE_REQUEST : "mentions by market"
  FEATURE_REQUEST }o--o{ OPTION_ITEM : "related options"
  MARKET_SIGNAL }o--o{ SERIES : "applies to"
  MARKET_SIGNAL }o--o{ MARKET : "applies in"
  MARKET_SIGNAL }o--o{ FEATURE_REQUEST : "relates_to"
  FEATURE_REQUEST ||--o| DECISION : "keep or reject"
  MARKET_SIGNAL ||--o| DECISION : "wish"
  GENERATION }o--|| SERIES : "for"
  GENERATION }o--|| MARKET : "scope"
  GENERATION ||--o{ DECISION : "snapshot of"
  GENERATION ||--|{ PROFILE : "builds 3"
  PROFILE ||--o{ PROFILE_REQUIREMENT : "lists, in PM order"
  FEATURE_REQUEST ||--o{ PROFILE_REQUIREMENT : "becomes"
  PROFILE }o--o{ MARKET_SIGNAL : "wishes · backing"
  GENERATION ||--o{ CAMPAIGN : "L3 social test"
  DECISION }o--o{ FEATURE_REQUEST : "memory: lowers or lifts the score next time"
  SCORING_SETTINGS ||--o{ FEATURE_REQUEST : "ranks"
  PROFILE ||--o| CAMPAIGN : "tracked by"

  SERIES { text id "F70 | G60 | G70" text name text slug text focus "categories" float l3_weight "0.20 | 0.08 | 0.02" }
  MARKET { text id "EU | US | CN | JP | ALL" text name }
  PRINCIPLE { text id "P1" text series_id text text text owner }
  FEATURE_REQUEST { text id text series_id text title text category "Exterior | Interior | Digital | Powertrain" text summary int mentions jsonb by_market "mentions per market" jsonb types "wants | difficult | defect" jsonb sources text_array taxonomy "BMW topics behind it" text_array quotes "local data only" }
  OPTION_ITEM { text code text name float price_eur text group }
  MARKET_SIGNAL { text id text kind "competitor | trend" text title text competitor text category text detail text_array relates_to "request titles" text strength "strong | emerging" jsonb sources "label + url" }
  DECISION { text request_id text title text action "keep | reject | wish" text reason "required for reject" text by "name, local identity" text role timestamptz at int mentions_at "customers asking at decision time" }
  GENERATION { text id "G-..." timestamptz created_at text created_by text created_by_role text scope text series_id jsonb profiles jsonb decisions text_array priority_order jsonb campaigns "null until tested" }
  PROFILE { text id "fix | tech | comfort" text name text tagline text_array why float score_l1 float score_l2 float score_l3 "null until tested" float total }
  PROFILE_REQUIREMENT { text profile_id text request_id int priority "PM position, 1 = first" int scoped_mentions text draft_target "SMART draft, PM edits" }
  SCORING_SETTINGS { float w_demand float w_backing float w_fit float reject_penalty float keep_bonus int half_life_days float resurface_at bool hide_rejected text memory_scope "market | all" }
  CAMPAIGN { text profile_id int days "14" int impressions float engagement float positive int shares float l3 "0-1, simulated" }
```

The Dixi score and decision memory are derived, not stored: see `09-scoring-and-memory.md`. Scoring settings live in localStorage (`dixi:scoring`) today.

Urgency is not stored: it is derived from mentions in the chosen market (high ≥ 50, medium ≥ 20, else low). Draft targets are also derived (`draftTarget` in `profiles.ts`) when a profile is shown.
