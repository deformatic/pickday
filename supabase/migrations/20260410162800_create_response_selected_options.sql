create table if not exists public.response_selected_options (
  response_id bigint not null references public.responses(id) on delete cascade,
  option_id bigint not null references public.schedule_options(id) on delete cascade,
  primary key (response_id, option_id)
);

create index if not exists response_selected_options_option_id_idx
  on public.response_selected_options (option_id);
