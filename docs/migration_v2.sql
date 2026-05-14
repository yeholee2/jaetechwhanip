-- migration_v2.sql
-- 아하 벤치마킹 v2: 북마크 / 싫어요 / 응원하기 + 집계 컬럼
-- Supabase SQL Editor 에서 실행

-- ───────────────────────────────────────────────────────────
-- 1. bookmarks (북마크 / 저장)
-- ───────────────────────────────────────────────────────────
create table if not exists public.bookmarks (
  user_id     uuid references auth.users(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, question_id)
);

alter table public.bookmarks enable row level security;

create policy "bookmarks_select_own" on public.bookmarks
  for select using (auth.uid() = user_id);

create policy "bookmarks_insert_own" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "bookmarks_delete_own" on public.bookmarks
  for delete using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 2. disliked_questions (질문 싫어요)
-- ───────────────────────────────────────────────────────────
create table if not exists public.disliked_questions (
  user_id     uuid references auth.users(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, question_id)
);

alter table public.disliked_questions enable row level security;

create policy "disliked_questions_select_own" on public.disliked_questions
  for select using (auth.uid() = user_id);

create policy "disliked_questions_insert_own" on public.disliked_questions
  for insert with check (auth.uid() = user_id);

create policy "disliked_questions_delete_own" on public.disliked_questions
  for delete using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 3. cheered_answers (답변 응원하기)
-- ───────────────────────────────────────────────────────────
create table if not exists public.cheered_answers (
  user_id   uuid references auth.users(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, answer_id)
);

alter table public.cheered_answers enable row level security;

create policy "cheered_answers_select_own" on public.cheered_answers
  for select using (auth.uid() = user_id);

create policy "cheered_answers_insert_own" on public.cheered_answers
  for insert with check (auth.uid() = user_id);

create policy "cheered_answers_delete_own" on public.cheered_answers
  for delete using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 4. 집계 컬럼 추가
-- ───────────────────────────────────────────────────────────
alter table public.answers   add column if not exists cheer_count   integer default 0;
alter table public.questions add column if not exists dislike_count integer default 0;
