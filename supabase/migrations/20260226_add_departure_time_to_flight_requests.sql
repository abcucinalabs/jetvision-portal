alter table public.flight_requests
  add column if not exists departure_time text;
