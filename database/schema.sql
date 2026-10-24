-- CallPilot AI - Supabase PostgreSQL schema
-- Run this in the Supabase SQL editor, or with `supabase db push`.

create extension if not exists "pgcrypto";

create type call_status as enum ('in_progress', 'completed');

create type call_stage as enum (
  'opening',
  'purpose',
  'permission',
  'their_business',
  'their_need',
  'objection',
  'next_step',
  'close'
);

create type call_outcome as enum (
  'next_step_agreed',
  'agreed_to_receive_report',
  'interested',
  'follow_up',
  'call_again',
  'not_interested',
  'do_not_call',
  'wrong_person',
  'moved_company',
  'not_logged'
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  prospect_name text check (char_length(prospect_name) <= 120),
  company text check (char_length(company) <= 160),
  prospect_role text check (char_length(prospect_role) <= 120),
  status call_status not null default 'in_progress',
  current_stage call_stage not null default 'opening',
  final_outcome call_outcome,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint completed_calls_have_outcome check (
    (status = 'completed' and final_outcome is not null and completed_at is not null)
    or (status = 'in_progress' and final_outcome is null and completed_at is null)
  )
);

create table if not exists public.call_stage_results (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  stage_id call_stage not null,
  stage_order smallint not null check (stage_order between 1 and 8),
  prospect_statement text check (char_length(prospect_statement) <= 4000),
  what_happened text check (char_length(what_happened) <= 2000),
  stage_outcome text check (char_length(stage_outcome) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_stage_unique unique (call_id, stage_id),
  constraint stage_order_matches_stage check (
    (stage_id = 'opening' and stage_order = 1)
    or (stage_id = 'purpose' and stage_order = 2)
    or (stage_id = 'permission' and stage_order = 3)
    or (stage_id = 'their_business' and stage_order = 4)
    or (stage_id = 'their_need' and stage_order = 5)
    or (stage_id = 'objection' and stage_order = 6)
    or (stage_id = 'next_step' and stage_order = 7)
    or (stage_id = 'close' and stage_order = 8)
  ),
  constraint stage_has_content check (
    nullif(trim(coalesce(prospect_statement, '')), '') is not null
    or nullif(trim(coalesce(what_happened, '')), '') is not null
    or nullif(trim(coalesce(stage_outcome, '')), '') is not null
  )
);

create index if not exists calls_created_at_idx on public.calls (created_at desc);
create index if not exists calls_status_idx on public.calls (status);
create index if not exists calls_final_outcome_idx on public.calls (final_outcome);
create index if not exists calls_prospect_search_idx
  on public.calls using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(prospect_name, '') || ' ' || coalesce(company, '')));
create index if not exists stage_results_call_idx on public.call_stage_results (call_id, stage_order);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calls_touch_updated_at on public.calls;
create trigger calls_touch_updated_at
before update on public.calls
for each row execute function public.touch_updated_at();

drop trigger if exists stages_touch_updated_at on public.call_stage_results;
create trigger stages_touch_updated_at
before update on public.call_stage_results
for each row execute function public.touch_updated_at();

-- Access model:
-- The browser never talks to Supabase directly. The Express backend holds the
-- service-role key and is the only writer. RLS is enabled with no permissive
-- policy for anon/authenticated so that a leaked anon key cannot read calls.
alter table public.calls enable row level security;
alter table public.call_stage_results enable row level security;
