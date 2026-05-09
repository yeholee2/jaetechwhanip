-- 기존 질문 slug를 한글 URL 규칙으로 백필하는 초안입니다.
-- 실행 전 Supabase SQL Editor에서 SELECT 결과를 먼저 확인하세요.
-- UUID처럼 보이는 slug 또는 빈 slug만 교체합니다.

begin;

with source_rows as (
  select
    id,
    coalesce(nullif(trim(title), ''), '질문') as title,
    slug
  from public.questions
  where
    slug is null
    or slug = ''
    or slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
),
base_slugs as (
  select
    id,
    coalesce(
      nullif(
        trim(both '-' from left(
          regexp_replace(
            lower(regexp_replace(title, '&', ' and ', 'g')),
            '[^0-9a-z가-힣]+',
            '-',
            'g'
          ),
          50
        )),
        ''
      ),
      'question'
    ) as base_slug
  from source_rows
),
ranked as (
  select
    id,
    base_slug,
    row_number() over (partition by base_slug order by id) as duplicate_index
  from base_slugs
),
candidate_slugs as (
  select
    id,
    case
      when duplicate_index = 1 then base_slug
      else left(base_slug, 50 - length('-' || duplicate_index::text)) || '-' || duplicate_index::text
    end as new_slug
  from ranked
)
update public.questions q
set slug = c.new_slug
from candidate_slugs c
where q.id = c.id;

-- 중복이 남아 있으면 unique index 추가 전에 반드시 정리하세요.
-- select slug, count(*) from public.questions group by slug having count(*) > 1;
-- create unique index concurrently if not exists questions_slug_unique_idx on public.questions(slug);

commit;
