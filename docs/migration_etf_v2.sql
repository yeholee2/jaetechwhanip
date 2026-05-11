-- ETF v2 — 도미노 패턴 도입 (포트폴리오·알림·캘린더·AI)
-- 실행 위치: Supabase SQL Editor
-- 주의: 운영 DB 적용은 예호님이 직접 실행합니다.

create extension if not exists pgcrypto;

-- ============================================================
-- 1. etf_holdings — 사용자 수동 입력 보유 ETF
-- ============================================================
create table if not exists public.etf_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  etf_code text not null,
  etf_name text not null,
  quantity numeric not null check (quantity > 0),
  avg_price numeric not null check (avg_price > 0),
  account_label text default '일반',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, etf_code, account_label)
);

create index if not exists etf_holdings_user_idx
  on public.etf_holdings (user_id)
  where deleted_at is null;

-- ============================================================
-- 2. etf_price_alerts — 가격/변동 알림
-- ============================================================
create table if not exists public.etf_price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  etf_code text not null,
  etf_name text not null,
  alert_type text not null check (alert_type in ('target_price', 'change_pct')),
  threshold numeric not null check (threshold > 0),
  direction text check (direction in ('above', 'below')),
  is_active bool not null default true,
  triggered_at timestamptz,
  triggered_price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists etf_price_alerts_user_idx
  on public.etf_price_alerts (user_id, is_active)
  where deleted_at is null;

create index if not exists etf_price_alerts_active_idx
  on public.etf_price_alerts (etf_code, is_active)
  where deleted_at is null and is_active = true;

-- ============================================================
-- 3. market_events — 증시 캘린더
-- ============================================================
create table if not exists public.market_events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  event_type text not null check (event_type in ('fomc', 'cpi', 'gdp', 'pmi', 'rate_decision', 'dividend_ex', 'earnings', 'etc')),
  title text not null,
  description text,
  related_etf_code text,
  region text not null default 'kr' check (region in ('kr', 'us', 'global')),
  importance text not null default 'medium' check (importance in ('low', 'medium', 'high')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists market_events_date_idx
  on public.market_events (date)
  where deleted_at is null;

create index if not exists market_events_etf_idx
  on public.market_events (related_etf_code)
  where deleted_at is null and related_etf_code is not null;

-- ============================================================
-- 4. ai_etf_summaries — AI 요약 캐시
-- ============================================================
create table if not exists public.ai_etf_summaries (
  id uuid primary key default gen_random_uuid(),
  etf_code text not null,
  summary_type text not null check (summary_type in ('overview', 'risk', 'outlook', 'market_brief')),
  content text not null,
  source_data jsonb,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_by_model text not null default 'gpt-4o-mini',
  unique (etf_code, summary_type)
);

create index if not exists ai_etf_summaries_lookup_idx
  on public.ai_etf_summaries (etf_code, summary_type, expires_at desc);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
alter table public.etf_holdings enable row level security;
alter table public.etf_price_alerts enable row level security;
alter table public.market_events enable row level security;
alter table public.ai_etf_summaries enable row level security;

-- holdings: 본인만 모든 작업
drop policy if exists "etf_holdings_owner" on public.etf_holdings;
create policy "etf_holdings_owner" on public.etf_holdings
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- alerts: 본인만 모든 작업
drop policy if exists "etf_alerts_owner" on public.etf_price_alerts;
create policy "etf_alerts_owner" on public.etf_price_alerts
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- market_events: 누구나 read, admin만 write
drop policy if exists "market_events_public_read" on public.market_events;
drop policy if exists "market_events_admin_write" on public.market_events;

create policy "market_events_public_read" on public.market_events
  for select using (deleted_at is null);

create policy "market_events_admin_write" on public.market_events
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  ) with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ai_etf_summaries: 누구나 read, service role만 write (RLS bypass)
drop policy if exists "ai_summaries_public_read" on public.ai_etf_summaries;
create policy "ai_summaries_public_read" on public.ai_etf_summaries
  for select using (true);
-- write는 RLS bypass (service role key 사용)

-- ============================================================
-- 트리거: updated_at 자동 갱신
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists etf_holdings_updated_at on public.etf_holdings;
create trigger etf_holdings_updated_at
  before update on public.etf_holdings
  for each row execute function public.set_updated_at();

drop trigger if exists etf_alerts_updated_at on public.etf_price_alerts;
create trigger etf_alerts_updated_at
  before update on public.etf_price_alerts
  for each row execute function public.set_updated_at();

drop trigger if exists market_events_updated_at on public.market_events;
create trigger market_events_updated_at
  before update on public.market_events
  for each row execute function public.set_updated_at();

-- ============================================================
-- 시드 데이터: 2026년 주요 증시 이벤트 (예시)
-- ============================================================
insert into public.market_events (date, event_type, title, description, region, importance)
values
  ('2026-05-15', 'fomc', 'FOMC 금리 결정', 'FOMC 5월 정례회의 금리 결정 발표', 'us', 'high'),
  ('2026-05-20', 'cpi', '미국 CPI 발표', '4월 소비자물가지수', 'us', 'high'),
  ('2026-06-12', 'fomc', 'FOMC 금리 결정', 'FOMC 6월 정례회의', 'us', 'high'),
  ('2026-05-25', 'rate_decision', '한국은행 금융통화위원회', '기준금리 결정', 'kr', 'high'),
  ('2026-06-30', 'gdp', '한국 GDP 발표', '1분기 잠정치', 'kr', 'medium')
on conflict do nothing;
