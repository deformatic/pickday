create table if not exists public.instructor_identities (
  id bigint generated always as identity primary key,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists instructor_identities_name_idx
  on public.instructor_identities (lower(name));
