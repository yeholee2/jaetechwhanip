-- 자동번역 캐시 테이블입니다.
-- Supabase SQL Editor에서 실행하면 /api/translate가 번역 결과를 재사용합니다.

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null,
  source_locale text not null default 'ko',
  target_locale text not null,
  item_type text not null default 'text',
  source_text text not null,
  translated_text text not null,
  provider text not null default 'openai',
  created_at timestamptz not null default now(),
  unique (cache_key, target_locale)
);

alter table public.translations enable row level security;

do $$
begin
  create policy "Translations are readable"
  on public.translations
  for select
  using (true);
exception when duplicate_object then null;
end $$;
