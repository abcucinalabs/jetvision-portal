alter table public.customers
  add column if not exists created_by_user_id text;
