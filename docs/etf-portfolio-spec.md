# ETF 페이지 v2 — 도미노 패턴 풀 도입

작성: 2026-05-10
대상: GPT/Codex (코드 구현)
참고: 도미노 앱 (Fast Forward Corp, App Store id1540576519)
영감: 도미노의 "모든 투자를 한 곳에서" UX 흐름을 ETF에 한정 적용

---

## 0. 결정 / 한 줄 요약

**`/etf` 페이지를 단순 정보 비교 → 개인 포트폴리오 통합 관리 페이지로 격상.**
- 도미노 5기능(포트폴리오·가격알림·캘린더·AI인사이트·배당캘린더)을 ETF 한정으로 흡수
- 마이데이터/실시간 시세 라이선스 없이 가능한 범위 (수동 입력 + 공공 API + AI)
- 4-탭 IA 구조

---

## 1. 새 IA 구조

### 현재 `/etf`
검색·랭킹·필터·비교 단일 페이지.

### v2 4-탭 구조
```
/etf
 ├ 탭 1. 둘러보기 (기존 — 검색·랭킹·필터·비교 그대로 유지)
 ├ 탭 2. 내 포트폴리오 ⭐ 신규
 ├ 탭 3. 알림·캘린더 ⭐ 신규
 └ 탭 4. AI 인사이트 ⭐ 신규
```

탭 위치: 페이지 헤더 직하단, 가로 텍스트 탭 (a-ha 패턴 모티브, "인기/관심/답변" 같은)

URL 쿼리: `/etf?tab=portfolio`, `/etf?tab=alerts`, `/etf?tab=ai`
디폴트 (`/etf` 만): 둘러보기

---

## 2. 데이터 모델 (Supabase 신규 4테이블)

```sql
-- 보유 ETF (수동 입력)
public.etf_holdings (
  id uuid pk,
  user_id uuid references users(id) on delete cascade,
  etf_code text not null,        -- 예: '360750'
  etf_name text not null,        -- 캐시 (etfs 테이블에서 lookup 가능하지만 표시용)
  quantity numeric not null check (quantity > 0),
  avg_price numeric not null check (avg_price > 0),
  account_label text,            -- 사용자가 임의 라벨 (예: "ISA", "연금저축")
  created_at, updated_at, deleted_at
)
UNIQUE (user_id, etf_code, account_label)  -- 같은 계좌 라벨 안에서는 한 ETF 1줄

-- 가격 알림
public.etf_price_alerts (
  id uuid pk,
  user_id uuid references users(id) on delete cascade,
  etf_code text not null,
  alert_type text check (alert_type in ('target_price', 'change_pct')),
  threshold numeric not null,    -- target_price: 절대 가격 / change_pct: 0.05 = ±5%
  direction text check (direction in ('above', 'below')),  -- target_price에만 의미
  is_active bool default true,
  triggered_at timestamptz,      -- null = 미발동, 발동 시 timestamp + is_active=false
  created_at, updated_at, deleted_at
)

-- 증시 캘린더 이벤트
public.market_events (
  id uuid pk,
  date date not null,
  event_type text check (event_type in ('fomc', 'cpi', 'gdp', 'pmi', 'rate_decision', 'dividend_ex', 'earnings', 'etc')),
  title text not null,            -- 예: "FOMC 금리 결정"
  description text,
  related_etf_code text,         -- dividend_ex 같은 경우 어느 ETF
  region text default 'kr',      -- 'kr' | 'us' | 'global'
  importance text default 'medium' check (importance in ('low', 'medium', 'high')),
  created_by uuid references users(id),  -- admin
  created_at, deleted_at
)
CREATE INDEX market_events_date_idx ON public.market_events (date);

-- AI ETF 요약 (캐시)
public.ai_etf_summaries (
  id uuid pk,
  etf_code text not null,
  summary_type text check (summary_type in ('overview', 'risk', 'outlook')),
  content text not null,          -- 5줄 요약 (한국어)
  source_data jsonb,              -- AI 생성 시 사용된 입력 데이터 (재현용)
  generated_at timestamptz default now(),
  expires_at timestamptz,         -- TTL (24h-7d)
  created_by_model text default 'gpt-4o-mini'
)
UNIQUE (etf_code, summary_type)  -- 한 ETF당 한 type 1개만 (최신)
```

**RLS:**
- `etf_holdings`, `etf_price_alerts`: 본인 것만 select/insert/update/delete
- `market_events`: 누구나 select, admin만 insert/update/delete
- `ai_etf_summaries`: 누구나 select, 시스템만 write (service role)

---

## 3. 탭 2 — 내 포트폴리오 (`/etf?tab=portfolio`)

### 3-1. 비로그인 상태
```
[큰 일러스트 + 카피]
"내 ETF 포트폴리오를 한눈에 관리해보세요"

· 보유 ETF 수기 입력
· 자산 합계와 비중 자동 계산
· 월별 배당금 예상까지

[로그인하고 시작하기] (primary CTA)
```

### 3-2. 로그인 상태, 보유 0개 (empty state)
```
[큰 +] 첫 ETF를 추가해보세요

[ETF 추가 +] 버튼 → 모달
```

### 3-3. 로그인 상태, 보유 있음 (메인 화면)

**상단 카드 (도미노 "총 자산" 모티브):**
```
[총 자산]
12,345,678 원
+1,234,567 (+11.1%) 총 수익

[추이 그래프, 1M/3M/6M/1Y/All 토글]
```

**자산 비중 (도넛 차트):**
```
[종목별 / 유형별 / 계좌별] 토글

[도넛 차트]
TIGER S&P500   40.5%
KODEX 200      30.2%
TIGER 미국나스닥 20.1%
ACE 배당다우존스 9.2%
```

**보유 종목 리스트 (a-ha 모티브 무카드 + 디바이더):**
```
TIGER S&P500
360750 · 미국주식
20,185원  +0.86%
보유 100주 · 평단 19,500원
평가액 2,018,500원 · 수익 +68,500 (+3.5%)
[편집] [삭제]

(디바이더)

KODEX 200
...
```

**보유 추가 모달:**
- ETF 검색 (자동완성, etfs 테이블에서 lookup)
- 수량 (numeric input)
- 평균단가 (numeric input)
- 계좌 라벨 (선택, "ISA", "연금저축", "일반" 또는 직접 입력)
- 저장

### 3-4. 배당 캘린더 (포트폴리오 탭 하단 통합)

```
[연간 예상 배당금]
275,379 원
투자 비중 5.9%

[월별 막대 차트]
1월 ▁ 2월 ▂ 3월 ▃ 4월 ▁ 5월 ▆ 6월 ▃ ...
(보유 ETF × 분배금 데이터)
```

→ 보유 ETF별 분배금 일정과 1주당 분배금을 곱해서 월별 합계.

---

## 4. 탭 3 — 알림·캘린더 (`/etf?tab=alerts`)

### 4-1. 가격 알림 (상단)

```
[알림 추가 +]

내 알림 (5)
─────────────────────────
TIGER S&P500
  목표가 21,000원 (현재 20,185, +4.0%까지)
  [활성] [비활성으로]

KODEX 200
  급등락 ±5%
  [활성]
─────────────────────────
```

**알림 추가 모달:**
- ETF 검색
- 알림 유형: 목표가 도달 / 일간 ±X% 변동
- 임계값 입력
- 방향 (target_price): 위로 도달 / 아래로 도달
- 저장

**알림 발송 (cron):**
- 매일 시세 데이터 fetch
- 활성 알림 모두 체크
- 발동 조건 만족 시 → `triggered_at` 기록 + is_active=false
- 알림 전송 채널 v1: 인앱 알림 (헤더 벨 아이콘 카운트 +1)
- v2: 이메일, 웹푸시

### 4-2. 증시 캘린더 (하단)

```
[월 토글] ← 2026.5 →
[지역 토글] 전체 / 한국 / 미국 / 글로벌

[달력 또는 리스트 뷰]
5/10  FOMC 금리 결정 (US, ⭐⭐⭐)
5/15  TIGER S&P500 분배락 (⭐⭐)
5/18  CPI 발표 (US, ⭐⭐⭐)
...
```

**필터:** 보유 ETF 관련만 보기 토글 → `etf_holdings` × `market_events.related_etf_code` 필터

**Admin 추가:** `/admin/market-events` (admin v2 일부) — 운영자가 수동 입력

---

## 5. 탭 4 — AI 인사이트 (`/etf?tab=ai`)

### 5-1. 시장 동향 (상단, 매일 자동 갱신)

```
[오늘의 ETF 시장 5줄 요약]
· 미국 증시 사상 최고가 근처에서 변동성 확대
· FOMC 앞두고 채권 ETF로 자금 이동
· 반도체 ETF는 엔비디아 실적 발표 대기
· 국내 코스피 ETF 외국인 매도 6일 연속
· 배당 ETF 안정적 흐름 유지

생성: 5월 10일 06:00 | 모델: gpt-4o-mini
```

### 5-2. ETF별 AI 요약 (보유 ETF 또는 검색한 ETF)

ETF 카드 클릭 → AI 인사이트 모달 또는 카드 펼침:
```
[TIGER S&P500 AI 요약]

📊 개요
미국 S&P500 지수 추종 ETF로 ...

⚠️ 리스크
환율 변동에 따른 환차익/손, 미국 금리 인상기 부담 ...

🔭 전망
중장기 적립식 매수에 적합, 단기 변동성 유의 ...

생성: 5월 10일 | 24시간 캐시
```

### 5-3. AI 생성 비용 관리

- ETF별 요약: `ai_etf_summaries`에 캐시 (24h TTL)
- 시장 동향: 매일 1회 cron (8시간 TTL)
- 모델: `gpt-4o-mini` (저렴, 충분)
- 요청당 ~$0.001 → 월 100개 ETF × 1회 + 시장 30회 = ~$0.13/월
- 사용자가 "다시 생성" 버튼 누르면 캐시 무시 (rate limit: 사용자당 일 5회)

---

## 6. 작업 Phase

### Phase A — 데이터·기초 (Codex)
- [ ] `docs/migration_etf_v2.sql` 작성 (4 테이블 + RLS + 인덱스)
- [ ] `lib/etfPortfolio.ts` — 보유/알림 CRUD 헬퍼
- [ ] `lib/marketEvents.ts` — 캘린더 fetch
- [ ] `lib/aiSummaries.ts` — AI 요약 fetch + cache check

### Phase B — IA 변경 (Codex)
- [ ] `/etf` 페이지에 탭 4개 도입 (기존을 "둘러보기"로)
- [ ] URL 쿼리(`?tab=`) 동기화, 새로고침/딥링크 OK
- [ ] 탭 컴포넌트 a-ha "인기/관심/답변" 패턴 모티브

### Phase C — 포트폴리오 탭 (Codex, 가장 큰 작업)
- [ ] `<EtfPortfolio />` 컨테이너
- [ ] `<HoldingAddModal />` (ETF 검색 자동완성)
- [ ] `<TotalAssetCard />` 추이 그래프 + 시간 토글 (recharts 또는 자체 SVG)
- [ ] `<AllocationDonut />` 도넛 차트 + 종목/유형/계좌 토글
- [ ] `<HoldingList />` a-ha 무카드 리스트
- [ ] `<DividendCalendar />` 월별 막대 차트
- [ ] 시세 가져오기: `lib/etf-live-data.ts` (이미 있음 — DATA_GO_KR API)

### Phase D — 알림·캘린더 탭 (Codex)
- [ ] `<AlertList />` + `<AlertAddModal />`
- [ ] `<MarketCalendar />` 월 뷰 또는 리스트 뷰
- [ ] `app/api/cron/check-alerts/route.ts` — 매일 시세 체크 → 발동된 알림 처리
- [ ] `vercel.json` cron 추가 (daily 09:00 KST)
- [ ] 헤더 벨 아이콘에 안 읽은 알림 카운트
- [ ] `/admin/market-events` — 운영자 입력 폼 (admin v2 일부)

### Phase E — AI 인사이트 탭 (Codex)
- [ ] OpenAI API 환경변수 (`OPENAI_API_KEY`) — 이미 번역에서 사용 중일 가능성
- [ ] `app/api/ai/market-summary/route.ts` — 시장 동향 5줄 생성
- [ ] `app/api/ai/etf-summary/route.ts` — ETF별 3섹션 요약
- [ ] cron: 매일 08:00 시장 동향 자동 생성
- [ ] 사용자 "다시 생성" 버튼 + rate limit (`ai_etf_summaries.generated_at` 기준 24h)
- [ ] `<MarketAIBrief />`, `<EtfAIInsight />` 컴포넌트

### Phase F — 운영 / 폴리싱
- [ ] 비로그인 empty state 카피
- [ ] 모바일 반응형 (탭 가로 스크롤, 도넛 사이즈 축소)
- [ ] 헤더 벨 아이콘 = 알림 + 시장 캘린더 통합 (드롭다운)
- [ ] sitemap에 `/etf?tab=*` URL은 추가 X (개인 데이터)

---

## 7. 마이그레이션 실행 (예호님)

각 Phase 끝나면 Codex가 만든 마이그레이션 SQL을 Supabase에 실행:
- Phase A 후: `migration_etf_v2.sql` (4 테이블)
- Phase D 후: market_events 시드 데이터 (2026 FOMC·CPI·주요 ETF 분배락일)

---

## 8. 환경변수 추가

```env
# 이미 있을 가능성 — 확인 필요
OPENAI_API_KEY=sk-...

# AI 호출 모델 (옵션, 미설정 시 gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini

# 이미 있음
DATA_GO_KR_SERVICE_KEY=...
```

---

## 9. 도미노 vs 우리 차이점 (정직하게)

**도미노에 있는데 우리는 못 함:**
- ❌ 자동 계좌 연동 (마이데이터 라이선스 필요)
- ❌ 나스닥 실시간 시세 (라이선스 월 수백만)
- ❌ 펀드·채권·부동산 통합 (별도 데이터)
- ❌ 보안 인증 (Face ID 등 — 네이티브 앱만)

**우리가 도미노스러운 부분:**
- ✅ 수동 포트폴리오 입력 → 자산 합계/비중/배당
- ✅ 가격 알림 + 캘린더
- ✅ AI 5줄 요약
- ✅ 깔끔한 도넛 + 막대 차트

→ "도미노 라이트, ETF 전용" 느낌이 솔직한 포지션. 사용자 카피도 그렇게.

---

## 10. 검증 기준

- [ ] 비로그인 `/etf?tab=portfolio` → empty CTA
- [ ] 로그인 + 보유 0 → "첫 ETF 추가" CTA
- [ ] ETF 추가 → 즉시 합계/비중/리스트 갱신
- [ ] 보유 ETF 가격 변동 시 평가액 자동 재계산
- [ ] 알림 추가 → cron 동작 후 발동 확인 (테스트용 임계값 낮게)
- [ ] 캘린더에서 보유 ETF 분배락일만 필터링 동작
- [ ] AI 인사이트 첫 호출 후 24h 동안 캐시 사용
- [ ] 모바일: 탭 가로 스크롤, 도넛/막대 차트 정상

---

## 작업 로그
- 2026-05-10 v1: 초안 (도미노 5기능 → ETF 4탭 IA 매핑)
