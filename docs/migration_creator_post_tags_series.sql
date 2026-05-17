-- 재프콘 포스트 — 태그, 시리즈, 예약발행 컬럼 추가
-- Phase 2 (태그) + Phase 3 (시리즈, 예약발행) 합쳐서 한 번에 마이그레이션.
-- 실행: Supabase SQL Editor 에 붙여넣고 Run.

-- 1) 태그 (text 배열, 최대 15개 — 앱 레벨 검증)
alter table creator_posts
  add column if not exists tags text[] default '{}'::text[] not null;

create index if not exists idx_creator_posts_tags
  on creator_posts using gin (tags);

-- 2) 시리즈 (creator_series 테이블 + creator_posts.series_id FK)
create table if not exists creator_series (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  cover_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, slug)
);

create index if not exists idx_creator_series_creator
  on creator_series (creator_id, created_at desc);

alter table creator_posts
  add column if not exists series_id uuid references creator_series(id) on delete set null,
  add column if not exists series_order int;

create index if not exists idx_creator_posts_series
  on creator_posts (series_id, series_order);

-- 3) 예약발행 (publish_at = 예약 시각, null 이면 즉시)
alter table creator_posts
  add column if not exists publish_at timestamptz;

-- 예약 발행이 도래한 글만 보이게 — 기존 is_published 와 함께 체크
create index if not exists idx_creator_posts_publish_at
  on creator_posts (publish_at)
  where publish_at is not null;

-- 기존 read RLS 가 published 만 보여주듯, publish_at 도 함께 체크하도록 정책 보완 필요.
-- (앱 레이어 fetch 에서 `or(publish_at.is.null,publish_at.lte.now())` 로 처리 권장)

-- 4) creator_series RLS (모두 읽기, 본인만 쓰기)
alter table creator_series enable row level security;

drop policy if exists "creator_series read" on creator_series;
create policy "creator_series read"
  on creator_series for select
  using (
    is_published = true
    or exists (
      select 1 from creators c
      where c.id = creator_series.creator_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "creator_series write owner" on creator_series;
create policy "creator_series write owner"
  on creator_series for all
  using (
    exists (
      select 1 from creators c
      where c.id = creator_series.creator_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from creators c
      where c.id = creator_series.creator_id and c.user_id = auth.uid()
    )
  );
