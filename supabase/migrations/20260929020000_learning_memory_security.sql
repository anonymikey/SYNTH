create table if not exists public.learning_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('conversation', 'workspace', 'project', 'long-term')),
  project_id uuid,
  conversation_id uuid,
  content text not null check (char_length(content) between 1 and 20000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learning_memory_user_scope_idx on public.learning_memory(user_id, scope, created_at desc);
create index if not exists learning_memory_project_idx on public.learning_memory(user_id, project_id, created_at desc);

alter table public.learning_memory enable row level security;

drop policy if exists learning_memory_select_own on public.learning_memory;
create policy learning_memory_select_own on public.learning_memory for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists learning_memory_insert_own on public.learning_memory;
create policy learning_memory_insert_own on public.learning_memory for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists learning_memory_update_own on public.learning_memory;
create policy learning_memory_update_own on public.learning_memory for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists learning_memory_delete_own on public.learning_memory;
create policy learning_memory_delete_own on public.learning_memory for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.ai_model_health_checks (
  id uuid primary key default gen_random_uuid(),
  synth_model_id text not null,
  provider text not null,
  internal_model_id text not null,
  result text not null check (result in ('SUCCESS', 'UNAVAILABLE', 'RATE LIMITED', 'INVALID MODEL', 'AUTH ERROR', 'ERROR')),
  administrator uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_model_health_checks_model_idx on public.ai_model_health_checks(synth_model_id, created_at desc);
alter table public.ai_model_health_checks enable row level security;
drop policy if exists ai_model_health_checks_admin_select on public.ai_model_health_checks;
create policy ai_model_health_checks_admin_select on public.ai_model_health_checks for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or (select auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true');

revoke all on public.learning_memory from anon;
revoke all on public.ai_model_health_checks from anon;
revoke all on public.ai_model_health_checks from authenticated;
grant select on public.ai_model_health_checks to authenticated;

comment on table public.learning_memory is 'Private, user-scoped learning memory. Never expose across users or projects.';
comment on table public.ai_model_health_checks is 'Operational model test history; readable only by app administrators.';

alter table if exists public.ai_model_routes enable row level security;
alter table if exists public.ai_model_route_audit enable row level security;
revoke all on table public.ai_model_route_audit from anon;
revoke all on table public.ai_model_route_audit from authenticated;
revoke all on table public.ai_model_routes from anon;
revoke all on table public.ai_model_routes from authenticated;
grant select, insert, update on public.ai_model_routes to authenticated;
grant insert on public.ai_model_route_audit to authenticated;

create or replace view public.admin_model_health_summary with (security_invoker = true) as
select synth_model_id, result, created_at
from public.ai_model_health_checks;

revoke all on public.admin_model_health_summary from anon;
grant select on public.admin_model_health_summary to authenticated;

select pg_notify('pgrst', 'reload schema');

revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

notify pgrst, 'reload schema';
