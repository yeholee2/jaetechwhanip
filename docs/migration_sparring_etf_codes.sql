-- Sparring ETF 비교 모드 (Phase 5)
-- 스파링을 두 ETF 비교 모드로 사용할 수 있게 etf_a_code, etf_b_code 컬럼 추가.
-- 6자리 ETF 종목 코드를 저장하면 상세 페이지에 ETF 비교 카드가 노출됨.
-- 둘 다 null이면 기존(일반 스파링)과 동일하게 동작.

alter table public.sparrings
  add column if not exists etf_a_code text,
  add column if not exists etf_b_code text;

-- 코드 형식 검증 (6자리 숫자) — 빈 값 허용
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sparrings_etf_a_code_format' and conrelid = 'public.sparrings'::regclass
  ) then
    alter table public.sparrings
      add constraint sparrings_etf_a_code_format
      check (etf_a_code is null or etf_a_code ~ '^[0-9]{6}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sparrings_etf_b_code_format' and conrelid = 'public.sparrings'::regclass
  ) then
    alter table public.sparrings
      add constraint sparrings_etf_b_code_format
      check (etf_b_code is null or etf_b_code ~ '^[0-9]{6}$');
  end if;
end $$;

-- 인덱스(선택적: 코드별 스파링 조회)
create index if not exists sparrings_etf_a_code_idx on public.sparrings(etf_a_code) where etf_a_code is not null;
create index if not exists sparrings_etf_b_code_idx on public.sparrings(etf_b_code) where etf_b_code is not null;
