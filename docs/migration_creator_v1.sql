-- Creator Platform v1 — 핀플루언서 신청·승인·콘텐츠 기반
-- 실행 위치: Supabase SQL Editor
-- Phase 0~3 전체 스키마를 한 번에 정의.

-- 1. 크리에이터 신청 ─────────────────────────────────
create table if not exists creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  display_name text not null,
  slug text,                                    -- 희망 URL slug
  bio text not null,                            -- 자기소개
  channel_url text,                             -- 유튜브/블로그 메인 URL
  follower_count integer,                       -- 본인 채널 구독자 수
  topics text[] default '{}',                   -- 다루는 주제
  sample_content text,                          -- 콘텐츠 샘플 (글 본문 또는 URL)
  motivation text,                              -- 왜 우리 플랫폼?
  status text not null default 'pending'        -- pending / approved / rejected
    check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  applied_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users
);

create index if not exists idx_creator_applications_user on creator_applications(user_id);
create index if not exists idx_creator_applications_status on creator_applications(status);

-- 2. 승인된 크리에이터 ───────────────────────────────
create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade unique not null,
  slug text unique not null,                    -- URL: /creator/<slug>
  display_name text not null,
  bio text,
  avatar_url text,
  cover_url text,
  channel_url text,
  topics text[] default '{}',
  -- 멤버십 (Phase 2)
  membership_enabled boolean default false,
  membership_price_won integer,                 -- 월 구독료 (원)
  membership_tier_name text default '멤버',
  membership_perks text,                        -- 멤버십 혜택 설명
  -- 통계 (트리거로 자동 갱신)
  follower_count integer default 0,
  member_count integer default 0,
  post_count integer default 0,
  -- 정산 (Phase 2)
  payout_bank text,
  payout_account text,                          -- 암호화 권장
  payout_holder text,
  total_revenue_won bigint default 0,
  -- 메타
  is_published boolean default true,            -- 공개/비공개
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_creators_slug on creators(slug);
create index if not exists idx_creators_user on creators(user_id);

-- 3. 크리에이터 콘텐츠 (Phase 1) ─────────────────────
create table if not exists creator_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators on delete cascade not null,
  title text not null,
  slug text not null,
  body text,                                    -- Markdown 본문
  cover_url text,
  preview text,                                 -- 무료 미리보기 (paywall 위)
  is_member_only boolean default false,         -- 유료 콘텐츠
  is_published boolean default true,
  -- 영상 (Phase 3)
  video_url text,
  video_provider text                           -- mux / vimeo / youtube
    check (video_provider in ('mux', 'vimeo', 'youtube')),
  -- 통계
  view_count integer default 0,
  like_count integer default 0,
  comment_count integer default 0,
  -- 메타
  published_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (creator_id, slug)
);

create index if not exists idx_creator_posts_creator on creator_posts(creator_id, published_at desc);
create index if not exists idx_creator_posts_published on creator_posts(is_published, published_at desc);

-- 4. 멤버십 구독 (Phase 2) ───────────────────────────
create table if not exists creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  status text not null default 'active'
    check (status in ('active', 'cancelled', 'expired', 'past_due')),
  started_at timestamptz default now(),
  next_billing_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,
  -- 결제 (Toss / KakaoPay)
  payment_method text                           -- 'toss' | 'kakaopay'
    check (payment_method in ('toss', 'kakaopay')),
  payment_billing_key text,                     -- 정기결제 빌링키
  -- 메타
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (creator_id, user_id)
);

create index if not exists idx_creator_subs_user on creator_subscriptions(user_id, status);
create index if not exists idx_creator_subs_creator on creator_subscriptions(creator_id, status);

-- 5. 결제 이력 (Phase 2) ────────────────────────────
create table if not exists creator_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references creator_subscriptions on delete cascade,
  creator_id uuid references creators on delete set null,
  user_id uuid references auth.users on delete set null,
  amount_won integer not null,
  platform_fee_won integer not null,            -- 우리 몫 (기본 15%)
  creator_share_won integer not null,
  status text not null default 'paid'
    check (status in ('paid', 'failed', 'refunded')),
  payment_method text,
  payment_id text,                              -- 외부 거래 ID
  paid_at timestamptz default now(),
  refunded_at timestamptz,
  meta jsonb default '{}'
);

create index if not exists idx_creator_payments_creator on creator_payments(creator_id, paid_at desc);
create index if not exists idx_creator_payments_user on creator_payments(user_id, paid_at desc);

-- 6. 팔로우 (무료 구독) ──────────────────────────────
create table if not exists creator_follows (
  user_id uuid references auth.users on delete cascade,
  creator_id uuid references creators on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, creator_id)
);

-- 7. 좋아요 (포스트) ─────────────────────────────────
create table if not exists creator_post_likes (
  user_id uuid references auth.users on delete cascade,
  post_id uuid references creator_posts on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ── RLS ──────────────────────────────────────────
alter table creator_applications enable row level security;
alter table creators enable row level security;
alter table creator_posts enable row level security;
alter table creator_subscriptions enable row level security;
alter table creator_payments enable row level security;
alter table creator_follows enable row level security;
alter table creator_post_likes enable row level security;

-- creator_applications: 본인 또는 admin 만 조회·작성
do $$ begin
  create policy "creator_apps_self_read" on creator_applications
    for select using (user_id = auth.uid() or exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    ));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "creator_apps_self_insert" on creator_applications
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "creator_apps_admin_update" on creator_applications
    for update using (exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    ));
exception when duplicate_object then null;
end $$;

-- creators: 공개 (is_published=true) 는 누구나 조회, 본인·admin 만 수정
do $$ begin
  create policy "creators_public_read" on creators
    for select using (is_published = true or user_id = auth.uid() or exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    ));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "creators_self_update" on creators
    for update using (user_id = auth.uid() or exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    ));
exception when duplicate_object then null;
end $$;

-- creator_posts: 공개는 누구나, 본인 글은 본인이 CRUD, admin 도 가능
do $$ begin
  create policy "creator_posts_read" on creator_posts
    for select using (is_published = true or exists (
      select 1 from creators c where c.id = creator_id
        and (c.user_id = auth.uid() or exists (
          select 1 from public.users where id = auth.uid() and role = 'admin'
        ))
    ));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "creator_posts_self_write" on creator_posts
    for all using (exists (
      select 1 from creators c where c.id = creator_id and c.user_id = auth.uid()
    ));
exception when duplicate_object then null;
end $$;

-- creator_subscriptions: 본인 것만 조회/조작, creator 본인은 자기 구독자 조회 가능
do $$ begin
  create policy "creator_subs_self_read" on creator_subscriptions
    for select using (
      user_id = auth.uid()
      or exists (select 1 from creators c where c.id = creator_id and c.user_id = auth.uid())
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "creator_subs_self_write" on creator_subscriptions
    for all using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- creator_follows: 본인 follow CRUD, creator 는 자기 follow 목록 조회
do $$ begin
  create policy "creator_follows_self" on creator_follows
    for all using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "creator_follows_creator_read" on creator_follows
    for select using (exists (
      select 1 from creators c where c.id = creator_id and c.user_id = auth.uid()
    ));
exception when duplicate_object then null;
end $$;

-- creator_post_likes: 본인 like CRUD
do $$ begin
  create policy "creator_post_likes_self" on creator_post_likes
    for all using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "creator_post_likes_public_read" on creator_post_likes
    for select using (true);
exception when duplicate_object then null;
end $$;

-- creator_payments: 본인 결제 이력 조회, creator 자기 매출 조회, admin 전체
do $$ begin
  create policy "creator_payments_read" on creator_payments
    for select using (
      user_id = auth.uid()
      or exists (select 1 from creators c where c.id = creator_id and c.user_id = auth.uid())
      or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
    );
exception when duplicate_object then null;
end $$;

-- ── 트리거: 포스트 카운트 자동 갱신 ──────────────
create or replace function bump_creator_post_count() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' and new.is_published) then
    update creators set post_count = post_count + 1, updated_at = now() where id = new.creator_id;
  elsif (tg_op = 'DELETE' and old.is_published) then
    update creators set post_count = greatest(0, post_count - 1), updated_at = now() where id = old.creator_id;
  elsif (tg_op = 'UPDATE') then
    if (old.is_published is distinct from new.is_published) then
      update creators set post_count = case when new.is_published then post_count + 1 else greatest(0, post_count - 1) end where id = new.creator_id;
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_creator_post_count on creator_posts;
create trigger trg_creator_post_count
  after insert or update or delete on creator_posts
  for each row execute function bump_creator_post_count();

-- 트리거: 팔로워 카운트
create or replace function bump_creator_follower_count() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update creators set follower_count = follower_count + 1 where id = new.creator_id;
  elsif (tg_op = 'DELETE') then
    update creators set follower_count = greatest(0, follower_count - 1) where id = old.creator_id;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_creator_follower_count on creator_follows;
create trigger trg_creator_follower_count
  after insert or delete on creator_follows
  for each row execute function bump_creator_follower_count();

-- 트리거: 멤버 카운트 (active subscription)
create or replace function bump_creator_member_count() returns trigger language plpgsql as $$
declare
  delta integer := 0;
begin
  if (tg_op = 'INSERT' and new.status = 'active') then delta := 1;
  elsif (tg_op = 'DELETE' and old.status = 'active') then delta := -1;
  elsif (tg_op = 'UPDATE') then
    if (old.status <> 'active' and new.status = 'active') then delta := 1;
    elsif (old.status = 'active' and new.status <> 'active') then delta := -1;
    end if;
  end if;
  if (delta <> 0) then
    update creators set member_count = greatest(0, member_count + delta) where id = coalesce(new.creator_id, old.creator_id);
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_creator_member_count on creator_subscriptions;
create trigger trg_creator_member_count
  after insert or update or delete on creator_subscriptions
  for each row execute function bump_creator_member_count();

-- 끝 ─────────────────────────────────────────────
