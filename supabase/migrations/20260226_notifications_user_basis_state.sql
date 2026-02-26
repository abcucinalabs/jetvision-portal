-- Migration: notification read/delete state tracked per user

alter table if exists public.notifications
  add column if not exists read_by_user_ids text[] not null default '{}',
  add column if not exists deleted_by_user_ids text[] not null default '{}';

create index if not exists idx_notifications_read_by_user_ids on public.notifications using gin(read_by_user_ids);
create index if not exists idx_notifications_deleted_by_user_ids on public.notifications using gin(deleted_by_user_ids);
