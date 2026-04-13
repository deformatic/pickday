alter table public.rate_limit_log
  add column if not exists subject_type text not null default 'ip',
  add column if not exists subject_key text not null default '',
  add column if not exists status text not null default 'success';

update public.rate_limit_log
set subject_key = ip
where subject_key = '';

create index if not exists rate_limit_log_subject_window_idx
  on public.rate_limit_log (subject_type, subject_key, status, created_at desc);

create or replace function public.cleanup_rate_limit_log()
returns void
language sql
as $$
  with ranked as (
    select
      id,
      created_at,
      row_number() over (
        partition by subject_type, subject_key
        order by created_at desc
      ) as row_num
    from public.rate_limit_log
  )
  delete from public.rate_limit_log r
  using ranked
  where r.id = ranked.id
    and (
      ranked.created_at < now() - interval '1 hour'
      or ranked.row_num > 500
    );
$$;
