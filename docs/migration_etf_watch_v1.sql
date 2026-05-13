-- ETF 관심 등록 v1 (Watch list)
-- 로그인 사용자의 관심 ETF를 Supabase에 저장 → 디바이스 간 동기화.
-- 비로그인 사용자는 기존 localStorage 사용 (lib/etfWatch.ts).

create table if not exists public.etf_watches (
  user_id uuid not null references public.users(id) on delete cascade,
  etf_code text not null check (etf_code ~ '^[0-9]{6}$'),
  watched_at timestamptz not null default now(),
  primary key (user_id, etf_code)
);

create index if not exists etf_watches_user_idx on public.etf_watches(user_id, watched_at desc);

-- RLS
alter table public.etf_watches enable row level security;

drop policy if exists etf_watches_self_read on public.etf_watches;
create policy etf_watches_self_read on public.etf_watches
  for select using (auth.uid() = user_id);

drop policy if exists etf_watches_self_write on public.etf_watches;
create policy etf_watches_self_write on public.etf_watches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
