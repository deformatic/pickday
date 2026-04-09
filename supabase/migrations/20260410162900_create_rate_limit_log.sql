create table if not exists public.rate_limit_log (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_log_ip_created_at_idx
  on public.rate_limit_log (ip, created_at desc);

create or replace function public.cleanup_rate_limit_log()
returns void
language sql
as $$
  delete from public.rate_limit_log
  where created_at < now() - interval '1 hour';
$$;
