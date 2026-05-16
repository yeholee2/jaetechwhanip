-- AI 응답 캐시 — 같은 입력은 한 번만 LLM 호출
-- key = sha256(model + system + user_prompt) → 영구 캐시
-- 만료는 호출 시 expires_at 비교로 처리 (cron 불필요)

create table if not exists ai_cache (
  cache_key text primary key,
  scope text not null,                          -- 'etf_signal', 'calendar_weekly', 'portfolio', ...
  model text not null,
  prompt_hash text not null,
  response text not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  cost_usd numeric(10, 6) default 0,
  created_at timestamptz default now(),
  expires_at timestamptz                        -- null = 영구
);

create index if not exists idx_ai_cache_scope on ai_cache(scope, created_at desc);

alter table ai_cache enable row level security;

-- 읽기는 모두 (캐시 검증용), 쓰기는 service role 만
do $$ begin
  create policy "ai_cache_read" on ai_cache for select using (true);
exception when duplicate_object then null; end $$;

-- 일별 비용 추적
create table if not exists ai_usage_daily (
  date date primary key,
  total_input_tokens bigint default 0,
  total_output_tokens bigint default 0,
  total_cost_usd numeric(10, 4) default 0,
  call_count integer default 0
);

alter table ai_usage_daily enable row level security;

do $$ begin
  create policy "ai_usage_read" on ai_usage_daily for select using (true);
exception when duplicate_object then null; end $$;
