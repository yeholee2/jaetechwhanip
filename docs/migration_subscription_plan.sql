-- 구독 플랜·결제 정보 컬럼 추가 (베타 무료 등록 + 향후 결제 연결 대비)

alter table public.creator_subscriptions
  add column if not exists plan text default 'monthly'
    check (plan in ('monthly', 'yearly')),
  add column if not exists price_won integer,
  add column if not exists period_started_at timestamptz default now(),
  add column if not exists period_ends_at timestamptz,
  add column if not exists is_beta_free boolean default false,
  add column if not exists toss_billing_key text,
  add column if not exists kakao_sid text,
  add column if not exists last_charged_at timestamptz;

-- 구독자 본인이 자기 구독을 INSERT 할 수 있도록 RLS 추가
do $$ begin
  create policy "creator_subs_self_insert"
    on creator_subscriptions for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
