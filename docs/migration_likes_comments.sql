-- ============================================================
-- 마이그레이션: 좋아요 중복 방지 + 댓글 저장
-- 실행 위치: Supabase 대시보드 > SQL Editor
-- ============================================================

-- 1. 질문 좋아요 테이블
create table if not exists public.liked_questions (
  user_id     uuid references auth.users(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, question_id)
);

alter table public.liked_questions enable row level security;

create policy "liked_questions: 본인 읽기"
  on public.liked_questions for select
  using (auth.uid() = user_id);

create policy "liked_questions: 본인 insert"
  on public.liked_questions for insert
  with check (auth.uid() = user_id);

create policy "liked_questions: 본인 delete"
  on public.liked_questions for delete
  using (auth.uid() = user_id);

-- 2. 답변 좋아요 테이블
create table if not exists public.liked_answers (
  user_id   uuid references auth.users(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, answer_id)
);

alter table public.liked_answers enable row level security;

create policy "liked_answers: 본인 읽기"
  on public.liked_answers for select
  using (auth.uid() = user_id);

create policy "liked_answers: 본인 insert"
  on public.liked_answers for insert
  with check (auth.uid() = user_id);

create policy "liked_answers: 본인 delete"
  on public.liked_answers for delete
  using (auth.uid() = user_id);

-- 3. 댓글 테이블
create table if not exists public.comments (
  id         uuid default gen_random_uuid() primary key,
  answer_id  uuid references public.answers(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  body       text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

create policy "comments: 누구나 읽기"
  on public.comments for select
  using (true);

create policy "comments: 로그인 insert"
  on public.comments for insert
  with check (auth.uid() = author_id);

create policy "comments: 본인 delete"
  on public.comments for delete
  using (auth.uid() = author_id);
