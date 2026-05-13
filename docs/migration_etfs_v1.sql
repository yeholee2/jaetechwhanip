-- ETF 카탈로그 v1 (Tier S)
-- 시드 5개를 코드(lib/etfs.ts)에 박아두던 한계를 깨고,
-- FSC/KRX API 에서 가져온 800+ ETF 메타데이터를 Supabase 에 영구 저장.
--
-- 운영 흐름:
-- 1. /api/etf/sync 호출(cron 또는 수동) → FSC API 에서 fetch → upsert
-- 2. 페이지 렌더링 시 lib/etfs.ts 가 이 테이블에서 read (시드는 fallback)

create table if not exists public.etfs (
  slug text primary key,
  code text not null unique check (code ~ '^[0-9]{6}$'),
  name text not null,
  short_name text not null,
  issuer text not null,
  category text,
  theme text,
  summary text,
  one_line text,
  price text,
  change text,
  change_tone text check (change_tone in ('up','down','flat')),
  aum text,
  fee text,
  distribution text,
  hedge text,
  listed_at text,
  base_date text,
  volume text,
  nav text,
  tags text[] not null default '{}',
  holdings jsonb not null default '[]'::jsonb,
  related_questions jsonb not null default '[]'::jsonb,
  sparring_title text,
  updated_at timestamptz not null default now(),
  data_source text not null default 'fallback' check (data_source in ('fallback','public-api','admin'))
);

create index if not exists etfs_code_idx on public.etfs(code);
create index if not exists etfs_category_idx on public.etfs(category);
create index if not exists etfs_issuer_idx on public.etfs(issuer);
create index if not exists etfs_theme_idx on public.etfs(theme);
create index if not exists etfs_tags_gin on public.etfs using gin(tags);
create index if not exists etfs_updated_at_idx on public.etfs(updated_at desc);

-- RLS: 누구나 read, 쓰기는 admin / service_role 만
alter table public.etfs enable row level security;

drop policy if exists etfs_read_all on public.etfs;
create policy etfs_read_all on public.etfs for select using (true);

drop policy if exists etfs_admin_write on public.etfs;
create policy etfs_admin_write on public.etfs
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- updated_at 자동 갱신 트리거
create or replace function public.touch_etfs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists etfs_updated_at_touch on public.etfs;
create trigger etfs_updated_at_touch
  before update on public.etfs
  for each row execute function public.touch_etfs_updated_at();

-- 일별 가격 히스토리 (차트용)
-- 사이즈 큼: ETF 850개 * 5년 * 252일 ≈ 1M rows.
-- 인덱스: (code, base_date) 가 차트 조회용. 별도 partition 안 함 (서비스 초기엔 충분).
create table if not exists public.etf_daily_prices (
  code text not null check (code ~ '^[0-9]{6}$'),
  base_date date not null,
  close numeric(14, 4),
  open numeric(14, 4),
  high numeric(14, 4),
  low numeric(14, 4),
  volume bigint,
  trade_value numeric(20, 2),
  nav numeric(14, 4),
  market_cap numeric(20, 2),
  fetched_at timestamptz not null default now(),
  primary key (code, base_date)
);

create index if not exists etf_daily_prices_code_date_idx
  on public.etf_daily_prices(code, base_date desc);

alter table public.etf_daily_prices enable row level security;

drop policy if exists etf_daily_prices_read_all on public.etf_daily_prices;
create policy etf_daily_prices_read_all on public.etf_daily_prices
  for select using (true);

drop policy if exists etf_daily_prices_admin_write on public.etf_daily_prices;
create policy etf_daily_prices_admin_write on public.etf_daily_prices
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );
