-- sparrings 에 ETF 코드 두 개 컬럼 추가 (양측 비교용)
-- 원래 클라이언트 코드는 payload 에 etf_a_code/etf_b_code 를 보내고 있었는데
-- 테이블에 컬럼이 없어 update 가 PostgREST 에서 거부됨 → "저장 중 문제가 생겼어요" 로만 표시되던 버그.

alter table public.sparrings
  add column if not exists etf_a_code text,
  add column if not exists etf_b_code text;
