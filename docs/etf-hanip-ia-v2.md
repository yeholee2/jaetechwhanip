# ETF한입 IA v2 — 통합 재구성

작성: 2026-05-11
대상: GPT/Codex (구현 분해용)
이전: ia-redesign.md (재테크한입 a-ha 모티브)
변경 사유: 분절 문제 해소 + ETF 중심 피봇 + 앱 호환 네비

---

## 0. 큰 결정 사항 (예호 확정)

1. **브랜드 라벨:** "재테크한입" → "**ETF한입**" (UI 라벨만, 도메인 `hannipmoney.com` 유지)
2. **펀드:** 추후 (ETF·펀드 통합 페이지는 v3에서)
3. **PWA:** 추후 (IA 통합 후 마지막 단계)
4. **하단 탭바:** 4개 + 가운데 FAB (5위치)
5. **피드 통합:** 질문 + 뉴스 + 리포트 + 칼럼 한 곳

---

## 1. 새 IA

### 모바일 하단 탭바 (앱 호환)
```
[🏠 홈] [📊 ETF] [💬 피드 FAB] [🥊 스파링] [👤 마이]
                       ↑ 가운데 큰 원형 FAB
```

### 데스크탑 헤더
```
[ETF한입]  홈  ETF  피드  스파링      🔍 🔔 👤
```

### 페이지별 역할

| 페이지 | URL | 역할 |
|---|---|---|
| 홈 | `/` | **큐레이션** — 오늘의 ETF / 핫 스파링 / 인기 피드 / 최근 칼럼 |
| ETF | `/etf` | ETF 정보 + 포트폴리오 (도미노 + RW + FunETF 모티브) |
| 피드 (FAB) | `/feed` | **질문 + 뉴스·리포트·칼럼 통합** |
| 스파링 | `/sparring` | ETF/테마 비교 토론 (반도체 vs 로봇 등) |
| 마이 | `/me` 또는 `/u/[id]` | 내 활동·포트폴리오·관심 |

---

## 2. 피드 (`/feed`) 상세

핵심: 사용자 의견(질문) + 외부 정보(뉴스·리포트) + 자체 콘텐츠(칼럼)를 **한 흐름**에 보여줌.

### 페이지 구조

```
[헤더] ETF한입
[페이지 제목] 피드

[탭] 전체 / 질문 / 뉴스

[카테고리 칩] 전체 / 재테크입문 / 국내주식·ETF / 해외주식·ETF / 절세 / 보험 / 대출·부채

[혼합 피드 카드, 시간순]
  ├ <FeedCardQuestion />      🦊 질문
  ├ <FeedCardNews />          📰 뉴스 (외부)
  ├ <FeedCardReport />        📊 리포트 (증권사 분석)
  └ <FeedCardArticle />       ✍️ 칼럼 (한입 자체)

[무한 스크롤]
```

### 카드 배지 (한 눈에 종류 구분)

| 종류 | 배지 | 색 | 클릭 |
|---|---|---|---|
| 질문 | 🦊 질문 | gray | 자체 페이지 `/q/[slug]` |
| 뉴스 | 📰 뉴스 | blue | 외부 사이트 새 창 + click_count |
| 리포트 | 📊 리포트 | orange | 외부 사이트 새 창 |
| 칼럼 | ✍️ 칼럼 | green | 자체 페이지 `/articles/[slug]` |

→ 한 화면에 4종 섞여있어도 시각 구분 명확.

### SEO 자체 URL

| 콘텐츠 | URL | 인덱싱 |
|---|---|---|
| 질문 | `/q/[slug]` | ✅ 자체 |
| 뉴스 | (외부 URL) | ❌ (외부 사이트 인덱싱) |
| 리포트 | (외부 URL) | ❌ |
| 칼럼 | `/articles/[slug]` | ✅ 자체 (Ghost) |

→ 피드는 통합 진입점, 각 콘텐츠는 자체 URL 유지.

### 데이터 소스

```sql
-- 질문: 기존 public.questions
-- 뉴스: public.news_items (이미 spec 있음 - feed-page-spec.md §3-2)
-- 리포트: public.reports (신규)
-- 칼럼: Ghost API
```

신규 `reports` 테이블:
```sql
public.reports (
  id, source ('미래에셋','한국투자','삼성증권' 등),
  title, summary, url unique, thumbnail_url, category, published_at,
  click_count, fetched_at
)
```

---

## 3. 홈 (`/`) 상세

### 역할
**큐레이션 진입점.** 사용자가 처음 접하는 곳, 각 영역의 핫한 거 모음 → 클릭하면 해당 페이지로.

### 페이지 구조

```
[헤더] ETF한입 + 부제

[Hero 카드] 오늘의 ETF (큰 카드, TIGER S&P500 등 1개)

[섹션 1] 🔥 지금 뜨거운 스파링
  - 진행중 스파링 1-2개 (큰 카드)
  → "더 보기" → /sparring

[섹션 2] 💬 인기 질문 (피드에서 질문 카테고리 5개)
  → "더 보기" → /feed?tab=q

[섹션 3] 📰 최신 ETF 뉴스 (5개)
  → "더 보기" → /feed?tab=news

[섹션 4] ✍️ 한입 칼럼 추천 3개
  → "더 보기" → /feed?cat=articles

[섹션 5] 📊 시장 지수 (코스피·S&P500·나스닥)

[모바일 하단탭 sticky]
```

→ 한 화면에서 모든 영역 진입 가능. **분절 해소 핵심.**

---

## 4. ETF (`/etf`) — 기존 그대로 유지

이미 작업 중 (RW 모티브 + 도미노 포트폴리오). 추가:
- 우상단 상태 아이콘들 ETF한입 브랜드 일관성 (현재 그대로)
- 하단에 "ETF 관련 핫 스파링" 위젯 (분절 해소)
- 하단에 "최근 한입 칼럼 3개" 위젯
- ETF 상세에 관련 질문·스파링·칼럼 카드

자세한 컴포넌트는 `etf-portfolio-spec.md` 참조.

---

## 5. 스파링 (`/sparring`) — ETF 비교 모드 강화

기존 `sparring-engagement-spec.md` + 추가:

### 새 토픽 패턴 (ETF 위주)
- "TIGER vs KODEX S&P500"
- "반도체 ETF vs 로봇 ETF"
- "환헤지 vs 언헤지"
- "월배당 vs 성장형"
- "ISA에 채울 ETF?"

### admin/sparring에 ETF 비교 모드 추가
```
유형:
  ( ) 일반 (텍스트 라벨)
  (●) ETF 비교 ⭐
       A ETF: [코드 입력] 360750
       B ETF: [코드 입력] 091160
```

ETF 비교 모드 시:
- 양 사이드 카드에 ETF 정보 자동 노출 (가격·보수·분배금)
- 사용자가 보면서 투표

DB 추가:
```sql
ALTER TABLE public.sparrings ADD COLUMN
  etf_a_code text, etf_b_code text;  -- 비교 모드일 때만 사용
```

---

## 6. 마이 (`/me`)

기존 `pages-polish-spec.md` §v1-A 마이페이지. 추가:
- 내 ETF 포트폴리오 진입 (← `/etf` 로그인 시 도미노 화면)
- 내 질문·답변·스파링 참여 활동
- 관심 ETF (북마크 — Phase D에서)

---

## 7. 분절 해소 — 핵심 메커니즘

### ETF 코드를 모든 콘텐츠에 태깅

| 콘텐츠 | 태깅 필드 |
|---|---|
| 질문 | `questions.etf_codes text[]` (이미 tags 있음, ETF 코드 매핑) |
| 스파링 | `sparrings.etf_a_code`, `etf_b_code` |
| 뉴스 | `news_items.related_etf_codes text[]` (or 카테고리 매핑) |
| 리포트 | `reports.related_etf_codes text[]` |
| 칼럼 | Ghost 태그 = ETF 코드 (예: `tag:360750`) |

### 헬퍼 `lib/relatedContent.ts`

```ts
export async function getRelatedByEtf(
  etfCode: string,
  types: ('q' | 'sparring' | 'news' | 'article')[],
  limit = 3
): Promise<RelatedItem[]>
```

### 공통 컴포넌트 `<RelatedContent />`

각 상세 페이지 하단에 박음:
```tsx
<RelatedContent etfCodes={['360750']} types={['q','sparring','article']} />
```

결과:
```
이 ETF 관련
├ [질문 3개]
├ [스파링 2개]
└ [칼럼 3개]
```

---

## 8. 브랜드 라벨 변경

- 로고: "재테크<em>한입</em>" → "ETF<em>한입</em>"
- meta title: 모든 페이지 "ETF한입" 사용
- OG 카피: ETF 중심 ("ETF 자산을 한입에")
- 도메인: `hannipmoney.com` 유지 (변경 X)

### 변경 위치
- `components/AppShell.tsx` 로고 텍스트
- `components/HomeClient.tsx` 로고
- `app/q/[slug]/QuestionClient.tsx` 로고
- 그 외 로고 박힌 곳 grep으로 찾아 변경

---

## 9. 작업 분해 (Phase 순서)

### Phase 1 — AppShell 재구성 (가장 영향 큼)
- [ ] 모바일 하단탭 5탭 + 가운데 FAB (홈/ETF/피드/스파링/마이)
- [ ] 데스크탑 헤더 4메뉴 (홈/ETF/피드/스파링) + 우측 검색·알림·마이
- [ ] 로고 "ETF한입"으로 변경

### Phase 2 — /feed 재구성
- [ ] 페이지: 탭 (전체/질문/뉴스) + 카테고리 필터
- [ ] 카드 4종 (질문·뉴스·리포트·칼럼) + 배지
- [ ] 시간순 통합 fetch (`lib/feed.ts` 갱신)
- [ ] /articles, /q는 자체 URL 유지 (피드는 진입점)

### Phase 3 — 홈 재구성 (큐레이션 모드)
- [ ] Hero 카드 (오늘의 ETF)
- [ ] 핫 스파링 섹션
- [ ] 인기 질문 섹션
- [ ] 최신 뉴스 섹션
- [ ] 한입 칼럼 추천 섹션
- [ ] 시장 지수 미니

### Phase 4 — 분절 해소 (관련 콘텐츠)
- [ ] `lib/relatedContent.ts` 헬퍼
- [ ] `<RelatedContent />` 공통 컴포넌트
- [ ] 모든 상세 페이지 하단에 박기 (ETF/스파링/질문/칼럼)

### Phase 5 — 스파링 ETF 비교 모드
- [ ] DB: `sparrings.etf_a_code`, `etf_b_code` 추가
- [ ] admin/sparring 폼에 ETF 비교 모드 토글
- [ ] 스파링 상세 양 사이드 ETF 카드 (가격·보수·분배 노출)

### Phase 6 (선택) — 리포트 시스템
- [ ] DB: `public.reports` 테이블
- [ ] 증권사 리포트 RSS 수집 (cron)
- [ ] /feed에 리포트 탭 통합

### Phase 7 (추후) — 펀드 추가
- [ ] /etf 페이지에 펀드 탭 추가
- [ ] 펀드 데이터 소스 (KOFIA 등)
- [ ] 펀드 상세 페이지

### Phase 8 (추후) — PWA
- [ ] `public/manifest.json` 추가
- [ ] 서비스 워커 (오프라인 캐시)
- [ ] 아이콘 셋
- [ ] iOS/Android 메타

---

## 10. 검증 기준

### Phase 1-4 완료 시점
- [ ] 모바일에서 하단 탭바 5탭 정상 표시 + 가운데 FAB 강조
- [ ] 홈 → 클릭으로 각 영역 진입 OK
- [ ] /feed에서 질문·뉴스·칼럼 한 화면 통합
- [ ] ETF 상세 페이지 하단에 "이 ETF 관련 질문·스파링·칼럼" 노출
- [ ] 스파링 상세 양 사이드에 ETF 카드 (비교 모드)
- [ ] 모든 페이지 로고 "ETF한입"

### Phase 5-6 완료 시점
- [ ] 스파링 admin에서 ETF 비교 모드로 라운드 생성 가능
- [ ] /feed에 리포트 탭 + 외부 클릭 추적

---

## 작업 로그
- 2026-05-11 v1: 초안 (예호 결정 5개 반영, FunETF/RW/도미노/a-ha 통합 IA, Phase 1-8 분해)
