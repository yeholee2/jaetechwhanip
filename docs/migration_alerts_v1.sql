-- 사용자 알림 시스템 v1 (in-app only — 메일 X)
--
-- 흐름:
-- 1. 사용자가 ETF 상세에서 '가격 알림' 추가 → etf_alerts 행 생성
-- 2. /api/alerts/check (Vercel Cron, 10분 주기)
--    · 활성 alert 전부 순회
--    · 현재가가 조건을 만족하면 user_notifications 생성 + alert.last_triggered_at 갱신
-- 3. 사용자 페이지에서 bell icon → user_notifications 조회 + 읽음 처리

create table if not exists public.etf_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  etf_code text not null check (etf_code ~ '^[0-9A-Z]{1,10}$'),
  etf_name text not null,
  -- 조건 종류: 가격이 임계점 위/아래, 등락률 위/아래
  condition text not null check (condition in ('price_above', 'price_below', 'change_above_pct', 'change_below_pct')),
  threshold numeric(18, 4) not null,
  active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists etf_alerts_user_idx on public.etf_alerts(user_id, active);
create index if not exists etf_alerts_code_idx on public.etf_alerts(etf_code) where active;

alter table public.etf_alerts enable row level security;

-- 본인만 조회·수정
drop policy if exists etf_alerts_own on public.etf_alerts;
create policy etf_alerts_own on public.etf_alerts
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 트리거: updated_at 자동
create or replace function public.touch_etf_alerts_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists etf_alerts_updated_at_touch on public.etf_alerts;
create trigger etf_alerts_updated_at_touch
  before update on public.etf_alerts
  for each row execute function public.touch_etf_alerts_updated_at();

-- 사용자 알림함
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 종류: alert (가격 알림), system (공지)
  kind text not null default 'alert' check (kind in ('alert', 'system')),
  title text not null,
  body text,
  link text,                          -- /etf/[slug] 등
  etf_code text,                      -- alert 발화 시 어떤 ETF
  alert_id uuid references public.etf_alerts(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notif_user_idx on public.user_notifications(user_id, created_at desc);
create index if not exists user_notif_unread_idx on public.user_notifications(user_id, created_at desc) where read_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists user_notif_own on public.user_notifications;
create policy user_notif_own on public.user_notifications
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
