alter table public.customers
  add column if not exists visible_to_iso_ids text[] not null default '{}';
