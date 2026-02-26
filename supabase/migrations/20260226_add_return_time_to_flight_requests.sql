alter table public.flight_requests
  add column if not exists return_time text;
