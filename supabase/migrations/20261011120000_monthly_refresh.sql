-- Monthly refresh job (backend/scripts/monthly_refresh.py): labels per customer comment and one report per run.
-- feedback_labels holds labels only, never the comment text: comment_id is BMW's record id.
create table public.refresh_runs (
  id          uuid primary key default gen_random_uuid(),
  month       text not null,                     -- 'YYYY-MM' the data covers
  labeler     text not null,                     -- 'taxonomy' (rules) · 'decisions:<model>'
  source      text not null,                     -- where the comments came from (file name / export id)
  report      jsonb not null,                    -- counts, changes vs last run, review queue, run ids
  created_at  timestamptz not null default now()
);
create index refresh_runs_month_idx on public.refresh_runs (month desc, created_at desc);

create table public.feedback_labels (
  refresh_id      uuid not null references public.refresh_runs (id) on delete cascade,
  comment_id      text not null,
  series          text not null,
  market          text not null,
  request_id      text,                          -- null = no existing request fits ("other / new")
  request_conf    real,
  category        text,
  category_conf   real,
  feedback_type   text,                          -- want · difficult · defect · praise
  type_conf       real,
  severity        real,                          -- 0 cosmetic … 4 safety (probability-weighted)
  severity_label  text,
  needs_review    boolean not null default false,
  primary key (refresh_id, comment_id)
);
create index feedback_labels_request_idx on public.feedback_labels (series, request_id);

alter table public.refresh_runs    enable row level security;
alter table public.feedback_labels enable row level security;
