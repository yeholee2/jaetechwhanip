-- 대가 13F 공시 스냅샷 (분기 갱신).
-- 시드(lib/portfolioWhales.ts)는 fallback. DB 있으면 DB 우선.
create table if not exists public.whale_filings (
  cik text primary key check (cik ~ '^\d{10}$'),
  manager_slug text not null unique,
  manager_name text not null,
  fund_name text not null,
  quarter text not null,              -- "2024 Q4"
  filed_at date not null,
  total_value_mln numeric(14, 2),     -- 총 자산 (백만 달러)
  position_count int,
  holdings jsonb not null default '[]'::jsonb,
  -- holdings = [{ cusip, name, ticker?, weight, valueMln, sharesMln, change? }]
  updated_at timestamptz not null default now()
);

create index if not exists whale_filings_quarter_idx on public.whale_filings(quarter);
create index if not exists whale_filings_filed_at_idx on public.whale_filings(filed_at desc);

alter table public.whale_filings enable row level security;

drop policy if exists whale_filings_read_all on public.whale_filings;
create policy whale_filings_read_all on public.whale_filings for select using (true);

drop policy if exists whale_filings_admin_write on public.whale_filings;
create policy whale_filings_admin_write on public.whale_filings
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );
