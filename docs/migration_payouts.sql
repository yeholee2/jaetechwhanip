-- 크리에이터 정산 시스템 (월별 자동 집계)

create table if not exists creator_payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators on delete cascade not null,
  -- 정산 기간 (해당 월의 1일 ~ 말일)
  period_start date not null,
  period_end date not null,
  -- 매출
  gross_revenue_won integer not null default 0,           -- 총 멤버십 매출
  subscriber_count integer not null default 0,            -- 정산 대상 구독자 수
  -- 수수료
  platform_fee_rate numeric(5,2) not null default 0.00,   -- 0~100% (베타 0)
  platform_fee_won integer not null default 0,            -- 플랫폼 몫
  -- 차감
  refund_won integer not null default 0,                  -- 환불·환수
  -- 최종
  net_payout_won integer not null default 0,              -- 크리에이터 지급액
  -- 상태
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'paid', 'cancelled')),
  -- 지급 정보 (정착 후 사용)
  bank_name text,
  bank_account text,
  account_holder text,
  paid_at timestamptz,
  paid_tx_id text,
  -- 메모
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (creator_id, period_start)
);

create index if not exists idx_payouts_creator on creator_payouts(creator_id, period_start desc);
create index if not exists idx_payouts_status on creator_payouts(status, period_start desc);

alter table creator_payouts enable row level security;

-- 본인 정산은 본인이 조회 가능
do $$ begin
  create policy "payouts_self_read" on creator_payouts for select using (
    exists (select 1 from creators c where c.id = creator_id and c.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- admin 전체 조회/조작
do $$ begin
  create policy "payouts_admin_all" on creator_payouts for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  ) with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );
exception when duplicate_object then null; end $$;

-- 정산 계산 함수 (특정 월 + 특정 크리에이터)
-- 호출: select run_creator_payout('uuid', '2026-05-01'::date);
create or replace function run_creator_payout(
  p_creator_id uuid,
  p_period_start date
) returns creator_payouts as $$
declare
  v_period_end date := (p_period_start + interval '1 month - 1 day')::date;
  v_gross integer;
  v_count integer;
  v_fee_rate numeric;
  v_fee integer;
  v_net integer;
  v_row creator_payouts;
begin
  -- 전월에 active 였고 무료가 아니었던 구독의 금액 합산
  select coalesce(sum(
    case when plan = 'yearly' then round((price_won::numeric) / 12)
    else price_won end
  ), 0)::integer, count(*)::integer
    into v_gross, v_count
  from creator_subscriptions
  where creator_id = p_creator_id
    and status = 'active'
    and is_beta_free = false
    and period_started_at < (p_period_start + interval '1 month')
    and (period_ends_at is null or period_ends_at > p_period_start);

  -- 수수료율: 베타 0%, 정착 12% (변경 가능)
  v_fee_rate := coalesce(
    (select platform_fee_rate from creator_payouts
     where creator_id = p_creator_id and period_start = p_period_start),
    0.00
  );
  v_fee := round(v_gross * v_fee_rate / 100)::integer;
  v_net := v_gross - v_fee;

  insert into creator_payouts (
    creator_id, period_start, period_end,
    gross_revenue_won, subscriber_count,
    platform_fee_rate, platform_fee_won, net_payout_won,
    status, updated_at
  ) values (
    p_creator_id, p_period_start, v_period_end,
    v_gross, v_count,
    v_fee_rate, v_fee, v_net,
    'pending', now()
  )
  on conflict (creator_id, period_start) do update set
    gross_revenue_won = excluded.gross_revenue_won,
    subscriber_count = excluded.subscriber_count,
    platform_fee_won = excluded.platform_fee_won,
    net_payout_won = excluded.net_payout_won,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer;

-- 모든 활성 크리에이터의 정산을 한 번에 계산
create or replace function run_all_payouts(p_period_start date)
returns integer as $$
declare
  v_count integer := 0;
  v_creator_id uuid;
begin
  for v_creator_id in select id from creators where is_published = true loop
    perform run_creator_payout(v_creator_id, p_period_start);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$ language plpgsql security definer;
