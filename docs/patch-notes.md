# 패치노트

## [2026-05-09] 관리자 페이지 + 기타 페이지 완성도 스펙 (v1/v2 단계)
**작업자:** Claude
**태그:** #admin #페이지폴리싱 #스펙

### 신규 문서
- `docs/admin-spec.md` — 관리자 페이지 v1/v2
- `docs/pages-polish-spec.md` — 기타 페이지 완성도 v1/v2/v3

### 권한 모델
- `users.role` 컬럼 추가: `'user'` | `'expert'` | `'admin'`
- `/admin/*` 미들웨어 가드, RLS 정책으로 admin 전용 작업 보호
- `audit_logs` 테이블로 관리자 액션 추적

### 단계 구분 (Codex/GPT 작업 순서)

**🔴 admin v1 (먼저)**
1. 스파링 라운드 CRUD (`/admin/sparring`)
2. 토픽 CRUD (`/admin/topics`)
3. 모더레이션 패널 (`/admin/moderation`)

**🔴 pages v1 (admin v1과 병행 가능)**
1. 마이페이지 5탭 + 북마크/팔로우 시스템
2. 토픽 페이지 6개 일괄 (`/topics/[slug]`)
3. 검색 결과 페이지 (`/search?q=...`)

**🟡 admin v2 (v1 후)**
- 사용자 관리 / 미션 관리 / 통계 대시보드 / RSS 모니터링 / Ghost 동기화

**🟡 pages v2 (v1 후)**
- 미션 페이지 / 알림 / 404·500 / 약관·개인정보 / 소개 / 작성자 외부뷰

**🟢 pages v3 (선택)**
- PWA / 다크모드 / OG 자동생성 / 게임화 / 임베드 위젯

### 다음 작업자 TODO

**예호:**
- [ ] DB에 `users.role` 컬럼 추가 + 본인 계정 admin으로 시드 (`UPDATE users SET role='admin' WHERE email='imyeho@gmail.com';`)

**Codex/GPT:**
- [ ] admin v1 + pages v1 병렬 진행 (서로 충돌 없음)
- [ ] 모든 admin 액션은 `audit_logs`에 기록
- [ ] admin v1 끝나면 v2, pages v1 끝나면 v2

---

## [2026-05-09] 칼럼 → 피드 (외부 뉴스 RSS 자동수집 추가)
**작업자:** Claude
**태그:** #피드 #RSS #토스증권패턴

### 변경사항
- `docs/columns-page-spec.md` → `docs/feed-page-spec.md` 으로 rename + 전면 개편
- 전역 명칭 변경:
  - 칼럼 → 피드 (UI 노출명)
  - `/columns` → `/feed` (라우트, 301 리다이렉트 필요)
  - `<ColumnCard />` → `<ColumnFeedCard />` (한입 칼럼용)
  - 신규 `<NewsFeedCard />` (외부 뉴스용)
- `docs/ia-redesign.md`도 칼럼 → 피드로 동기화

### 신규 시스템: 외부 뉴스 RSS 자동수집 (토스증권 패턴)
- Vercel Cron으로 매시간 RSS fetch → Supabase `news_items` 테이블 저장
- 후보 매체: 매일경제, 한국경제, 머니투데이, 이데일리, 연합뉴스 (운영 전 사용약관 확인)
- 카테고리 자동 매핑: 키워드 규칙 기반 (LLM은 추후 업그레이드)
- 저작권: 제목 + 200자 요약 + 썸네일 + 출처만 노출, 본문은 외부 사이트로 이동

### 데이터 모델
```sql
public.news_items
  id, source, title, summary, url (unique), thumbnail_url, category, published_at, click_count
```

### 다음 작업자 TODO
- [ ] (Codex) Phase A: 라우트 `/columns/*` → `/feed/*` 변경 + 301 리다이렉트
- [ ] (Codex) Phase B: `lib/rss.ts`, `lib/classify.ts`, `app/api/cron/fetch-news/route.ts`, `vercel.json` cron 설정
- [ ] (Codex) Phase B: Supabase `news_items` 테이블 마이그레이션 SQL
- [ ] (Codex) Phase C: `app/feed/page.tsx` 통합 피드 + 두 카드 컴포넌트
- [ ] (예호) RSS 소스 매체별 사용 약관 확인 → SOURCES 배열 확정
- [ ] (예호) Vercel env에 `CRON_SECRET` 랜덤 문자열 설정
- [ ] (예호) 네비게이션 메뉴 라벨도 "피드"로 갱신 (관리자 화면 있으면)

### 절대 금지
- 외부 뉴스 본문을 자체 페이지에 fully render (저작권 침해)
- 출처 표기 누락
- 외부 뉴스에 자체 좋아요/댓글 (자체 콘텐츠 오인 + 저작권 모호)

---

## [2026-05-09] 슬러그 스펙 — SEO 친화 한글 URL
**작업자:** Claude
**태그:** #SEO #URL #슬러그

### 변경사항
- `docs/slug-spec.md` 신규 — q/topics/sparring/columns 슬러그 통일 룰
- 핵심: **한글 직접 사용** (Romanization 안 함) + 키워드 3-5개 + 하이픈
- 예시:
  - `/q/월급-300만원-저축-얼마나`
  - `/topics/국내주식-etf`
  - `/sparring/12-isa-연금저축-우선순위`
- 카테고리 slug는 `lib/categories.ts`에 양방향 매핑 (UI `국내주식·ETF` ↔ URL `국내주식-etf`)
- `generateSlug()` 헬퍼 의사코드 + 조사/어미 제거 룰 명세
- 충돌 시 `-2`, `-3` 접미사 (UUID 노출 금지)

### 다음 작업자 TODO
- [ ] (Codex) `lib/slug.ts` 생성 — `generateSlug()`, `ensureUniqueSlug()` 헬퍼
- [ ] (Codex) `lib/categories.ts`에 카테고리↔슬러그 양방향 매핑 6개 정의
- [ ] (Codex) 기존 질문에 `slug` 필드 백필 마이그레이션 SQL
- [ ] (Codex) `/q/[uuid]` 접근 시 새 slug URL로 301 리다이렉트
- [ ] (예호) Ghost 발행자에게 한글 slug 권장 가이드 전달

---

## [2026-05-09] 서비스 도메인 확정 — `we.hannipmoney.com`
**작업자:** Claude (결정), Codex/예호 (실행)
**태그:** #도메인 #SEO #DNS

### 결정 사항
- 서비스 도메인: **`we.hannipmoney.com`** 확정
- 블로그(`hannipmoney.com`, Ghost)는 그대로 유지 — SEO 0 손실
- 폐기된 계획: `column.hannipmoney.com`, `home.hannipmoney.com`, `app.hannipmoney.com`
- Vercel 기본 도메인(`jaetechwhanip.vercel.app`)은 staging/fallback으로 유지

### 변경 문서
- `docs/context.md` 키 정보 업데이트
- `docs/columns-page-spec.md` 도메인 경로 갱신
- canonical/sitemap 베이스 URL → `https://we.hannipmoney.com`

### Codex/예호 작업 TODO
- [ ] (예호) hosting.co.kr DNS에 `we` CNAME 또는 A 레코드 추가
  - CNAME: `we` → `cname.vercel-dns.com`
  - 또는 A: `we` → `76.76.21.21` (Vercel)
- [ ] (예호) Vercel 프로젝트 → Settings → Domains에 `we.hannipmoney.com` 추가, SSL 자동 발급 확인
- [ ] (Codex) `NEXT_PUBLIC_SITE_URL=https://we.hannipmoney.com`로 Vercel env 설정
- [ ] (Codex) canonical/OG/sitemap 모든 베이스 URL을 `we.hannipmoney.com`으로 통일
- [ ] (Codex) Supabase Auth Site URL/Redirect URLs에 `https://we.hannipmoney.com/**` 추가
- [ ] (Codex) Google/Kakao OAuth Redirect URI에도 새 도메인 추가
- [ ] (예호) Google Search Console에 `we.hannipmoney.com` property 신규 등록 + sitemap 제출
- [ ] (예호) Google Analytics 신규 도메인 측정 설정 (있다면)

### SEO 영향 분석
- 블로그 글 한 개도 안 건드림 → 검색 트래픽 0 손실
- 서비스는 신규 서브도메인이라 인덱싱 새로 시작 (현재 vercel.app도 자체 인덱싱 있긴 했으나 약함)
- 블로그→서비스 전환 유도용 내부 링크 (블로그 푸터/사이드바에 "we.hannipmoney.com 가서 질문하기" 권장)

---

## [2026-05-09] UI 원칙 v2 — a-ha 톤으로 전환
**작업자:** Claude
**태그:** #UI원칙 #방향전환 #SSOT

### 변경사항
- `docs/ui-principles.md` 전면 개편 (v1 토스 감성 → v2 a-ha 톤)
- 핵심 철학 변경: "여백 넓게" 폐기 → "정보 밀도 높고 스캐너블, 단일 컬럼 중앙 집중"
- 신규 타이포 토큰 표 (제목 16-18 / 본문 14-16 / 메타 12-13)
- 신규 색상 토큰 표 (primary #03C75A 활성화)
- Don't 항목 추가: 카드 border+shadow 이중처리 금지, AI 요약 박스 본문 위 금지, 핵심 CTA 회색 처리 금지
- 데스크탑 우선·모바일은 별도 트랙 명시

### 영향 범위
- 모든 컴포넌트가 영향. 특히:
  - 질문 상세 `app/q/[slug]/QuestionClient.tsx` — AI 요약/핵심 요약 제거
  - 전역 카드 — border 제거
  - 핵심 CTA — primary green 적용
  - `globals.css` 또는 토큰 파일 — 타이포·색상 갱신

### 다음 작업자 TODO (Codex/GPT)
- [ ] AI 요약 / 핵심 요약 블록 제거 (`/q/[slug]`)
- [ ] 카드 컴포넌트 border 제거 + shadow 단일화
- [ ] primary 색 `#03C75A`를 "나도 질문하기"/"답변하기"/"참여하기" 등 핵심 CTA에 적용
- [ ] 타이포 사이즈 globals.css에 v2 토큰으로 반영
- [ ] 글로벌 네비 중복 노출 제거 (홈 푸터 위 네비)

---

## [2026-05-09] 카테고리 표기 보정 — 가운뎃점(·) 복원
**작업자:** Claude
**태그:** #카테고리 #표기

### 변경사항
- `docs/categories.md` 표기 규칙 수정: 가운뎃점(`·`)만 예외 허용
- 최종 6개:
  1. `재테크입문`
  2. `국내주식·ETF`
  3. `해외주식·ETF`
  4. `절세`
  5. `보험`
  6. `대출·부채`
- `columns-page-spec.md` 동기화

### 영향
- Ghost 태그/DB/UI 모두 위 표기 그대로 사용
- URL 인코딩 시 `·`(U+00B7)이 percent-encode 됨 — fetch/필터 라우팅 시 encodeURIComponent 적용

---

## [2026-05-09] 카테고리 마스터 확정 (6개 SSOT)
**작업자:** Claude
**태그:** #카테고리 #SSOT #문서

### 변경사항
- [Docs] `docs/categories.md` 신규 — 카테고리 단일 진실 공급원
- 확정 6개 (순서·표기 고정):
  1. 재테크입문
  2. 국내주식ETF
  3. 해외주식ETF
  4. 절세
  5. 보험
  6. 대출부채
- 표기 규칙: 특수문자/이모지/공백 모두 금지. UI 이모지 prefix는 컴포넌트 단에서만 처리 (DB/Ghost 저장값은 깨끗하게)
- [Docs] `docs/columns-page-spec.md`, `docs/ia-redesign.md` 카테고리 부분을 categories.md 참조로 일원화

### 영향 범위 (코드/운영 작업 필요)
- 코드: `components/HomeClient.tsx` 필터 칩, 질문 작성/상세, 칼럼 페이지(신규)
- DB: `public.questions.category` 마이그레이션 SQL 필요 (categories.md §마이그레이션 참조)
- Ghost: hannipmoney 어드민 태그 6개로 재할당

### 다음 작업자 TODO
- [ ] (예호) Supabase에서 `SELECT DISTINCT category FROM public.questions;` 실행해 현재 값 공유 → 정확한 마이그레이션 SQL 작성
- [ ] (예호) hannipmoney Ghost 어드민 태그를 6개로 정리
- [ ] (Codex/GPT) 코드 내 카테고리 상수를 `lib/categories.ts` 같은 곳에 단일 정의 후 모든 컴포넌트에서 import

---

## [2026-05-09] 칼럼 페이지 스펙 작성 (a-ha 잉크 + hannipmoney 매핑)
**작업자:** Claude
**태그:** #문서 #칼럼 #Ghost #AhaReference

### 변경사항
- [Docs] `docs/columns-page-spec.md` 신규 — `/columns` 페이지 상세 스펙
- 분석:
  - UX 벤치마크: a-ha 잉크 페이지 (`/experts/columns`)
  - 콘텐츠 출처: hannipmoney.com (Ghost 블로그, 13개 칼럼, "에디터 한입이" 단일 작성자)
- 매핑 결정:
  - 페이지 제목 "잉크" → "칼럼", 부제 변경
  - 카테고리 14개 → 4개로 축소 (국내주식/미국주식/경제지식/재테크)
  - 단일 컬럼 720px 중앙 정렬, 무한 스크롤, 사이드바 X
- 데이터 레이어:
  - Ghost Content API로 posts/tags fetch (revalidate 600)
  - 좋아요/조회수/댓글은 Supabase `column_stats` 별도 테이블
  - Ghost 태그를 4개 카테고리명으로 운영자 정리 필요

### 확인
- ui-principles.md 토큰 정합성 확인 (radius 16, padding 20, Pretendard, #03C75A)
- 코드 변경 없음 (문서만 추가)

### 다음 작업자 TODO (Codex/GPT 인계, Phase A→B→C→D 순서)
- [ ] **Phase A**: Ghost API Key 발급 → Vercel env (`GHOST_CONTENT_API_KEY`, `GHOST_CONTENT_API_URL`) + `lib/ghost.ts` 헬퍼 + `migration_column_stats.sql`
- [ ] **Phase B**: `app/columns/page.tsx` 리스트 + `<CategoryFilter />` + `<ColumnCard />` + 무한 스크롤
- [ ] **Phase C**: `app/columns/[slug]/page.tsx` 상세 + prose 스타일 + 좋아요/저장/공유 + cross-link 추천
- [ ] **Phase D**: 홈 칼럼 섹션을 Ghost 데이터로 교체

### 운영 작업 (예호님)
- [ ] hannipmoney Ghost 어드민에서 태그를 정확히 `국내주식`, `미국주식`, `경제지식`, `재테크` 4개로 정리
- [ ] Ghost Content API Key 발급 → 슬랙 키 요청 형식으로 공유

---

## [2026-05-09] IA 재설계 문서 작성 (a-ha 벤치마킹)
**작업자:** Claude
**태그:** #문서 #IA #UI설계 #AhaReference

### 변경사항
- [Docs] `docs/ia-redesign.md` 신규 작성 — 홈/토픽/스파링/칼럼 통일 IA 설계서
- 라이브 사이트(jaetechwhanip.vercel.app)와 a-ha.io를 비교 분석
  - 핵심 발견: 홈은 이미 a-ha를 잘 따랐으나 다른 탭이 따로 노는 구조
  - 결론: 새 IA가 아니라 **홈 골격을 다른 탭에 이식**하는 게 우선
- 작성 항목:
  - 공통 레이아웃 (글로벌 헤더 / 슬로건 / 필터바 / 하단탭바)
  - 카드 컴포넌트 4종 (`<QnACard />` `<TopicCard />` `<SparringCard />` `<ColumnCard />`)
  - 디자인 토큰 (ui-principles.md 준수: radius 16 / Pretendard / #03C75A)
  - 홈 = 큐레이션 허브 섹션 구조 (각 섹션 → 더보기 → 해당 탭)
  - 데스크탑/모바일 분기 표
  - Phase 1~5 구현 체크리스트 + 검증 기준 4개

### 확인
- ui-principles.md의 토큰(radius 16, padding 20, Pretendard, #03C75A)과 정합성 확인
- 코드 변경 없음 (문서만 추가)

### 다음 작업자 TODO (Codex/GPT 인계)
- [ ] Phase 1: `tokens.ts` 추출 → `<GlobalHeader />` `<FilterBar />` `<BottomTabBar />` `<Layout />`
- [ ] Phase 2: 카드 컴포넌트 4종 신설 (홈 기존 카드 → `<QnACard />`로 추출)
- [ ] Phase 3: 홈 섹션을 4개(스파링/Q&A/토픽/칼럼) + "더보기" 라우팅으로 재배치
- [ ] Phase 4: 토픽/스파링/칼럼 페이지를 공통 골격으로 재구성
- [ ] Phase 5: 콘텐츠 모델에 `topicId` 공통 필드 + cross-link 추천 영역

---

## [2026-05-09] 홈 피드 탭 고도화
**작업자:** Codex
**태그:** #홈 #피드 #UI개발

### 변경사항
- [Home] 홈 피드 상단 탭을 실제 동작하는 `인기 / 최신 / 답변대기`로 전환
  - 인기: 답변 수 + 좋아요 수 기준 우선 정렬
  - 최신: 작성일 최신순 정렬
  - 답변대기: 답변 0개 질문만 표시
- [Home] 카테고리/검색 결과 상태를 보여주는 피드 요약줄 추가
- [Home] 모바일 홈에도 동일한 탭/요약 흐름 반영
- [Type] 홈 정렬에 필요한 `createdAt`, `likeCount` 질문 타입 보강

### 확인
- `npm_config_cache=.npm-cache npm run build` 통과
- 로컬 `http://localhost:3000` 홈 200 응답 및 `인기/최신/답변대기` 렌더 확인

### 다음 작업자 TODO
- [ ] 운영 DB에서 인기 정렬 기준을 `view_count`까지 포함할지 결정
- [ ] 답변대기 탭 empty state 문구를 별도 UX로 다듬기
- [ ] 실제 유저 관심 토픽 기능이 생기면 `관심` 탭 재도입 검토

---

## [2026-05-08] 질문 상세 페이지 아하형 레이아웃 적용
**작업자:** Codex
**태그:** #UI #질문상세 #AhaReference

### 변경사항
- [UI] `/q/[slug]` 질문 상세를 아하 질문 상세처럼 상단 네비 + 질문 카드 + 답변 에디터 + 답변 리스트 + 우측 사이드바 구조로 재구성
- [UI] 질문 액션을 도움돼요/답변/저장/공유 아이콘 버튼으로 정리
- [UI] 답변 영역에 답변 수 헤더, AI 요약 버튼 자리, 평가/댓글/응원하기/채택하기 액션 추가
- [UI] 상세 페이지 전용 CSS Module(`QuestionClient.module.css`)로 inline style 대부분 정리
- [Responsive] 모바일에서는 단일 컬럼과 sticky 모바일 헤더로 전환

### 현재 동작 확인
- ✅ `npm_config_cache=.npm-cache npm run build` 통과
- ⚠️ 로컬 dev 서버 실행 중 Watchpack `EMFILE` 경고가 반복되어 화면 검수는 추가 확인 필요

### 다음 작업자 TODO
- [ ] 실제 게시글 클릭 → `/q/[slug]` 화면 데스크톱/모바일 시각 검수
- [ ] 답변 에디터 최소 글자 수 정책을 실제 서비스 기준으로 확정
- [ ] 우측 사이드바 투표/잉크/앱 설치 영역을 실제 데이터와 연결

---

## [2026-05-08] 카카오 로그인 버튼 활성화
**작업자:** Codex
**태그:** #Auth #OAuth #UI

### 변경사항
- [Auth] 로그인 화면에 카카오 OAuth 버튼 추가
- [Auth] Google/카카오가 같은 Supabase OAuth 콜백(`/api/auth/callback`)을 사용하도록 공통 처리
- [Auth] 카카오 비즈 인증 전에도 로그인 플로우가 열리도록 `account_email` scope 제외
- [Fix] 카카오 `KOE205` 재발 원인인 공백 구분 scope를 `openid,profile_nickname,profile_image` 쉼표 구분으로 수정
- [UI] 카카오 버튼 로딩 상태와 간단한 톡 아이콘 추가
- [Docs] README/context의 카카오 OAuth 상태와 설정 안내 갱신

### 현재 동작 확인
- ✅ `npm_config_cache=.npm-cache npm run build` 통과
- ✅ Kakao Developers 앱 `1449623` 카카오 로그인 상태 ON 확인
- ✅ REST API 키의 카카오 로그인 리다이렉트 URI `https://fqoeacfkzptlzohdzhgd.supabase.co/auth/v1/callback` 등록 확인
- ✅ Vercel production 배포 `a1d0ec1` READY 확인
- ✅ 라이브 `/auth` JS chunk에서 카카오 scope `openid,profile_nickname,profile_image` 반영 확인
- ⚠️ 기존 요청은 이메일 권한 및 scope 형식 때문에 `KOE205` 발생 → 카카오 scope에서 이메일 제외, 쉼표 구분 사용

### 다음 작업자 TODO
- [ ] Supabase Auth Providers > Kakao에 REST API 키/Client Secret 등록 확인
- [ ] 카카오 실로그인 후 `auth.users.email`이 비어도 public.users 트리거가 통과하는지 확인
- [ ] 이메일 수집이 필요해지면 카카오 비즈 인증 후 `account_email` scope 재추가

---

## [2026-05-08] 문서 현행화 + 레거시 질문 URL 정리
**작업자:** Codex
**태그:** #문서 #SEO #라우팅

### 변경사항
- [Docs] `docs/context.md`의 OAuth/파일 구조/DB 컬럼/우선순위를 현재 코드 기준으로 갱신
- [Docs] `README.md` OAuth 가이드를 Google 유지, 카카오 비활성, 네이버 제거 상태로 정리
- [SEO] `/questions/[slug]` 레거시 상세 페이지를 `/q/[slug]`로 permanent redirect 처리
- [Auth] 로그인 페이지 메타 설명을 현재 Google 단일 로그인 상태와 맞춤
- [Dev] 로컬 npm 캐시 폴더가 Git 상태를 더럽히지 않도록 `.npm-cache/` ignore 추가

### 현재 동작 확인
- ✅ `npm_config_cache=.npm-cache npm run build` 통과
- ✅ `/q/[slug]` 상세 페이지는 Supabase 기반 메타데이터 유지
- ✅ `/questions/[slug]`는 중복 샘플 상세 대신 새 질문 상세 URL로 이동

### 다음 작업자 TODO
- [ ] 운영 Supabase의 `questions.like_count`, `questions.view_count`, `questions.is_answered`, `answers.like_count`, `users.provider` 컬럼 존재 확인
- [ ] Google 로그인 실기기 테스트 후 `public.users` 동기화 확인
- [ ] 답변 좋아요 중복 방지 정책 또는 별도 테이블 설계
- [ ] 네이버 로그인 재활성화 여부는 사용자 확인 후 진행

---

## [2026-05-07] Auth 버그수정 + 로그인 UI + 질문 모달
**작업자:** Claude Sonnet 4.6
**태그:** #Auth #UI개발 #버그수정

### 변경사항
- [Auth] 네이버 OAuth 재활성화 — Custom OAuth 방식 유지
- [Fix] Supabase Site URL localhost → https://jaetechwhanip.vercel.app 수정
- [Fix] Supabase Redirect URLs 추가 (jaetechwhanip.vercel.app/**)
- [Fix] auth callback route.ts — origin을 request.url 대신 NEXT_PUBLIC_SITE_URL로 변경
- [UI] 로그인 후 유저 아이콘 드롭다운 (이름 + 로그아웃 버튼)
- [UI] 질문하기 모달 UI 완성 (카테고리/제목/내용 입력)
- [Fix] authLoading state 추가 — 세션 확인 전 버튼 클릭 방지
- [Fix] URL hash access_token 감지 후 세션 처리 (getSession 사용)
- [기능] 질문 Supabase DB 저장 연동 (questions 테이블)
- [기능] 로그아웃 (supabase.auth.signOut)

### 현재 동작 확인
- ✅ 네이버 로그인
- ✅ Google 로그인 (확인되지 않은 앱 경고, 우회 가능)
- ✅ 로그아웃 드롭다운
- ✅ 질문하기 모달
- ✅ 질문 DB 저장

### 다음 작업자 TODO
- [ ] auth hydration 완전 해결 (로그인 후 바로 user 상태 반영)
- [ ] 홈 질문 목록 Supabase 실시간 로드
- [ ] /q/[slug] 상세 페이지 연동 확인
- [ ] SEO 메타태그
- [ ] 답변 좋아요 기능
- [ ] 카카오 비즈 인증 후 재활성화 여부 결정

---



## [2026-05-08] 질문 상세 조회/이동 버그 수정
**작업자:** Codex
**태그:** #버그수정 #질문상세 #배포

### 변경사항
- [Fix] `/q/[slug]` 상세 조회가 slug만 찾던 문제 수정
  - URL 값이 UUID면 `questions.id`, 아니면 `questions.slug`로 조회
  - DB에 없는 샘플 질문 slug는 `sampleQuestions` fallback으로 표시
- [Fix] 홈/관련질문/프로필에서 slug가 비어 있을 때 `id`로 이동하도록 보강
  - `/q/null` 또는 빈 slug 이동으로 "질문을 찾을 수 없어요"가 뜨는 경로 차단
- [Guard] 샘플 질문에서는 답변/채택 DB 쓰기 방지

### 확인
- `npm run build` 통과
- Vercel production 배포 READY
- `https://jaetechwhanip.vercel.app/q/monthly-300` 200 응답 확인

### 다음 작업자 TODO
- [ ] 실제 로그인 계정으로 새 질문 작성 → 홈 클릭 → 상세 진입 1회 점검
- [ ] 질문 slug가 비어 있는 기존 DB row가 있으면 백필 여부 결정

---

## [2026-05-07] 홈 기능 전체 완성
**작업자:** Claude Sonnet 4.6
**태그:** #백엔드 #Auth #UI개발

### 변경사항
- [Auth] 로그인 Google만 유지 — 카카오/네이버 제거
  - 카카오: 비즈 인증 없이 account_email 권한 불가 (KOE205)
  - 네이버: 제거 결정
- [DB] Supabase 테이블 생성 완료
  - public.users, public.questions, public.answers
  - RLS: 누구나 읽기 / 본인만 쓰기
  - 트리거: auth.users → public.users 자동 생성
  - 샘플 질문 4개 INSERT
- [기능] /q/[slug] 질문 상세 페이지 신규 생성
  - 답변 작성 (로그인 필요)
  - 질문자가 답변 채택 가능
- [기능] HomeClient — Supabase 실시간 질문 로드
  - DB 비어있으면 샘플 데이터 fallback
  - 실시간 INSERT 구독
- [Fix] auth hydration 수정 (hash token 처리)
- [Fix] 드롭다운 외부 클릭 닫기

### 현재 동작 확인
- ✅ 홈 질문 목록 DB 로드
- ✅ /q/[slug] 상세 페이지
- ✅ 답변 작성 + 채택
- ✅ Google 로그인 (확인되지 않은 앱 경고 있음, 고급→계속으로 우회)
- ✅ 질문 작성 → DB 저장

### 다음 작업자 TODO
- [ ] Google 로그인 테스트 완료 확인
- [ ] 로그인 후 이름 표시 확인
- [ ] SEO: /q/[slug] 메타태그
- [ ] 답변 좋아요 기능
- [ ] 카카오 비즈 인증 후 재활성화 여부 결정

---


## [2026-05-07] Auth 안정화 + 네이버 OAuth
**작업자:** Claude Opus 4.6
**태그:** #Auth #OAuth #배포

### 변경사항
- [Auth] 네이버 Custom OAuth 구현 (`/api/auth/naver`, `/api/auth/naver/callback`)
- [Auth] 카카오 임시 비활성화 (비즈 인증 필요 — KOE205 에러)
- [Auth] Google OAuth Enabled (Supabase Provider)
- [Fix] Vercel env 플레이스홀더 값 수정 (`https://aBcDe.supabase.co` → 실제 URL)
- [Fix] middleware.ts Edge Runtime 충돌 수정
- [Fix] Supabase client hasSupabase() 방어코드
- [UI] 카카오 버튼 "준비 중" 상태로 변경

### Vercel 환경변수 (현재)
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `NEXT_PUBLIC_SITE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `NAVER_CLIENT_ID` ✅
- `NAVER_CLIENT_SECRET` ✅

### 다음 작업
- [ ] 네이버/Google 로그인 실제 테스트
- [ ] auth hydration 이슈 해결
- [ ] 질문 목록 Supabase 실시간 로드
- [ ] 답변 기능 구현
- [ ] 카카오 비즈 인증 후 활성화

---

## [2026-05-06] 초기 마이그레이션
**작업자:** Claude Opus 4.6
**태그:** #마이그레이션 #초기설정

### 변경사항
- 정적 HTML → Next.js 14 마이그레이션
- Vercel 배포 연결
- Supabase 프로젝트 생성
- 카카오/Google OAuth 앱 생성
- 레거시 백업 (`legacy/index.html`)
