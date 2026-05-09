# 피드 페이지 스펙 (한입 칼럼 + 외부 뉴스 RSS 통합)

작성: 2026-05-09
이전 명: `columns-page-spec.md` (칼럼 → 피드로 명칭 변경)
대상: GPT/Codex
참고: a-ha 잉크 (UX), hannipmoney.com (자체 칼럼), 토스증권 (외부 뉴스 자동 수집)

---

## 0. 한 줄 요약

**피드 = 한입 자체 칼럼(Ghost) + 외부 금융 뉴스(RSS)** 를 하나의 흐름으로 보여주는 통합 콘텐츠 페이지.
- 자체 칼럼은 깊이 있는 글, 외부 뉴스는 속보·정보성
- 모두 6개 카테고리(`docs/categories.md`)로 분류

라우트: `we.hannipmoney.com/feed`

---

## 1. 명칭 변경 (전역)

| 이전 | 신규 |
|---|---|
| 칼럼 (Column) | 피드 (Feed) |
| `/columns` | `/feed` |
| `<ColumnCard />` | `<FeedCard />` (또는 source별 분리) |
| `column.hannipmoney.com` | (폐기 — `we.hannipmoney.com/feed`로 통합) |
| 네비게이션 메뉴 "칼럼" | "피드" |

> ⚠️ 단, 한입 자체 콘텐츠를 **내부적으로** "칼럼"이라고 부르는 건 OK (DB 필드명, Ghost 태그 등). UI 노출 라벨만 "피드".

---

## 2. 콘텐츠 소스 두 종류

### 2-1. 한입 칼럼 (Ghost CMS)
- 출처: `hannipmoney.com` (Ghost)
- 수집: Ghost RSS `https://www.hannipmoney.com/rss/` (v2 구현)
- 특징: 깊이 있는 자체 작성 글, 한입 브랜드
- 클릭: 자체 페이지(`we.hannipmoney.com/feed/[slug]`)에서 본문 렌더

### 2-2. 외부 뉴스 (RSS, 신규)
- 출처: 매일경제, 한국경제, 이데일리, 연합뉴스 등 한국 금융 RSS
- 수집: Vercel Cron (Hobby 플랜은 daily) → Supabase 저장
- 특징: 속보·시황·기업 뉴스, 자체 작성 X
- 클릭: **외부 사이트로 이동** (저작권 보호) — 자체 페이지에서 본문 렌더 X

---

## 3. 외부 뉴스 RSS 시스템 (신규)

### 3-1. RSS 소스 후보

| 매체 | RSS URL (예상) | 특징 |
|---|---|---|
| 매일경제 증권 | `https://www.mk.co.kr/rss/50200011/` | 증시 종합 |
| 한국경제 증시 | `https://www.hankyung.com/feed/finance` | 증시·기업 |
| 이데일리 증권 | `https://rss.edaily.co.kr/stock_news.xml` | 시황 |
| 연합뉴스 경제 | `https://www.yna.co.kr/rss/economy.xml` | 경제 일반 |

→ 운영 전 각 매체 RSS 사용 약관 확인 필수. 일부 매체는 상업적 사용 제한.
→ 처음에는 2-3개 소스로 시작 → 카테고리 분포 보면서 점진 추가.
→ 머니투데이 `https://rss.mt.co.kr/mt_stock.xml`은 2026-05-09 기준 404라 운영 소스에서 제외.

### 3-2. 데이터 모델 (Supabase)

```sql
public.news_items
  - id uuid pk
  - source text         -- '매일경제', '한국경제' 등 매체명
  - title text not null
  - summary text        -- RSS의 description (200자 이내)
  - url text unique     -- 원문 URL (중복 수집 방지)
  - thumbnail_url text  -- enclosure 또는 OG 이미지
  - category text       -- 6개 중 하나로 자동 매핑
  - published_at timestamp
  - fetched_at timestamp default now()
  - click_count int default 0  -- 외부 이동 추적

CREATE INDEX news_items_published_at_idx ON public.news_items(published_at DESC);
CREATE INDEX news_items_category_idx ON public.news_items(category);
```

### 3-3. 카테고리 자동 매핑 전략

**규칙 기반 (1차, 단순):**
```ts
const RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['ETF', 'KODEX', 'TIGER', '코스피', '코스닥', '국내주식'],
    category: '국내주식·ETF' },
  { keywords: ['QQQ', 'VOO', 'SPY', '나스닥', 'S&P', '미국주식', '엔비디아', '테슬라'],
    category: '해외주식·ETF' },
  { keywords: ['절세', '세금', '연말정산', '양도세', 'ISA', '연금저축', 'IRP'],
    category: '절세' },
  { keywords: ['보험', '실손', '연금보험', '종신', '암보험'],
    category: '보험' },
  { keywords: ['대출', '부채', '금리', '주담대', '신용대출', '전세대출'],
    category: '대출·부채' },
  // 매칭 안되면 fallback
]

function classify(title: string, summary: string): string {
  const text = `${title} ${summary}`
  for (const rule of RULES) {
    if (rule.keywords.some(k => text.includes(k))) return rule.category
  }
  return '재테크입문'
}
```

→ 향후 정확도 필요하면 LLM 분류로 업그레이드 가능 (글당 ~$0.001 — 시간당 100개 수집해도 월 ~$2). 일단 규칙 기반.

### 3-4. 수집 워크플로우 (Vercel Cron)

```
[Vercel Cron, daily on Hobby / hourly on Pro]
       │
       ▼
[/api/cron/fetch-news]
       │
       ├─ 각 RSS URL fetch (lib/rss.ts 내부 파서)
       ├─ 새 item만 필터 (url unique 체크)
       ├─ classify() 카테고리 매핑
       └─ Supabase news_items insert (upsert with onConflict: 'url')
```

**Vercel Cron 설정 (`vercel.json`):**
```json
{
  "crons": [
    { "path": "/api/cron/fetch-news", "schedule": "0 0 * * *" }
  ]
}
```

**API route (`app/api/cron/fetch-news/route.ts`):**
```ts
import { createClient } from '@supabase/supabase-js'
import { parseRss } from '@/lib/rss'

export async function GET(req: Request) {
  // Cron 보안: Vercel이 보내는 요청만 허용
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false }, { status: 401 })
  }

  const supabase = createClient(/* service role */)

  const SOURCES = [
    { name: '매일경제', url: 'https://www.mk.co.kr/rss/50200011/' },
    // ...
  ]

  let total = 0
  for (const src of SOURCES) {
    const response = await fetch(src.url)
    const feed = response.ok ? parseRss(await response.text()) : []
    if (!feed) continue
    for (const item of feed) {
      const category = classify(item.title || '', item.contentSnippet || '')
      const { error } = await supabase.from('news_items').upsert({
        source: src.name,
        title: item.title,
        summary: item.contentSnippet?.slice(0, 200),
        url: item.link,
        thumbnail_url: item.enclosure?.url,
        category,
        published_at: item.pubDate,
      }, { onConflict: 'url', ignoreDuplicates: true })
      if (!error) total++
    }
  }

  return Response.json({ ok: true, inserted: total })
}
```

### 3-5. 저작권 안전선 (반드시 준수)

✅ **허용:**
- 제목 노출
- 요약 200자 이내
- 썸네일 (RSS의 enclosure 또는 OG 이미지)
- 출처 매체명 명시 (`[매일경제]`)
- 클릭 시 외부 사이트로 이동

❌ **금지:**
- 본문 전체 자체 노출 (저작권 침해)
- 출처 미표기
- 외부 이동 없이 자체 페이지에 본문 박기

→ 토스증권·네이버금융도 이 패턴 (제목·요약·썸네일만 표기, 본문은 외부).

---

## 4. 피드 페이지 UI

### 4-1. 페이지 구조 (`/feed`)
```
[글로벌 헤더]
─────────────────────────────────
        피드
        재테크 인사이트와 시장 소식, 한 흐름에서
─────────────────────────────────
[소스 토글]   [전체] [한입 칼럼] [뉴스]
[카테고리]    [전체] [재테크입문] [국내주식·ETF] [해외주식·ETF] [절세] [보험] [대출·부채]
─────────────────────────────────
[혼합 피드 카드 리스트, 시간순]
  ├ <ColumnFeedCard />     (한입 칼럼)
  └ <NewsFeedCard />       (외부 뉴스)
─────────────────────────────────
[무한 스크롤]
```

### 4-2. 카드 디자인 (a-ha 모티브 — 좌측 정사각 썸네일, 사용자 결정)

**`<ColumnFeedCard />` (한입 칼럼)**
```
┌──────────────────────────────────────┐
│ ┌────┐                                │
│ │썸네 │  NEW   국내주식·ETF            │
│ │일정 │  칼럼 제목 (1-2줄, 18 / 700)    │
│ │사각 │  본문 발췌 (1-2줄, 14 / 400)   │
│ │160  │  🦊 에디터 한입이 · 3시간 전    │
│ │px   │  ♥ 12  💬 5  👁 234            │
│ └────┘                                │
└──────────────────────────────────────┘
(카드 사이: 1px 회색 디바이더)
```

**`<NewsFeedCard />` (외부 뉴스, 시각적 구분)**
```
┌──────────────────────────────────────┐
│ ┌────┐                                │
│ │썸네 │  [매일경제]  국내주식·ETF  ↗  │
│ │일정 │  뉴스 제목 (1-2줄, 18 / 700)   │
│ │사각 │  RSS 요약 (1-2줄, 14 / 400)    │
│ │160  │  30분 전              👁 1.2k  │
│ │px   │                                │
│ └────┘                                │
└──────────────────────────────────────┘
```

**카드 스펙 (ui-principles v2.2 모티브):**
- 카드 자체: bg/border/shadow 모두 없음
- padding: 24px 0 (좌우 0, 위아래 24)
- 사이 디바이더: `border-bottom: 1px solid #e5e8eb` (gray-200)
- 호버: `background: rgba(0,0,0,0.02)` 살짝 어둡게
- 썸네일: 정사각 160x160px, 좌측, radius 8px, object-fit: cover
- 썸네일 우측 콘텐츠: padding-left 16-20px
- NEW 뱃지: 빨간 배경(#fff0f0) + red-600(#e52a39) 텍스트 + radius 4 + padding 2px 6px / 12px / 600
- 카테고리 라벨: 12-13px / 600 / gray-700
- 외부 ↗ 아이콘: 우상단 (NewsFeedCard만)
- 메타: 14px / 400 / gray-600

**모바일:**
- 썸네일 정사각 유지하되 96-120px로 축소
- 콘텐츠 영역 줄어들지만 제목 2줄 우선

→ 두 카드 시각 구분: 외부 뉴스는 [매체명] 라벨 + ↗ 아이콘 + "원문 보기" 마이크로카피

### 4-3. 소스 토글
- `[전체]` 디폴트 — 두 소스 시간순 혼합
- `[한입 칼럼]` — Ghost만
- `[뉴스]` — RSS만

URL 쿼리: `/feed?source=column&category=국내주식·ETF`

### 4-4. 클릭 동작

| 카드 종류 | 클릭 시 |
|---|---|
| ColumnFeedCard | 자체 페이지 `/feed/[slug]` 이동 |
| NewsFeedCard | `/api/feed/news-click?url=...` 경유 후 **외부 사이트 새 창** (`target="_blank" rel="noopener noreferrer"`) + click_count 증가 |

---

## 5. 자체 칼럼 상세 (`/feed/[slug]`)

Ghost RSS 본문 prose 렌더, 좋아요·저장·공유 액션, cross-link 추천 (같은 카테고리 다른 글 + 같은 카테고리 외부 뉴스 5개도 옆에 노출).

기존 `/columns/[slug]` 인덱싱된 URL이 있다면 301 리다이렉트로 `/feed/[slug]` 이전.

canonical: `https://we.hannipmoney.com/feed/[slug]`

---

## 6. 데스크탑 vs 모바일

| 요소 | 데스크탑 | 모바일 |
|---|---|---|
| 페이지 max-width | 720px | 풀너비 |
| 소스 토글 + 카테고리 | 한 줄 또는 2줄 | 가로 스크롤 |
| 카드 그리드 | 1열 | 1열 |
| 글쓰기 CTA | 우측 상단 (admin only) | 하단 탭바 가운데 FAB |

---

## 7. GPT/Codex 작업 체크리스트

### Phase A — 명칭 마이그레이션 (칼럼 → 피드)
- [x] 라우트 `/columns/*` → `/feed/*` 변경 + 301 리다이렉트 (기존 인덱싱 보호)
- [x] 네비게이션 라벨 "칼럼" → "피드"
- [ ] 컴포넌트 네이밍 통일 (`ColumnCard` → `ColumnFeedCard`)
- [x] Ghost RSS fetch 연결 (`lib/feed.ts` + `lib/rss.ts`)

### Phase B — RSS 시스템 신설
- [x] Supabase `news_items` 테이블 마이그레이션 SQL (`docs/migration_news_items.sql`)
- [x] `lib/rss.ts` — 공용 RSS parser/sanitizer
- [x] 키워드 기반 카테고리 자동 매핑 (`lib/feed.ts`)
- [x] `app/api/cron/fetch-news/route.ts` — Vercel Cron 엔드포인트
- [x] `vercel.json` cron 설정 + `CRON_SECRET` env 추가
- [ ] (예호) RSS 소스 매체별 사용 약관 확인 후 SOURCES 배열 확정
- [ ] (예호/Codex) Supabase SQL Editor에서 `docs/migration_news_items.sql` 실행

### Phase C — 통합 피드 UI
- [x] `app/feed/page.tsx` — Ghost + Supabase news_items 통합 fetch, 시간순 merge
- [x] `<ColumnFeedCard />`, `<NewsFeedCard />` 시각 구분
- [x] 카테고리 칩 (6개)
- [ ] 무한 스크롤
- [x] 외부 뉴스 클릭 시 click_count 증가 + 새 창

### Phase D — 운영
- [ ] RSS 수집 실패 시 슬랙 알림 (Webhook)
- [ ] 카테고리 매핑 정확도 점검 (운영 1주 후, 슬프지만 수동으로라도)
- [ ] 사용자 피드백 기반 키워드 룰 보강

---

## 8. 절대 하지 말 것
- 외부 뉴스 본문을 자체 페이지에 fully render (저작권 위반)
- 출처 표기 누락
- 외부 뉴스에 자체 좋아요·댓글 (자체 콘텐츠 오인 + 저작권 모호)
- RSS 수집 실패해도 피드 전체 fallback 안 함 (Ghost 칼럼만이라도 노출)
- 전체 RSS 수집을 클라이언트 사이드에서 (CORS·성능·보안 문제)

---

## 9. 검증 기준
1. `/feed`에서 한입 칼럼과 외부 뉴스가 시간순 혼합되어 노출
2. 두 카드가 시각적으로 구분됨 (출처 라벨 + 외부 아이콘)
3. 카테고리 필터로 6개 정확히 분류됨
4. 외부 뉴스 클릭 시 새 창 + click_count 증가
5. Vercel Cron이 daily 정상 동작 (Supabase에 새 레코드 쌓임, Pro 전환 시 hourly 가능)
6. 카테고리 자동 매핑 정확도 80%↑ (운영 1주 후 측정)
7. 기존 `/columns/...` 접근 시 `/feed/...` 로 301 리다이렉트

---

## 작업 로그
- 2026-05-09 v1: 칼럼 페이지 스펙 (Ghost 단일 소스)
- 2026-05-09 v2: **피드로 명칭 변경 + 외부 뉴스 RSS 시스템 추가** (토스증권 패턴 반영)
- 2026-05-09 v2 구현: Ghost RSS 실연동, 공용 RSS 파서, 뉴스 클릭 추적 라우트 추가. Supabase `news_items` 테이블 생성은 남음.
