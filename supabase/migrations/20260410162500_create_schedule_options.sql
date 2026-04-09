create table if not exists public.schedule_options (
  id bigint generated always as identity primary key,
  schedule_id bigint not null references public.schedules(id) on delete cascade,
  datetime timestamptz not null,
  label text not null
);

create index if not exists schedule_options_schedule_id_idx
  on public.schedule_options (schedule_id);
