-- 글 템플릿 — 시스템 템플릿(creator_id null) + 크리에이터 개인 템플릿.
--
-- kind:
--   stock_analysis   종목 분석
--   etf_review       ETF 리뷰
--   market_recap     시황 코멘트
--   portfolio        포트폴리오 공개
--   backtest         백테스트
--   custom           자유 (개인 템플릿)

create table if not exists creator_post_templates (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade, -- null = 시스템 템플릿
  kind text not null check (kind in ('stock_analysis','etf_review','market_recap','portfolio','backtest','custom')),
  name text not null,
  description text,
  emoji text,
  body_html text not null,
  is_system boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_post_templates_creator on creator_post_templates(creator_id) where creator_id is not null;
create index if not exists idx_post_templates_system on creator_post_templates(is_system, sort_order) where is_system = true;

alter table creator_post_templates enable row level security;

drop policy if exists post_templates_read on creator_post_templates;
create policy post_templates_read on creator_post_templates
  for select using (
    is_system = true
    or creator_id in (select id from creators where user_id = auth.uid())
  );

drop policy if exists post_templates_owner_write on creator_post_templates;
create policy post_templates_owner_write on creator_post_templates
  for all using (
    creator_id in (select id from creators where user_id = auth.uid())
  )
  with check (
    creator_id in (select id from creators where user_id = auth.uid())
    and is_system = false
  );

-- 시스템 템플릿 시드 (멱등)
insert into creator_post_templates (id, creator_id, kind, name, description, emoji, body_html, is_system, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', null, 'stock_analysis', '종목 분석', '한 종목을 깊게 파보는 글', '📊',
   '<h2>한줄 요약</h2><p>이 종목을 왜 지금 봐야 하나요? 한 문장으로.</p><h2>비즈니스</h2><p>회사가 어떻게 돈을 버는지 — 매출 구조, 주요 제품, 핵심 고객.</p><h2>실적</h2><p>최근 분기 매출·영업이익·가이던스. 시장 기대치 대비.</p><h2>밸류에이션</h2><p>PER, PBR, EV/EBITDA. 동종 업계 평균과 비교.</p><h2>리스크</h2><ul><li>리스크 1</li><li>리스크 2</li></ul><h2>내 결론</h2><p>매수/관망/매도 — 그리고 그 이유. 목표가가 있다면 함께.</p><blockquote>본 글은 투자 권유가 아닙니다. 모든 판단은 본인 책임입니다.</blockquote>',
   true, 1),

  ('00000000-0000-0000-0000-000000000002', null, 'etf_review', 'ETF 리뷰', 'ETF 하나를 뜯어보는 글', '🪙',
   '<h2>이 ETF는?</h2><p>티커, 운용사, 추적 지수. 한 문장 정의.</p><h2>구성 종목 TOP 10</h2><p>여기에 차트/표를 박아주세요. 비중과 섹터 분포까지.</p><h2>수익률</h2><p>최근 1년·3년·5년 수익률. 벤치마크 대비.</p><h2>비용</h2><p>총보수율(TER), 분배금 정책, 환헤지 여부.</p><h2>비슷한 ETF와 비교</h2><ul><li>대안 1 — 차이점</li><li>대안 2 — 차이점</li></ul><h2>누구한테 좋나</h2><p>이 ETF가 맞는 투자자 vs 맞지 않는 투자자.</p>',
   true, 2),

  ('00000000-0000-0000-0000-000000000003', null, 'market_recap', '시황 코멘트', '이번 주/달 시장 정리', '📰',
   '<h2>이번 주 핵심</h2><ul><li>주요 이벤트 1</li><li>주요 이벤트 2</li><li>주요 이벤트 3</li></ul><h2>섹터별 흐름</h2><p>강세 섹터 / 약세 섹터 — 왜 그랬는지.</p><h2>매크로</h2><p>금리·환율·원자재. 시장에 어떤 영향을 줬나.</p><h2>다음 주 체크포인트</h2><ul><li>발표 예정 지표·실적</li><li>주목할 이벤트</li></ul><h2>내 포지션</h2><p>이번 주 어떻게 움직였는지 — 매수/매도/관망.</p>',
   true, 3),

  ('00000000-0000-0000-0000-000000000004', null, 'portfolio', '포트폴리오 공개', '내 자산 배분 공유', '💼',
   '<h2>이번 달 포트폴리오</h2><p>총 자산 대비 비중 — 표나 차트로.</p><h2>핵심 보유</h2><ul><li>종목 1 — 비중 % — 보유 이유</li><li>종목 2 — 비중 % — 보유 이유</li></ul><h2>최근 변화</h2><p>추가/제외한 종목 + 이유.</p><h2>현금 비중</h2><p>현재 현금 비율과 그 이유.</p><h2>다음 액션</h2><p>다음 달 어떤 조정을 계획 중인지.</p>',
   true, 4),

  ('00000000-0000-0000-0000-000000000005', null, 'backtest', '백테스트', '전략 검증', '🧪',
   '<h2>가설</h2><p>어떤 전략을 테스트하나? 한 문장으로.</p><h2>규칙</h2><ul><li>진입 조건</li><li>청산 조건</li><li>리밸런싱 주기</li></ul><h2>기간 · 유니버스</h2><p>몇 년 데이터, 어떤 종목/지수.</p><h2>결과</h2><p>총 수익률, CAGR, MDD, 샤프 — 벤치마크 대비.</p><h2>한계</h2><p>이 백테스트가 못 본 것 — 수수료, 슬리피지, 생존 편향 등.</p><h2>실전 적용</h2><p>현실에서 그대로 따라할 수 있는지 — 추천 vs 비추천.</p>',
   true, 5)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  emoji = excluded.emoji,
  body_html = excluded.body_html,
  sort_order = excluded.sort_order,
  updated_at = now();
