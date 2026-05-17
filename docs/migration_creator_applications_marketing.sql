-- 크리에이터 신청 폼 마케팅 데이터 컬럼
alter table public.creator_applications
  add column if not exists referral_source text,
  add column if not exists intended_use text;
