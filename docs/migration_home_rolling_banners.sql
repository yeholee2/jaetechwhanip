-- Home rolling banner setting for /admin/settings.
insert into public.site_settings (key, value)
values (
  'home_rolling_banners',
  '[
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
  ]'::jsonb
)
on conflict (key) do nothing;
