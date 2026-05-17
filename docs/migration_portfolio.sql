-- 수동 포트폴리오 트래커.
--
-- 사용자가 보유 종목 수동 입력 → 우리 인프라(시세·ETF 유사도·창작자 글)와 연결.
-- 마이데이터 없이도 차별점 만드는 핵심 기능.

-- 사용자당 1개 메인 포트폴리오 (MVP). 향후 멀티 포트폴리오 확장 가능.
create table if not exists portfolios (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default '내 포트폴리오',
  is_public  boolean not null default false, -- 공개 (커뮤니티 공유) 옵션
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_portfolios_user_main on portfolios(user_id) where name = '내 포트폴리오';

create table if not exists portfolio_holdings (
  id             uuid primary key default gen_random_uuid(),
  portfolio_id   uuid not null references portfolios(id) on delete cascade,
  symbol         text not null,             -- 정규화 (대문자, 6자리 KR 또는 US 티커)
  display_symbol text,                      -- 원본 (BRK.B 등)
  name           text not null,             -- 표시명 (삼성전자, Apple Inc 등)
  quantity       numeric not null,          -- 보유 수량
  avg_cost       numeric,                   -- 평균 매입가
  currency       text not null default 'KRW' check (currency in ('KRW', 'USD')),
  memo           text,
  added_at       timestamptz not null default now(),
  unique (portfolio_id, symbol)
);

create index if not exists idx_portfolio_holdings_pf on portfolio_holdings(portfolio_id);
create index if not exists idx_portfolio_holdings_symbol on portfolio_holdings(symbol);

alter table portfolios enable row level security;
alter table portfolio_holdings enable row level security;

-- 본인 또는 is_public 인 경우 조회
drop policy if exists portfolios_read on portfolios;
create policy portfolios_read on portfolios
  for select using (user_id = auth.uid() or is_public = true);

drop policy if exists portfolios_owner_write on portfolios;
create policy portfolios_owner_write on portfolios
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists holdings_read on portfolio_holdings;
create policy holdings_read on portfolio_holdings
  for select using (
    portfolio_id in (select id from portfolios where user_id = auth.uid() or is_public = true)
  );

drop policy if exists holdings_owner_write on portfolio_holdings;
create policy holdings_owner_write on portfolio_holdings
  for all using (
    portfolio_id in (select id from portfolios where user_id = auth.uid())
  )
  with check (
    portfolio_id in (select id from portfolios where user_id = auth.uid())
  );
