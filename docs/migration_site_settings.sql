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
  ('home_rolling_banners', '[
    {
      "id": "jaefcon-launch",
      "enabled": true,
      "eyebrow": "재프콘",
      "title": "재테크 크리에이터를 팔로우하고 깊은 리포트는 멤버십으로",
      "description": "ETF, 절세, 연금, 시장 인사이트 채널을 발견하고 내 뉴스피드에서 새 글을 모아보세요.",
      "ctaLabel": "재프콘 탐색",
      "link": "/creators",
      "imageUrl": "",
      "dimImage": true
    },
    {
      "id": "creator-open",
      "enabled": true,
      "eyebrow": "크리에이터 모집",
      "title": "내 투자 관점을 담은 채널을 바로 런칭하세요",
      "description": "닉네임과 한 줄 소개만으로 공개 페이지가 만들어지고, 글·시리즈·멤버십으로 확장할 수 있어요.",
      "ctaLabel": "내 채널 생성",
      "link": "/creator/apply",
      "imageUrl": "",
      "dimImage": true
    }
  ]'::jsonb),
  ('spam_words', '[]'::jsonb)
on conflict (key) do nothing;
