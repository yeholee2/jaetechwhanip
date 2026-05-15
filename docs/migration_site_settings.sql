-- 사이트 설정 (key-value JSONB)
-- Admin 대시보드에서 인기 키워드·공지·필터 단어 등 동적 설정 관리

create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table public.site_settings enable row level security;

-- 누구나 읽기 (인기 키워드 등 클라이언트에서 사용)
drop policy if exists site_settings_read_all on public.site_settings;
create policy site_settings_read_all on public.site_settings
  for select using (true);

-- admin role만 쓰기
drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- 기본값 시드
insert into public.site_settings (key, value) values
  ('home_keywords', '["반도체","월배당","AI전력","나스닥100","S&P500","커버드콜","밸류업"]'::jsonb),
  ('banner', '{"enabled":false,"message":"","link":""}'::jsonb),
  ('spam_words', '[]'::jsonb)
on conflict (key) do nothing;
