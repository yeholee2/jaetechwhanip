-- ETF 카탈로그 v2 — 국내·해외 ETF 동시 수용
-- 변경:
-- 1. code 제약 완화: 6자리 숫자 → 영문 8자 이내 허용 (VOO, QQQ, 005930 등)
-- 2. 새 컬럼: market, country, currency, underlying_country
-- 3. 인덱스 + RLS는 v1 유지, 컬럼만 추가

-- code regex 완화 (KRX 6자리 + 미국 영문 1~8자 모두 허용)
alter table public.etfs drop constraint if exists etfs_code_check;
alter table public.etfs
  add constraint etfs_code_check check (code ~ '^[0-9A-Z]{1,10}$');

-- 시장 (KRX, NYSE, NASDAQ, HKEX 등)
alter table public.etfs
  add column if not exists market text not null default 'KRX';

-- 발행/거래 국가 (KR, US, HK, JP, EU 등)
alter table public.etfs
  add column if not exists country text not null default 'KR';

-- 거래통화 (KRW, USD, HKD, JPY, EUR)
alter table public.etfs
  add column if not exists currency text not null default 'KRW';

-- 추종 자산 국가 (KR, US, GLOBAL, EM, JP, CN, EU)
-- '국내자산 ETF인지 해외자산 추종 ETF인지' 구분용
alter table public.etfs
  add column if not exists underlying_country text not null default 'KR';

-- 인덱스
create index if not exists etfs_market_idx on public.etfs(market);
create index if not exists etfs_country_idx on public.etfs(country);
create index if not exists etfs_underlying_country_idx on public.etfs(underlying_country);

-- daily_prices 도 동일하게 code 제약 완화
alter table public.etf_daily_prices drop constraint if exists etf_daily_prices_code_check;
alter table public.etf_daily_prices
  add constraint etf_daily_prices_code_check check (code ~ '^[0-9A-Z]{1,10}$');
