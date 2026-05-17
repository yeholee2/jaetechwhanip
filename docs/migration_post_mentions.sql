-- 글 ↔ 종목/ETF 양방향 인덱스.
--
-- 자동 추출 소스:
--   chart_node   : TipTap ChartNode 의 data-chart="AAPL"
--   ticker       : 본문 텍스트의 $AAPL, $005930 패턴
--   etf_code     : 본문에 등장한 ETF 코드 (069500 등)
--   stock_name   : 한국어 종목명 사전 매칭 (삼성전자 → 005930)
--   manual       : 크리에이터가 수동 태그

create table if not exists post_mentions (
  post_id    uuid not null references creator_posts(id) on delete cascade,
  symbol     text not null,           -- 정규화 대문자
  kind       text not null check (kind in ('stock', 'etf')),
  source     text not null,           -- chart_node | ticker | stock_name | etf_code | manual
  weight     int  not null default 1, -- 본문 등장 횟수 (랭킹용)
  created_at timestamptz not null default now(),
  primary key (post_id, symbol)
);

create index if not exists idx_post_mentions_symbol on post_mentions(symbol, weight desc);
create index if not exists idx_post_mentions_post on post_mentions(post_id);
create index if not exists idx_post_mentions_kind on post_mentions(kind, symbol);

alter table post_mentions enable row level security;

drop policy if exists post_mentions_read on post_mentions;
create policy post_mentions_read on post_mentions for select using (true);

-- 작성자 본인 또는 service role 만 쓰기
drop policy if exists post_mentions_owner_write on post_mentions;
create policy post_mentions_owner_write on post_mentions
  for all
  using (
    post_id in (
      select p.id from creator_posts p
      join creators c on c.id = p.creator_id
      where c.user_id = auth.uid()
    )
  );
