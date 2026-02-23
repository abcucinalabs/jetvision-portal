alter table public.flight_requests
  add column if not exists avinode_quote_ids text[],
  add column if not exists avinode_quote_count int not null default 0,
  add column if not exists avinode_best_quote_amount numeric,
  add column if not exists avinode_best_quote_currency text,
  add column if not exists avinode_first_quote_at timestamptz,
  add column if not exists avinode_last_sync_at timestamptz,
  add column if not exists avinode_sla_due_at timestamptz,
  add column if not exists avinode_sla_status text;

alter table public.flight_requests drop constraint if exists flight_requests_avinode_sla_status_check;
alter table public.flight_requests
  add constraint flight_requests_avinode_sla_status_check
  check (avinode_sla_status in ('on_track', 'at_risk', 'overdue', 'met'));
