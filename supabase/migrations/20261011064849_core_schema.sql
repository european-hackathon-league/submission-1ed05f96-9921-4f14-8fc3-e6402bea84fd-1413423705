-- Dixi core schema: L1 principles, decisions (append-only history), generations, agent runs, scoring settings.
-- Only the backend (secret key) reads and writes; RLS is on with no policies, so the public anon key gets nothing.
-- BMW customer data (verbatims, quotes) is never stored here: requests are referenced by id + title only.

-- L1 principles: Group-wide, per market (research in data/L1_Files) and per series (product fundamentals).
create table public.principles (
  id             text primary key,                 -- 'GL-01', 'EU-03', 'UK-04', 'CN-05', 'US-07', 'G60-P1'
  level          text not null check (level in ('group', 'market', 'series')),
  market         text check (market in ('GLOBAL', 'EU', 'UK', 'CN', 'US')),
  series         text check (series in ('F70', 'G60', 'G70')),
  title          text not null,
  statement      text not null,                    -- the principle itself
  boundary       text,                             -- what it does not say / must not be inferred
  classification text,                             -- explicit BMW principle · repeated practice · interpretation
  confidence     text,                             -- High · Medium · Low (from the research)
  sources        jsonb not null default '[]',      -- [{ref, label, url}]
  owner          text not null,                    -- who may change it
  version        int  not null default 1,
  active         boolean not null default true,
  updated_at     timestamptz not null default now(),
  updated_by     text not null default 'seed'
);
create index principles_market_idx on public.principles (market) where active;
create index principles_series_idx on public.principles (series) where active;

-- Every PM decision, append-only: an undo is its own row, so the history is never lost.
create table public.decisions (
  id            bigint generated always as identity primary key,
  series        text not null check (series in ('F70', 'G60', 'G70')),
  market        text not null,                     -- app scope: EU · US · CN · JP · ALL
  request_id    text not null,                     -- feature request or signal id
  title         text not null,
  action        text not null check (action in ('keep', 'reject', 'wish', 'undo')),
  reason        text,
  mentions_at   int,                               -- customer mentions at decision time (resurfacing rule)
  by_name       text not null,
  by_role       text,
  at            timestamptz not null default now(),
  generation_id text,                              -- set when the decision was saved with a build
  constraint reject_needs_reason check (action <> 'reject' or length(coalesce(trim(reason), '')) > 0)
);
create index decisions_lookup_idx on public.decisions (series, market, request_id, at desc);

-- Generations: every "Build profiles" (profiles, decisions, priority, social test) as the web app's Session object.
create table public.generations (
  id              text primary key,                -- 'G-…'
  series          text not null,
  market          text not null,
  created_at      timestamptz not null,
  created_by      text,
  created_by_role text,
  payload         jsonb not null,
  updated_at      timestamptz not null default now()
);
create index generations_series_idx on public.generations (series, market, created_at desc);

-- Agent runs, stored with their inputs and outputs so every signal and assessment can be traced.
create table public.research_runs (
  id          uuid primary key default gen_random_uuid(),
  series      text not null,
  market      text not null,
  request     jsonb not null,
  result      jsonb not null,
  model       text not null,
  searches    int  not null,
  created_at  timestamptz not null default now()
);
create index research_runs_idx on public.research_runs (series, market, created_at desc);

create table public.principle_assessments (
  id              uuid primary key default gen_random_uuid(),
  series          text not null,
  market          text not null,
  principle_ids   text[] not null,                 -- the principles the agent was given (snapshot of ids)
  request         jsonb not null,
  result          jsonb not null,
  model           text not null,
  created_at      timestamptz not null default now()
);
create index principle_assessments_idx on public.principle_assessments (series, market, created_at desc);

-- Scoring settings (one row today; per-series rows later) and the log of every applied change.
create table public.scoring_settings (
  id          text primary key default 'global',
  settings    jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text not null
);

create table public.scoring_changes (
  id          bigint generated always as identity primary key,
  instruction text,                                -- the manager's words, if any
  source      text not null,                       -- 'sliders' · 'ai:<model>' · 'rules'
  changes     jsonb not null,                      -- ["wDemand 0.6 → 0.5 because …"]
  before      jsonb not null,
  after       jsonb not null,
  by_name     text not null,
  by_role     text,
  at          timestamptz not null default now()
);

alter table public.principles            enable row level security;
alter table public.decisions             enable row level security;
alter table public.generations           enable row level security;
alter table public.research_runs         enable row level security;
alter table public.principle_assessments enable row level security;
alter table public.scoring_settings      enable row level security;
alter table public.scoring_changes       enable row level security;
