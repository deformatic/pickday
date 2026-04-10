alter table public.schedule_options
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists note text;

update public.schedule_options
set
  start_at = coalesce(start_at, datetime),
  end_at = coalesce(end_at, datetime + interval '1 hour'),
  note = coalesce(note, label)
where start_at is null or end_at is null or note is null;

update public.schedule_options
set end_at = start_at + interval '1 hour'
where end_at <= start_at;

alter table public.schedule_options
  alter column start_at set not null,
  alter column end_at set not null,
  alter column note set default '';

alter table public.schedule_options
  add constraint schedule_options_time_window_check
  check (end_at > start_at);
