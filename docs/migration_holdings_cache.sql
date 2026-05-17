-- ETF 보유종목 캐시 — Yahoo/Naver 가서 가져온 결과를 저장.
--
-- 목적:
--   1) ETF 상세에서 holdings 조회 시 캐시 우선
--   2) 종목 → ETF 역방향 검색 O(1) (symbol 인덱스)
--
-- 만료 정책: updated_at 24h 지나면 stale, 백그라운드/lazy refresh.

create table if not exists etf_holdings_cache (
  etf_code     text not null,
  symbol       text not null,        -- 정규화: 대문자 + .,-,_ 제거
  display_symbol text,               -- 원본 표시용 (예: 'BRK.B', '005930')
  name         text not null,
  weight       numeric not null,     -- 0~1
  sector       text,
  source       text not null,        -- 'yahoo' | 'naver' | 'manual'
  updated_at   timestamptz not null default now(),
  primary key (etf_code, symbol)
);

create index if not exists idx_holdings_symbol on etf_holdings_cache(symbol, weight desc);
create index if not exists idx_holdings_etf on etf_holdings_cache(etf_code);

-- etfs.code FK (역방향 검색 시 PostgREST embed)
alter table etf_holdings_cache
  drop constraint if exists etf_holdings_cache_etf_fk,
  add constraint etf_holdings_cache_etf_fk foreign key (etf_code) references etfs(code) on delete cascade;

-- ETF 단위 메타 (운용보수, 배당수익률, AUM) 캐시. holdings 와 분리.
create table if not exists etf_meta_cache (
  etf_code         text primary key,
  expense_ratio    numeric,
  dividend_yield   numeric,
  total_assets     bigint,
  source           text not null,
  updated_at       timestamptz not null default now()
);

alter table etf_holdings_cache enable row level security;
alter table etf_meta_cache enable row level security;

-- 모두 읽기 허용. 쓰기는 service_role 만.
drop policy if exists holdings_cache_read on etf_holdings_cache;
create policy holdings_cache_read on etf_holdings_cache for select using (true);

drop policy if exists meta_cache_read on etf_meta_cache;
create policy meta_cache_read on etf_meta_cache for select using (true);
