-- Sparring 댓글·투표 시스템 v1
-- 실행 위치: Supabase SQL Editor
-- 주의: 운영 DB 적용은 예호님이 직접 실행합니다.

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists role text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_role_check check (role in ('user', 'admin'));
  end if;
end $$;

create table if not exists public.sparrings (
  id uuid primary key default gen_random_uuid(),
  round_number int generated always as identity,
  category text not null check (category in (
    '재테크입문',
    '국내주식·ETF',
    '해외주식·ETF',
    '절세',
    '보험',
    '대출·부채'
  )),
  title text not null,
  body text,
  slug text unique not null,
  side_a_label text not null,
  side_b_label text not null,
  side_a_polarity text not null default 'positive' check (side_a_polarity in ('positive', 'negative')),
  side_b_polarity text not null default 'negative' check (side_b_polarity in ('positive', 'negative')),
  thumbnail_url text,
  deadline_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'closed', 'archived')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.sparring_votes (
  id uuid primary key default gen_random_uuid(),
  sparring_id uuid not null references public.sparrings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  side text not null check (side in ('a', 'b')),
  voted_at timestamptz not null default now(),
  unique (sparring_id, user_id)
);

create table if not exists public.sparring_comments (
  id uuid primary key default gen_random_uuid(),
  sparring_id uuid not null references public.sparrings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  side text not null check (side in ('a', 'b')),
  body text not null check (char_length(trim(body)) > 0),
  parent_id uuid references public.sparring_comments(id) on delete cascade,
  like_count int not null default 0,
  dislike_count int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists sparrings_status_deadline_idx
  on public.sparrings (status, deadline_at desc)
  where deleted_at is null;

create index if not exists sparrings_slug_idx
  on public.sparrings (slug)
  where deleted_at is null;

create index if not exists sparring_votes_sparring_side_idx
  on public.sparring_votes (sparring_id, side);

create index if not exists sparring_comments_sparring_created_idx
  on public.sparring_comments (sparring_id, created_at desc)
  where deleted_at is null;

drop view if exists public.sparring_stats;

create view public.sparring_stats as
select
  s.id,
  s.id as sparring_id,
  count(distinct v.user_id) filter (where v.side = 'a')::int as votes_a,
  count(distinct v.user_id) filter (where v.side = 'b')::int as votes_b,
  count(distinct v.user_id)::int as votes_total,
  count(distinct c.id) filter (where c.deleted_at is null)::int as comment_count
from public.sparrings s
left join public.sparring_votes v on v.sparring_id = s.id
left join public.sparring_comments c on c.sparring_id = s.id
where s.deleted_at is null
group by s.id;

grant select on public.sparring_stats to anon, authenticated;

alter table public.sparrings enable row level security;
alter table public.sparring_votes enable row level security;
alter table public.sparring_comments enable row level security;

drop policy if exists "sparrings_public_read" on public.sparrings;
drop policy if exists "sparrings_admin_insert" on public.sparrings;
drop policy if exists "sparrings_admin_update" on public.sparrings;
drop policy if exists "sparrings_admin_delete" on public.sparrings;
drop policy if exists "votes_public_read" on public.sparring_votes;
drop policy if exists "vote_before_deadline" on public.sparring_votes;
drop policy if exists "vote_update_before_deadline" on public.sparring_votes;
drop policy if exists "comments_public_read" on public.sparring_comments;
drop policy if exists "comment_only_voters" on public.sparring_comments;
drop policy if exists "comments_author_update" on public.sparring_comments;

create policy "sparrings_public_read" on public.sparrings
  for select using (deleted_at is null);

create policy "sparrings_admin_insert" on public.sparrings
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "sparrings_admin_update" on public.sparrings
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "sparrings_admin_delete" on public.sparrings
  for delete using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "votes_public_read" on public.sparring_votes
  for select using (true);

create policy "vote_before_deadline" on public.sparring_votes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.sparrings s
      where s.id = sparring_votes.sparring_id
        and s.status = 'active'
        and s.deadline_at > now()
        and s.deleted_at is null
    )
  );

create policy "vote_update_before_deadline" on public.sparring_votes
  for update using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.sparrings s
      where s.id = sparring_votes.sparring_id
        and s.status = 'active'
        and s.deadline_at > now()
        and s.deleted_at is null
    )
  );

create policy "comments_public_read" on public.sparring_comments
  for select using (deleted_at is null);

create policy "comment_only_voters" on public.sparring_comments
  for insert with check (
    user_id = auth.uid()
    and deleted_at is null
    and exists (
      select 1
      from public.sparring_votes v
      where v.sparring_id = sparring_comments.sparring_id
        and v.user_id = auth.uid()
        and v.side = sparring_comments.side
    )
    and exists (
      select 1
      from public.sparrings s
      where s.id = sparring_comments.sparring_id
        and s.status = 'active'
        and s.deadline_at > now()
        and s.deleted_at is null
    )
  );

create policy "comments_author_update" on public.sparring_comments
  for update using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid()
  );

insert into public.sparrings (
  category,
  title,
  body,
  slug,
  side_a_label,
  side_b_label,
  side_a_polarity,
  side_b_polarity,
  deadline_at,
  status
) values
  (
    '국내주식·ETF',
    '코스피가 신고가 근처일 때도 적립식 매수를 시작해도 될까요?',
    '목돈 투입보다 매달 나눠 사는 전략이 실제로 심리와 수익률에 어떤 차이를 만드는지 토론해요.',
    'kospi-high-installment-buying',
    '분할 매수 시작',
    '현금 유지',
    'positive',
    'negative',
    now() + interval '7 days',
    'active'
  ),
  (
    '절세',
    'ISA와 연금저축 중 올해 먼저 채울 계좌는 무엇일까요?',
    '중도 인출 가능성과 세액공제 효과 중 어느 쪽을 먼저 봐야 할지 의견을 모읍니다.',
    'isa-vs-pension-first',
    'ISA 먼저',
    '연금저축 먼저',
    'positive',
    'positive',
    now() - interval '5 days',
    'closed'
  )
on conflict (slug) do update set
  category = excluded.category,
  title = excluded.title,
  body = excluded.body,
  side_a_label = excluded.side_a_label,
  side_b_label = excluded.side_b_label,
  side_a_polarity = excluded.side_a_polarity,
  side_b_polarity = excluded.side_b_polarity,
  deadline_at = excluded.deadline_at,
  status = excluded.status;
