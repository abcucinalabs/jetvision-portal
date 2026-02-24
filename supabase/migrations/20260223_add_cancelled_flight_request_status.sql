alter table public.flight_requests drop constraint if exists flight_requests_status_check;
alter table public.flight_requests
  add constraint flight_requests_status_check
  check (status in ('pending', 'proposal_sent', 'accepted', 'declined', 'cancelled'));
