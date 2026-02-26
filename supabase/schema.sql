create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  created_by_user_id text,
  visible_to_iso_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.flight_requests (
  id uuid primary key default gen_random_uuid(),
  iso_id text not null,
  iso_name text not null,
  client_name text not null,
  client_email text not null,
  client_phone text not null default '',
  departure text not null,
  arrival text not null,
  departure_date date not null,
  departure_time text,
  return_date date,
  return_time text,
  passengers int not null check (passengers > 0),
  special_requests text,
  status text not null default 'pending' check (status in ('pending', 'under_review', 'rfq_submitted', 'quote_received', 'proposal_ready', 'proposal_sent', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  avinode_trip_id text,
  avinode_trip_href text,
  avinode_search_link text,
  avinode_view_link text,
  avinode_rfq_ids text[],
  avinode_quote_ids text[],
  avinode_quote_count int not null default 0,
  avinode_best_quote_amount numeric,
  avinode_best_quote_currency text,
  avinode_first_quote_at timestamptz,
  avinode_last_sync_at timestamptz,
  avinode_sla_due_at timestamptz,
  avinode_sla_status text check (avinode_sla_status in ('on_track', 'at_risk', 'overdue', 'met')),
  avinode_status text check (avinode_status in ('not_sent', 'sent_to_avinode', 'rfq_sent', 'quotes_received', 'booked', 'cancelled')),
  iso_commission numeric,
  jetvision_cost numeric,
  proposal_notes text,
  selected_quote_id text,
  selected_quote_amount numeric,
  total_price numeric,
  proposal_sent_at timestamptz,
  client_decision_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  from_user_id text not null,
  from_user_name text not null,
  to_role text not null check (to_role in ('iso', 'manager', 'all')),
  to_user_id text,
  read boolean not null default false,
  read_at timestamptz,
  deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by_user_id text,
  read_by_user_ids text[] not null default '{}',
  deleted_by_user_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_created_at on public.customers(created_at desc);
create index if not exists idx_flight_requests_created_at on public.flight_requests(created_at desc);
create index if not exists idx_flight_requests_iso_id on public.flight_requests(iso_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_deleted on public.notifications(deleted);
create index if not exists idx_notifications_to_role on public.notifications(to_role);
create index if not exists idx_notifications_to_user_id on public.notifications(to_user_id);
create index if not exists idx_notifications_read_by_user_ids on public.notifications using gin(read_by_user_ids);
create index if not exists idx_notifications_deleted_by_user_ids on public.notifications using gin(deleted_by_user_ids);
