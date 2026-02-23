create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
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
  return_date date,
  passengers int not null check (passengers > 0),
  special_requests text,
  status text not null default 'pending' check (status in ('pending', 'proposal_sent', 'accepted', 'declined')),
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
  avinode_status text check (avinode_status in ('not_sent', 'sent_to_avinode', 'rfq_sent', 'quotes_received', 'booked', 'cancelled'))
);

create index if not exists idx_customers_created_at on public.customers(created_at desc);
create index if not exists idx_flight_requests_created_at on public.flight_requests(created_at desc);
create index if not exists idx_flight_requests_iso_id on public.flight_requests(iso_id);
