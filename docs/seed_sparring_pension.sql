-- 진행중 스파링 — 국민연금 보험료율 인상 찬반
-- /admin/sparring 에서 만드는 대신, 라이브 DB에 직접 시드 (Supabase SQL Editor)

insert into public.sparrings (
  round_number,
  category,
  title,
  body,
  slug,
  side_a_label,
  side_b_label,
  side_a_polarity,
  side_b_polarity,
  thumbnail_url,
  deadline_at,
  status,
  created_at
) values (
  217,
  '절세',
  '국민연금 보험료율 9% → 13% 인상안, 찬성하시나요?',
  '노후 보장을 위한 인상이 필요하다는 입장과 청년·중장년의 보험료 부담이 너무 크다는 입장이 갈려요. 여러분은 어느 쪽이세요?',
  'nps-rate-hike-2026',
  '찬성 (노후 대비 필요)',
  '반대 (부담 과중)',
  'positive',
  'negative',
  null,
  (now() + interval '5 days 12 hours'),
  'active',
  (now() - interval '18 hours')
)
on conflict (slug) do nothing;
