alter table public.ai_model_health_checks
  add column if not exists latency_ms integer,
  add column if not exists http_status integer,
  add column if not exists normalized_error text,
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists fallback_active boolean not null default false;

create index if not exists ai_model_health_checks_recent_idx
  on public.ai_model_health_checks(synth_model_id, created_at desc);

notify pgrst, 'reload schema';
