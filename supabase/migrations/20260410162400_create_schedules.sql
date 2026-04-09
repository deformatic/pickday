create table if not exists public.schedules (
  id bigint generated always as identity primary key,
  token text not null unique,
  admin_token text not null unique,
  title text not null,
  location text not null,
  time_info text not null,
  is_protected boolean not null default false,
  access_password_hash text,
  admin_password_hash text not null,
  require_email boolean not null default false,
  require_phone boolean not null default false,
  created_at timestamptz not null default now(),
  constraint schedules_access_password_consistency_check check (
    (is_protected and access_password_hash is not null)
    or
    (not is_protected and access_password_hash is null)
  )
);
