create table if not exists public.responses (
  id bigint generated always as identity primary key,
  schedule_id bigint not null references public.schedules(id) on delete cascade,
  instructor_identity_id bigint references public.instructor_identities(id) on delete set null,
  name text not null,
  email text,
  phone text,
  comment text,
  assigned_option_id bigint references public.schedule_options(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists responses_schedule_id_idx
  on public.responses (schedule_id);

create index if not exists responses_instructor_identity_id_idx
  on public.responses (instructor_identity_id);

create unique index if not exists responses_schedule_identity_unique_idx
  on public.responses (schedule_id, name, coalesce(email, ''), coalesce(phone, ''))
  where email is not null or phone is not null;
