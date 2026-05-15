-- 노출/클릭 트래킹 (analytics_events)
-- 페이지뷰·배너 클릭·검색·답변 클릭 등 사용자 행동 기록
-- Admin 대시보드 /admin/analytics 에서 집계 표시

create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,                -- 'page_view', 'click', 'impression', 'search'
  path        text,                         -- 페이지 경로 (page_view·click 공통)
  target      text,                         -- 클릭 대상 식별자 (예: 'banner', 'etf:360750', 'question:xyz')
  meta        jsonb,                        -- 부가 데이터 (검색어, referrer 등)
  user_id     uuid references auth.users(id) on delete set null,
  session_id  text,                         -- 비로그인 세션 식별 (브라우저 UUID)
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_kind_idx on public.analytics_events(kind, created_at desc);
create index if not exists analytics_events_path_idx on public.analytics_events(path, created_at desc) where path is not null;
create index if not exists analytics_events_target_idx on public.analytics_events(target, created_at desc) where target is not null;
create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);

alter table public.analytics_events enable row level security;

-- 누구나 insert (트래킹은 비로그인도 가능)
drop policy if exists analytics_insert_all on public.analytics_events;
create policy analytics_insert_all on public.analytics_events
  for insert with check (true);

-- admin만 select (집계 데이터는 민감)
drop policy if exists analytics_admin_select on public.analytics_events;
create policy analytics_admin_select on public.analytics_events
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
