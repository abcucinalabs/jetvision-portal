-- Migration: add persistent notifications table with read/delete tracking

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

create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_deleted on public.notifications(deleted);
create index if not exists idx_notifications_to_role on public.notifications(to_role);
create index if not exists idx_notifications_to_user_id on public.notifications(to_user_id);
create index if not exists idx_notifications_read_by_user_ids on public.notifications using gin(read_by_user_ids);
create index if not exists idx_notifications_deleted_by_user_ids on public.notifications using gin(deleted_by_user_ids);
