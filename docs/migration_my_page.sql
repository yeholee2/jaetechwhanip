-- 마이페이지 + 북마크/팔로우 v1
-- 실행 위치: Supabase SQL Editor
-- 운영 DB 적용은 예호님이 직접 실행합니다.

create extension if not exists pgcrypto;

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('question', 'sparring', 'column')),
  target_id text not null,
  title text,
  href text,
  category text,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('topic', 'user')),
  target_id text not null,
  title text,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists bookmarks_user_created_idx
  on public.bookmarks (user_id, created_at desc);

create index if not exists bookmarks_target_idx
  on public.bookmarks (target_type, target_id);

create index if not exists follows_user_created_idx
  on public.follows (user_id, created_at desc);

create index if not exists follows_target_idx
  on public.follows (target_type, target_id);

alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;

drop policy if exists "bookmarks_owner_read" on public.bookmarks;
drop policy if exists "bookmarks_owner_insert" on public.bookmarks;
drop policy if exists "bookmarks_owner_delete" on public.bookmarks;
drop policy if exists "follows_owner_read" on public.follows;
drop policy if exists "follows_owner_insert" on public.follows;
drop policy if exists "follows_owner_delete" on public.follows;

create policy "bookmarks_owner_read" on public.bookmarks
  for select using (user_id = auth.uid());

create policy "bookmarks_owner_insert" on public.bookmarks
  for insert with check (user_id = auth.uid());

create policy "bookmarks_owner_delete" on public.bookmarks
  for delete using (user_id = auth.uid());

create policy "follows_owner_read" on public.follows
  for select using (user_id = auth.uid());

create policy "follows_owner_insert" on public.follows
  for insert with check (user_id = auth.uid());

create policy "follows_owner_delete" on public.follows
  for delete using (user_id = auth.uid());
