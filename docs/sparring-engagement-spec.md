# 스파링 댓글·투표 시스템 v1 (a-ha blueprint 기반)

작성: 2026-05-09
대상: GPT/Codex (코드 구현)
참고: `docs/aha-blueprint.md` §2-2, 2-3
사용자 결정: **a-ha 패턴 그대로 따름** (단일 피드 + 사이드 뱃지)

---

## 0. 핵심 결정 (a-ha 모티브)

| 항목 | a-ha 패턴 | 우리 선택 |
|---|---|---|
| 댓글 분리 | 단일 피드 + ✅사이드 뱃지 | ✅ a-ha 그대로 |
| 투표 락 | 투표 안 하면 댓글 작성 lock | ✅ 도입 |
| 우세 의견 색 | 부정=빨강 / 긍정=파랑 | ✅ 도입 (재테크 맥락 맞춰 룰) |
| 라운드 번호 | 자동 시리얼 (215 라운드) | ✅ 도입 |
| 카운트다운 | 일/시:분:초 형식 | ✅ 도입 |
| 운영자 메모 | "아하에서 설정한 주제" | ✅ 도입 ("재테크한입에서 설정한 주제") |
| 인구통계 도넛 | 성별 통계 | 🟡 v2 (재테크는 연령대/투자 경험이 더 의미 있을 수 있음 — 추후) |

---

## 1. Supabase 스키마

```sql
-- 스파링 라운드
CREATE TABLE public.sparrings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number int GENERATED ALWAYS AS IDENTITY,  -- auto-increment
  category text NOT NULL,                          -- 6개 카테고리 SSOT
  title text NOT NULL,
  body text,                                       -- 운영자 메모 (선택)
  slug text UNIQUE NOT NULL,                       -- /sparring/[slug]
  side_a_label text NOT NULL,                      -- 예: "분할 매수 시작"
  side_b_label text NOT NULL,                      -- 예: "현금 유지"
  side_a_polarity text DEFAULT 'positive',         -- 'positive' | 'negative' (색상 결정용)
  side_b_polarity text DEFAULT 'negative',
  thumbnail_url text,                              -- 진행중 카드 일러스트 (선택)
  deadline_at timestamptz NOT NULL,
  status text DEFAULT 'active',                    -- 'active' | 'closed' | 'archived'
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  deleted_at timestamptz
);

-- 투표 (1인 1투표)
CREATE TABLE public.sparring_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sparring_id uuid REFERENCES public.sparrings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('a', 'b')),
  voted_at timestamptz DEFAULT now(),
  UNIQUE(sparring_id, user_id)
);

-- 댓글 (투표한 사용자만 작성 가능 — RLS)
CREATE TABLE public.sparring_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sparring_id uuid REFERENCES public.sparrings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('a', 'b')),  -- 작성자가 투표한 쪽
  body text NOT NULL,
  parent_id uuid REFERENCES public.sparring_comments(id),  -- 대댓글
  like_count int DEFAULT 0,
  dislike_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- 집계 view
CREATE VIEW public.sparring_stats AS
SELECT
  s.id,
  COUNT(DISTINCT v.user_id) FILTER (WHERE v.side = 'a') AS votes_a,
  COUNT(DISTINCT v.user_id) FILTER (WHERE v.side = 'b') AS votes_b,
  COUNT(DISTINCT v.user_id) AS votes_total,
  COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) AS comment_count
FROM public.sparrings s
LEFT JOIN public.sparring_votes v ON v.sparring_id = s.id
LEFT JOIN public.sparring_comments c ON c.sparring_id = s.id
GROUP BY s.id;
```

**RLS 정책 (핵심):**
```sql
-- 댓글 작성: 해당 sparring에 투표한 사용자만
CREATE POLICY "comment_only_voters" ON public.sparring_comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.sparring_votes
            WHERE sparring_id = NEW.sparring_id AND user_id = auth.uid())
    AND user_id = auth.uid()
    AND side = (SELECT side FROM public.sparring_votes
                WHERE sparring_id = NEW.sparring_id AND user_id = auth.uid())
  );

-- 투표: 1인 1번, 마감 전만
CREATE POLICY "vote_before_deadline" ON public.sparring_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.sparrings
                WHERE id = NEW.sparring_id AND status = 'active' AND deadline_at > now())
  );
```

---

## 2. 색상 룰 (우세 의견 박스)

`side_a_polarity` / `side_b_polarity` 값에 따라 자동:
- `positive` 의견 우세 → **파란색 박스** (`text-blue-600 #1e59da` / `border-blue-300 #a6c4f4` / `bg-blue-50 #f5fafe`)
- `negative` 의견 우세 → **빨간색 박스** (`text-red-600 #e52a39` / `border-red-300 #fb8990` / `bg-red-50 #fff0f0`)

**polarity 자동 추론 옵션 (admin 도구):**
운영자가 라운드 만들 때 빈 칸이면 키워드 기반 추론:
- 라벨에 `않다`, `없다`, `아니다`, `위반`, `반대`, `부적절` 포함 → `negative`
- 그 외 → `positive`

운영자가 admin 페이지에서 수동 변경 가능.

---

## 3. 페이지 구조

### 3-1. `/sparring` (목록)

**위에서 아래로:**

1. **페이지 헤더** (가운데 정렬 X, 좌측 정렬)
   - "스파링" 32px / 700 / gray-900
   - 부제 "재테크 결정, 토론으로 검증해요" 16px / 400 / gray-700 (a-ha "뜨거운 논쟁..."에서 우리 톤으로 변형)

2. **진행중 스파링 (active 카드 가로 그리드)**
   - 데스크탑: 2열 그리드 (~580x470px 카드)
   - 카드 디자인:
     ```
     [thumbnail_url 풀배경]
     ───────────────
     좌상단: "X,XXX명 투표 중" (14px / 700 / 흰색)
     좌상단: 큰 제목 (24-28px / 800 / 흰색, 2줄 클램프)
     하단 그라디언트 어둡게
     좌하단: ⏰ "3일 남았어요" (14px / 흰색)
     우하단: 📣 "참여하기" (14px / 흰색)
     ```
   - thumbnail_url 없으면 fallback: 6개 카테고리별 그라디언트 단색 + 큰 제목
   - 카드 radius: 24px (radius-3xl)

3. **"지난 스파링 N" 섹션**
   - 헤더 24px / 700
   - 카테고리 칩 (가로 스크롤): 전체 + 6개 SSOT
   - 정렬 토글: "기본순 ↑↓" / "토론 수 ↑↓"

4. **지난 스파링 카드 (단순)**
   ```
   [bg: gray-50, padding 24-32, radius 16, mb 16]
   상단 카테고리 해시태그 칩 (회색, 12px / 600)
   "#재테크입문 #국내주식·ETF"
   
   제목 (24px / 700 / black, 2줄 클램프)
   "ISA vs 연금저축 우선순위?"
   
   ───── (얇은 회색 라인)
   
   좌하단: 우세 의견 outlined 박스
   ┌─────────────────────┐
   │ 우세 의견 │ XX.X%   │
   └─────────────────────┘
   (positive면 파랑, negative면 빨강)
   
   우하단: "투표 수" 14 / 400 / gray + "X,XXXX표" 16 / 700
   ```

### 3-2. `/sparring/[slug]` (상세)

```
[글로벌 헤더]

[페이지 헤더 좌측]
  스파링
  재테크 결정, 토론으로 검증해요

[메인 컨텐츠 max-width 720 + 우측 사이드바 ~300]

  좌측 메인:
  ┌─────────────────────────────────┐
  │ [bg: gray-50, radius 24, padding] │
  │                                  ⬆ 공유 │
  │       215 라운드 ⓘ                  │
  │       (가운데, 14 / 회색)            │
  │                                     │
  │       큰 제목                        │
  │       (28-32 / 800 / 가운데, 2줄)    │
  │                                     │
  │   [양측 카드, 가로 그리드]          │
  │   ┌──────────┐  ┌──────────┐      │
  │   │ 파랑 카드 │  │ 빨강 카드 │      │
  │   │ side_a_  │  │ side_b_  │      │
  │   │ label    │  │ label    │      │
  │   │ [선택]    │  │ [선택]    │      │
  │   └──────────┘  └──────────┘      │
  │                                     │
  │   [통계 카드, 흰 bg, padding]       │
  │   🔥 X,XXX명 투표 중!               │
  │   ─────                             │
  │   남은 투표 시간                     │
  │   3일 1:22:22 (큰 글씨 24 / 700)     │
  │                                     │
  │   [흰 카드, padding]                │
  │   재테크한입에서 설정한 주제          │
  │   설명 보기 [버튼]                  │
  │                                     │
  │   [도넛 통계 — v2, 일단 생략]        │
  │                                     │
  └─────────────────────────────────┘
  
  [전체 토론 N — 큰 텍스트 24 / 700]
  
  [정렬/필터 한 줄]
  [투표 항목별 ▼]   [내가 남긴 댓글]
  
  [댓글 입력 박스]
  - 투표 안 했으면: "투표 후 의견 작성 가능" lock 상태 (회색 bg, disabled)
  - 투표 했으면: 활성화된 textarea
  
  [댓글 1]
  🦊 닉네임 / 시간                        ⋯
  ✅ side_a_label (파랑 또는 빨강 - polarity로 결정)
  댓글 본문 (16 / 400 / lh 1.5)
  👍 N  👎 N  💬 N
  
  ───── (얇은 디바이더)
  
  [댓글 2]
  ...
  
  우측 사이드바:
  [스파링 홈 >] (텍스트 링크)
  
  [작은 진행중 카드 1] (모바일에선 숨김)
  베스트 답변 | 답변 발췌
  
  [작은 진행중 카드 2]
```

**투표 동작:**
1. 유저 양측 카드 중 하나의 [선택] 클릭 → 즉시 투표 기록 → UI 업데이트
2. 양측 카드는 `disabled` 상태로 변경, 본인 투표한 쪽에 ✅ 체크 표시
3. 통계 카드의 X,XXX명 +1 자동 갱신
4. 댓글 입력 박스 활성화 (RLS 정책으로 권한 자동 부여)
5. 도넛 차트 (v2) 결과 노출

**댓글 정렬:**
- 기본: 최신순
- "투표 항목별 ▼" 클릭: 양측 그룹핑 (a 먼저 → 디바이더 → b)
- "내가 남긴 댓글": 내가 작성한 댓글만 필터

---

## 4. 모바일 (768px ↓)

- 메인 컨텐츠 풀너비 (사이드바 숨김)
- 진행중 카드: 1열 세로 스택, 카드 높이 적정
- 양측 투표 카드: 가로 유지 (좁아도 양옆 비교가 핵심)
- 통계 카드 / 운영자 메모 카드 / 도넛 / 댓글: 단일 컬럼

---

## 5. GPT/Codex 작업 체크리스트

### Phase 1 — 데이터 (먼저)
- [ ] `docs/migration_sparring_v1.sql` — sparrings, sparring_votes, sparring_comments + RLS + view
- [ ] `lib/sparring.ts` — fetch helpers (list / detail / vote / comment)
- [ ] (예호) Supabase에서 마이그레이션 실행

### Phase 2 — 카드 컴포넌트
- [ ] `<SparringActiveCard />` — 진행중 카드 (풀일러스트 또는 단색 그라디언트 fallback)
- [ ] `<SparringPastCard />` — 지난 카드 (회색 bg + 우세 의견 박스)
- [ ] `<DominantOpinionBox />` — 우세 의견 박스 (positive=파랑/negative=빨강)
- [ ] `<Countdown />` — "3일 1:22:22" 카운트다운 (timer hook)

### Phase 3 — 목록 페이지
- [ ] `app/sparring/page.tsx` v2 — 진행중 그리드 + 지난 리스트 + 카테고리 칩 + 정렬 토글

### Phase 4 — 상세 페이지
- [ ] `app/sparring/[slug]/page.tsx` v2 — 라운드 + 양측 투표 카드 + 통계 + 운영 메모 + 댓글
- [ ] `<VoteButtons />` — 양측 [선택] 버튼 + 클릭 핸들러 + lock 상태
- [ ] `<SparringComment />` — 댓글 카드 (사이드 뱃지 + 좋아요/싫어요/대댓글)
- [ ] `<CommentSortFilter />` — "투표 항목별" / "내가 남긴 댓글"

### Phase 5 — admin 통합
- [ ] `/admin/sparring` 작성 폼 (라운드 자동 + side_a/b 라벨 + polarity 자동 추론)
- [ ] thumbnail_url 업로드 UI

---

## 6. 검증 기준

1. 비-로그인 사용자: 투표/댓글 lock, 로그인 유도
2. 로그인 사용자, 미투표: [선택] 클릭 가능, 댓글 입력 lock
3. 투표 후: 양측 카드 disabled, 본인 선택에 ✅, 댓글 입력 활성
4. 댓글 작성 시 사이드 뱃지가 본인 투표한 쪽으로 자동 표시
5. "투표 항목별 ▼" 클릭 시 양측 그룹핑됨
6. 마감일 지나면 status='closed' 자동 (cron 또는 select 시 체크)
7. 라운드 번호 1부터 순차 증가
8. 우세 의견 박스 색상이 polarity에 맞게 자동
9. 모바일 단일 컬럼 동작

---

## 작업 로그
- 2026-05-09 v1: 초안 (a-ha blueprint 기반, 사용자 결정 3개 반영)
