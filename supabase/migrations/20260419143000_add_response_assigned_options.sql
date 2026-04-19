create table if not exists public.response_assigned_options (
  response_id bigint not null references public.responses(id) on delete cascade,
  option_id bigint not null references public.schedule_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (response_id, option_id)
);

create index if not exists response_assigned_options_option_id_idx
  on public.response_assigned_options (option_id);

insert into public.response_assigned_options (response_id, option_id)
select id, assigned_option_id
from public.responses
where assigned_option_id is not null
on conflict (response_id, option_id) do nothing;
