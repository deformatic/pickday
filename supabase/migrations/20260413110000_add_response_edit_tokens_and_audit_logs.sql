alter table public.responses
  add column if not exists edit_token_hash text,
  add column if not exists edit_token_expires_at timestamptz,
  add column if not exists edit_token_rotated_at timestamptz;

create index if not exists responses_edit_token_expires_at_idx
  on public.responses (edit_token_expires_at);

create table if not exists public.response_audit_logs (
  id bigint generated always as identity primary key,
  response_id bigint not null,
  action text not null,
  actor_type text not null,
  actor_identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists response_audit_logs_response_id_idx
  on public.response_audit_logs (response_id);

create index if not exists response_audit_logs_created_at_idx
  on public.response_audit_logs (created_at desc);
