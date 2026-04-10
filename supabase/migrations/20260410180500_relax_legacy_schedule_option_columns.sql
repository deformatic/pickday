alter table public.schedule_options
  alter column datetime drop not null,
  alter column label drop not null;
