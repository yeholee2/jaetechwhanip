-- 리포트 시스템 v1 (Phase 6)
-- 증권사·운용사 리포트를 큐레이션해서 /feed 리포트 탭에 노출.
-- 외부 URL 클릭 추적 + ETF 코드 태깅으로 분절 해소 메커니즘과 연결.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  source text not null,                     -- '미래에셋', '한국투자증권', '삼성증권' 등
  title text not null,
  summary text,
  url text not null unique,                 -- 원본 리포트 URL (PDF 또는 페이지)
  thumbnail_url text,
  category text not null check (category in (
    '재테크입문',
    '국내주식·ETF',
    '해외주식·ETF',
    '절세',
    '보험',
    '대출·부채'
  )),
  related_etf_codes text[] not null default '{}'::text[],  -- 분절 해소: 관련 ETF 6자리 코드 배열
  published_at timestamptz not null,
  click_count int not null default 0,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists reports_published_at_idx on public.reports(published_at desc) where deleted_at is null;
create index if not exists reports_category_idx on public.reports(category) where deleted_at is null;
create index if not exists reports_etf_codes_idx on public.reports using gin(related_etf_codes);

-- RLS: 누구나 읽기, 쓰기는 관리자만 (auth.role() = 'service_role'은 cron/admin에서)
alter table public.reports enable row level security;

drop policy if exists reports_read_all on public.reports;
create policy reports_read_all on public.reports
  for select using (deleted_at is null);

drop policy if exists reports_admin_write on public.reports;
create policy reports_admin_write on public.reports
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- 외부 링크 클릭 추적 RPC (옵션): 향후 click_count 증가용
create or replace function public.bump_report_click(report_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reports set click_count = click_count + 1 where id = report_id;
$$;
