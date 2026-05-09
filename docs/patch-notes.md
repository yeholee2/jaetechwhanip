# 패치노트

## [2026-05-09] ui-principles v2.1 — a-ha 추출본 큐레이션 흡수 — Claude
**작업자:** Claude
**태그:** #UIPrinciples #DesignTokens #Accessibility

### 변경사항
- `docs/ui-principles.md` v2 → v2.1 갱신
- 외부 도구(TypeUI Style Extractor)로 추출한 a-ha 25개 md 파일을 큐레이션해서 신뢰값만 흡수
- 추가:
  - **Pretendard 폰트 스택 (full fallback)** — `Pretendard Variable, Pretendard, -apple-system, ..., 'Apple SD Gothic Neo', 'Noto Sans KR', ...`
  - **모션 토큰 4종** — instant 150ms / fast 200ms / normal 300ms / slow 400ms
  - **컴포넌트 필수 상태 7종 표** — default/hover/focus-visible/active/disabled/loading/error
  - **접근성 표준** — WCAG 2.2 AA, 명도 대비 4.5:1, prefers-reduced-motion 존중
  - **작성 규칙** — must / should 분리, 시스템 일관성 우선
  - 색상 토큰 보강 (a-ha의 inverse 텍스트 색 #191f28 등)
- 거른 노이즈:
  - `radius.lg=16777200px` (1677만 px 버그)
  - `color.surface.base=#000000` (검정 surface 오추출)
  - `color.text.primary=#0000ee` (브라우저 링크 기본값 오추출)

### 운영 룰 (지금부터)
- 추출본 25개 md는 레포에 안 넣음 (재현 가능 + ui-principles.md가 SSOT)
- GPT/Codex는 `docs/ui-principles.md`만 참조. 외부 추출본 직접 먹이지 말 것
- UI 토큰 변경은 반드시 ui-principles.md 먼저 수정 → 그다음 코드/CSS 반영

### 다음 작업자 TODO
- [ ] (Codex) `globals.css` 또는 토큰 파일에 v2.1 색상/폰트 스택/모션 반영
- [ ] (Codex) 모든 인터랙티브 컴포넌트에 `focus-visible` 스타일 점검 (현재 누락 위험)
- [ ] (Codex) `prefers-reduced-motion` 미디어쿼리로 트랜지션 0ms 처리

---

## [2026-05-09] 피드 v2 실데이터화 — Codex
**작업자:** Codex
**태그:** #Feed #Ghost #RSS #SEO #NewsClick

### 변경사항
- [Ghost] `/feed`와 `/feed/[slug]`가 `https://www.hannipmoney.com/rss/`에서 한입머니 Ghost 글을 실시간으로 읽어오도록 연결
- [상세] Ghost RSS 본문(`content:encoded`)을 안전하게 정리해서 `/feed/[slug]`에 렌더링하고, 원문 Ghost 글로 이동하는 링크 추가
- [RSS] `lib/rss.ts` 공용 RSS 파서/본문 정리 헬퍼 추가. cron 수집 API와 Ghost 피드가 같은 파서를 사용
- [피드] 한입 칼럼 + 외부 뉴스 통합 fetch(`fetchFeedItems`)로 정리하고, 피드 통계/출처 배지/조회수 표시 추가
- [카테고리] 피드 기준 6개 카테고리(`재테크입문/국내주식·ETF/해외주식·ETF/절세/보험/대출·부채`)로 자동 매핑 정리
- [뉴스] 외부 뉴스 클릭을 `/api/feed/news-click` 경유로 처리해 허용된 RSS 매체 URL만 이동시키고 `click_count` 증가 시도
- [뉴스] `https://rss.mt.co.kr/mt_stock.xml`은 실제 404 응답 확인되어 운영 소스에서 제외

### 확인
- [x] `npm run build` 통과
- [x] 로컬 `/feed`에서 Ghost 최신 글 노출 확인
- [x] 로컬 `/feed/lunr-jugajeonmang` 200 및 상세 본문/메타/원문 링크 확인
- [x] `/api/feed/news-click` 허용 뉴스 URL은 302, 비허용 URL은 400 확인
- [ ] Supabase production `public.news_items` 테이블은 아직 없음. `docs/migration_news_items.sql` 실행 필요

### 다음 작업자 TODO
- [ ] Supabase SQL Editor에서 `docs/migration_news_items.sql` 실행 후 cron 수집 재확인
- [ ] RSS 매체별 약관 확인 후 운영 소스 2~3개부터 유지/확정
- [ ] 운영 1주 후 카테고리 자동 매핑 키워드 보강

---

## [2026-05-09] 피드 전환 + RSS v1 — Codex
**작업자:** Codex
**태그:** #Feed #RSS #SEO #Routing

### 변경사항
- [라우팅] 정식 콘텐츠 경로를 `/feed`로 추가하고 기존 `/articles`, `/articles/[slug]`, `/columns`, `/columns/[slug]`는 `/feed` 계열로 영구 이동
- [라우팅] SEO용 `Location` 헤더가 확실히 나오도록 `next.config.js` redirects에도 `/articles`, `/columns` 레거시 경로를 등록
- [네비게이션] PC/모바일 메뉴와 홈 사이드 링크의 UI 라벨을 `아티클`에서 `피드`로 정리
- [피드] 한입 칼럼 + 외부 뉴스 카드가 같은 리스트에 섞이는 `/feed` 페이지 추가
- [상세] 한입 자체 칼럼용 `/feed/[slug]` 상세 페이지와 canonical/OG 메타 추가
- [RSS] `news_items` 수집용 `/api/cron/fetch-news` 추가, `vercel.json` daily cron 추가
- [RSS] `news_items` 테이블이 아직 없어도 cron이 500으로 실패하지 않고 `news_items_table_missing`으로 넘어가도록 안전 처리
- [DB] `docs/migration_news_items.sql` 추가
- [SEO] sitemap에 `/feed` 및 `/feed/[slug]` 포함

### 확인
- [x] `npm run build` 통과
- [x] Vercel Hobby 플랜 제한으로 hourly cron 배포 실패 확인 후 daily cron(`0 0 * * *`, 한국 오전 9시)으로 조정
- [x] live `https://we.hannipmoney.com/feed` 200 확인
- [ ] Supabase에서 `docs/migration_news_items.sql` 실행 필요
- [x] Vercel production env에 `CRON_SECRET` 추가

### 다음 작업자 TODO
- [x] Ghost RSS 실제 연결 후 한입 칼럼을 `hanipArticles` 하드코딩에서 CMS fetch로 교체
- [ ] RSS 매체별 약관 확인 후 운영 소스 2~3개부터 켜기
- [x] `news_items.click_count` 증가 API 추가

---

## [2026-05-09] 스펙 문서 묶음 추가 — Claude
**작업자:** Claude
**태그:** #Docs #Specs #IA #UIPrinciples #Feed #Admin

### 신규 문서
- `docs/ia-redesign.md` — 전체 IA 재설계 (a-ha 벤치마킹, 카드 4종, 데스크탑/모바일 분기)
- `docs/categories.md` — 6개 카테고리 SSOT (재테크입문/국내주식·ETF/해외주식·ETF/절세/보험/대출·부채)
- `docs/feed-page-spec.md` — **칼럼 → 피드** 명칭 변경 + 외부 뉴스 RSS 자동수집 (토스증권 패턴)
- `docs/admin-spec.md` — 관리자 페이지 v1(스파링/토픽/모더레이션) + v2(사용자/미션/통계/RSS/Ghost)
- `docs/pages-polish-spec.md` — 마이페이지/토픽/검색 v1 + 미션/알림/에러 v2 + PWA/다크모드 v3

### 갱신
- `docs/ui-principles.md` v2 — **토스 톤 폐기, a-ha 톤으로 전환**
  - 정보 밀도↑, 단일 컬럼 720px, 카드 shadow만 (border 금지)
  - 카드 제목 16-18 / 본문 14-16 / 메타 12-13
  - Primary `#03C75A` 핵심 CTA 명확 노출 강제
  - AI 요약 박스 본문 위 박기 → ❌ 금지

### Codex 작업과 충돌 / 조정 필요
- ⚠️ **명칭:** Codex가 이미 "칼럼 → 아티클"로 마이그레이션 완료. 사용자(예호) 최종 결정은 "**피드**". → 다음 작업: `/articles` → `/feed` 추가 변경 + 외부 RSS 통합
- ✅ **슬러그/도메인/카테고리:** Codex 구현과 사용자 결정 일치 (한글 슬러그, we.hannipmoney.com, 6개 카테고리)
- ✅ **slug-spec.md, context.md:** Codex 버전 유지. 본 PR에서 덮어쓰지 않음.

### 다음 작업자 TODO (Codex/GPT)
- [ ] **Phase 1 (즉시):** ui-principles.md v2 반영 — `/q/[slug]`에서 AI 요약 제거, 카드 border 제거, primary CTA 색 적용
- [ ] **Phase 2:** `/articles` → `/feed` 라우트 변경 + 301 리다이렉트 (feed-page-spec.md §7 Phase A)
- [ ] **Phase 3:** RSS 자동수집 시스템 신설 (`lib/rss.ts`, cron, news_items 테이블)
- [ ] **Phase 4 (병렬):** admin-spec v1 (스파링/토픽/모더레이션) + pages-polish v1 (마이/토픽/검색)
- [ ] (예호) Supabase: `ALTER TABLE users ADD COLUMN role text DEFAULT 'user'; UPDATE users SET role='admin' WHERE email='imyeho@gmail.com';`

### 향후 협업 룰 (`docs/ai-collaboration.md` v2 함께 추가)
- main 직접 push 금지 → feature 브랜치 → PR → merge
- 모든 결정은 docs/ 갱신 + slack 3줄 요약
- 충돌 시 UI 라벨/사용자 향 결정은 예호님 → 그 외는 협의

---

## [2026-05-09] 서비스 도메인을 we.hannipmoney.com으로 전환 준비
**작업자:** Codex
**태그:** #Domain #SEO #Slug #Auth

### 변경사항
- [도메인] 서비스 대표 URL 기준을 `https://we.hannipmoney.com`으로 변경
- [SEO] `SITE_URL`, canonical, OG, sitemap, JSON-LD 기본 베이스를 `we.hannipmoney.com`으로 통일
- [아티클] `article.hannipmoney.com` 독립 기준을 폐기하고 `/articles`를 `we.hannipmoney.com/articles` 안으로 통합
- [리다이렉트] `qa/home/article/column.hannipmoney.com` 유입은 `we.hannipmoney.com`으로 308 이동 처리
- [슬러그] `docs/slug-spec.md` 추가: 한글 URL, 3~5 키워드, 50자 이내, 충돌 시 `-2`, `-3`
- [슬러그] `lib/slugs.ts`에 `generateSlug()`, `ensureUniqueSlug()` 추가
- [토픽] `lib/categories.ts`에 카테고리 UI label/emoji/topic slug 매핑을 직접 정의
- [토픽] 기존 영문 토픽 URL은 새 한글 토픽 URL로 영구 이동
- [질문] UUID로 `/q/[uuid]` 접근 시 실제 slug URL로 영구 이동
- [DB] 기존 질문 한글 slug 백필 초안 `docs/migration_korean_slugs.sql` 추가

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [x] Vercel `NEXT_PUBLIC_SITE_URL=https://we.hannipmoney.com` production env 교체
- [x] Vercel Domains에 `we.hannipmoney.com` 추가
- [x] hosting.kr DNS `A we -> 76.76.21.21` 추가
- [x] hosting.kr authoritative NS(`ns1~ns4.hosting.co.kr`)에서 `we.hannipmoney.com` A 응답 확인
- [x] `http://we.hannipmoney.com`은 Vercel 200 확인(`--resolve` 기준)
- [x] hosting.kr에서 `we` TTL을 180 -> 181로 수정 저장해 zone 재동기화 시도
- [x] hosting.kr에서 `we` A 레코드 삭제 후 `A we -> 76.76.21.21` 재생성 시도
- [x] A 재생성 후에도 `ns3.hosting.co.kr`의 일부 DNSSEC/EDNS 대형 버퍼 조회가 serial 15 NXDOMAIN을 반환해 `we`를 Vercel 권장 CNAME으로 전환
- [x] 현재 hosting.kr DNS 값: `CNAME we -> cname.vercel-dns.com`, TTL 180
- [x] `ns1~ns4.hosting.co.kr` 일반 조회에서는 `we.hannipmoney.com` CNAME/A 응답 확인
- [ ] `ns3.hosting.co.kr`의 DNSSEC/EDNS 응답 stale backend 해결 후 Vercel SSL 인증서 발급 확인

### 다음 작업자 TODO
- [ ] Vercel 인증서 재시도. 직전 상태: alias는 존재하고 `http://we.hannipmoney.com`은 Vercel 200이지만 cert 발급은 `DNS problem: NXDOMAIN looking up A for we.hannipmoney.com`으로 실패. `we` 레코드는 A 삭제/재생성 후 CNAME 전환까지 완료했으나, `ns3.hosting.co.kr`가 DNSSEC/EDNS 일부 조회(`+bufsize=2800/4096`)에서만 계속 serial 15의 NXDOMAIN을 반환함.
- [ ] hosting.kr 고객센터에 "`ns3.hosting.co.kr` DNSSEC/EDNS stale serial 15 NXDOMAIN" 권한 네임서버 동기화/캐시 삭제 요청. 이미 사용자가 승인한 범위에서 `we` 삭제/재생성 및 CNAME 전환은 완료했으므로 같은 작업 반복 금지.
- [ ] Supabase Auth Site URL / Redirect URLs에 `https://we.hannipmoney.com/**` 추가
- [ ] Google/Kakao OAuth Redirect URI에 `https://we.hannipmoney.com/api/auth/callback` 계열 추가
- [ ] Google Search Console에 `we.hannipmoney.com` property 등록 후 sitemap 제출
- [ ] `docs/migration_korean_slugs.sql`은 실행 전 중복 slug SELECT로 검토

---

## [2026-05-09] 대표 앱 주소를 home 서브도메인으로 변경
**작업자:** Codex
**태그:** #Domain #SEO #Auth #Vercel

### 변경사항
- [도메인] 대표 Q&A 앱 주소 기준을 `qa.hannipmoney.com`에서 `home.hannipmoney.com`으로 변경
- [호환] 기존 `qa.hannipmoney.com` 유입은 같은 경로의 `home.hannipmoney.com`으로 308 이동 처리
- [SEO] `SITE_URL` 기본값과 sitemap/canonical/JSON-LD 생성 기준을 `https://home.hannipmoney.com`으로 정렬
- [Auth] `/api/auth/callback`의 fallback origin도 `https://home.hannipmoney.com`으로 변경
- [Vercel] `NEXT_PUBLIC_SITE_URL` production 값을 `https://home.hannipmoney.com`으로 갱신

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [x] hosting.kr DNS `A home -> 76.76.21.21` 연결
- [x] Vercel Production Ready 및 `http://home.hannipmoney.com` 200 확인
- [x] Vercel 프로젝트 도메인 상태는 `verified: true` 확인
- [x] Vercel 인증서 발급 재시도 결과: `http_pretest_domain_not_resolving_to_vercel_error`
- [ ] `https://home.hannipmoney.com` 인증서 발급 완료 후 200 확인

### 다음 작업자 TODO
- [ ] hosting.kr `ns1.hosting.co.kr`에서 `home.hannipmoney.com` UDP 질의가 NXDOMAIN/빈 응답을 반환함. `ns2~ns4`/1.1.1.1/8.8.8.8은 A 레코드 확인됨. `ns1` UDP SOA serial이 12, TCP serial이 15로 갈라진 상태라 hosting.kr 네임서버 동기화가 병목
- [ ] Vercel 공식 문서 기준 서브도메인은 CNAME(`cname.vercel-dns-0.com`)도 가능하나, 현재 Vercel inspect는 `A home.hannipmoney.com 76.76.21.21`을 권장함. hosting.kr에서 `home` 레코드를 삭제 후 재생성하거나 CNAME 전환으로 `ns1` UDP 캐시를 갱신한 뒤 cert 재시도
- [ ] Supabase Auth / OAuth 제공자 redirect URL에 `https://home.hannipmoney.com/api/auth/callback` 계열이 필요한지 로그인 실테스트로 확인
- [ ] Search Console 기준은 `home.hannipmoney.com`으로 등록하고 `qa.hannipmoney.com`은 레거시 이동 주소로만 유지

---

## [2026-05-09] 칼럼 명칭을 아티클로 변경
**작업자:** Codex
**태그:** #Article #Naming #SEO #Subdomain

### 변경사항
- [네이밍] 서비스 메뉴/홈/SEO 명칭을 `칼럼`에서 `아티클`로 변경
- [라우팅] 정식 목록 경로를 `/articles`로 추가하고 기존 `/columns`는 `/articles`로 영구 이동 처리
- [도메인] `article.hannipmoney.com` 루트 접근 시 `/articles`로 rewrite되도록 middleware 추가
- [호환] 기존 `column.hannipmoney.com` 루트도 당분간 `/articles`로 유지 연결
- [SEO] 아티클 canonical/OG/sitemap 기준 URL을 `https://article.hannipmoney.com`으로 변경

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [x] Vercel에 `article.hannipmoney.com` 추가 및 hosting.co.kr DNS `A article -> 76.76.21.21` 연결

### 다음 작업자 TODO
- [ ] 아티클 상세 페이지 `/articles/[slug]`와 Q&A 내부링크 연결
- [ ] 기존 Slack/문서에서 `칼럼` 표현을 운영 용어 기준으로 점진 정리

---

## [2026-05-09] IA 1차 정렬 — 공통 앱 골격 도입
**작업자:** Codex
**태그:** #IA #AhaReference #Navigation #MobileUX #UI

### 변경사항
- [IA] Claude의 `재테크한입-IA-redesign.md` 방향 반영: 홈 골격을 토픽/스파링/칼럼에도 이식하는 쪽으로 1차 정렬
- [공통] `components/AppShell.tsx` 추가
  - PC 공통 네비: 홈 / 토픽 / 스파링 / 칼럼 / 미션 / 검색 / 알림 / 나도 질문하기
  - 모바일 공통 상단 네비 + 하단 탭바: 홈 / 토픽 / 질문 / 스파링 / 마이
  - 헤더 아래 한 줄 슬로건 추가
- [공통] `UnifiedFilterBar` 추가
  - 페이지별 탭 이름은 다르지만 위치/간격/카테고리 칩은 같은 패턴 사용
- [토픽] `/topics/[slug]`를 AppShell 기반으로 교체
- [스파링] `/sparring`을 AppShell 기반으로 교체
- [칼럼] `/columns`를 AppShell 기반으로 교체
- [토큰] `lib/ia.ts`에 공통 카테고리/탭 구성을 분리

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [x] 로컬 `/topics/stocks-etf`, `/sparring`, `/columns`에서 공통 헤더/슬로건/필터/모바일 하단탭 HTML 노출 확인

### 다음 작업자 TODO
- [ ] 홈 `HomeClient`도 AppShell/UnifiedFilterBar 내부 구조로 점진 통합
- [ ] QnACard/TopicCard/SparringCard/ColumnCard를 별도 컴포넌트로 추출
- [ ] 홈을 큐레이션 허브로 재배치: 스파링 → Q&A → 추천 토픽 → 칼럼
- [ ] 같은 topicId 기반 Q&A/스파링/칼럼 cross-link 추가

---

## [2026-05-09] 칼럼 서브도메인 준비 + 주식·ETF 정보창/태그 UX
**작업자:** Codex
**태그:** #Column #Subdomain #ETF #QuestionUX #SEO

### 변경사항
- [도메인] `column.hannipmoney.com` 루트 접근 시 `/columns`로 rewrite되도록 middleware 추가
- [칼럼] `/columns` 페이지 추가: 주식·ETF·절세 칼럼 목록, CollectionPage/Article JSON-LD, canonical/OG 메타 구성
- [홈] PC/모바일 홈에 `주식·ETF 읽기창` 추가
  - S&P500 ETF, 국내 상장 ETF, 배당 ETF를 빠르게 읽고 검색/질문 맥락으로 이어지게 설계
- [질문작성] `주식·ETF` 카테고리 선택 시 `S&P500`, `나스닥100`, `미국 ETF`, `배당 ETF` 등 태그 선택 가능
- [DB] 미래 `questions.tags text[]` 전환용 `docs/migration_question_tags.sql` 추가
  - 현재 DB에 `tags` 컬럼이 없어도 질문 등록이 실패하지 않도록 fallback 처리
- [내비게이션] 기존 `잉크` 임시 메뉴를 `칼럼`으로 교체하고 `/columns`에 연결

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [x] 로컬 `/columns` 200 확인
- [x] 로컬 `Host: column.hannipmoney.com /` 접근 시 칼럼 페이지 rewrite 확인
- [x] 로컬 홈 HTML에 `주식·ETF 읽기창`, `ETF 정보 보기`, `칼럼` 노출 확인

### 다음 작업자 TODO
- [ ] Vercel에 `column.hannipmoney.com` 추가 후 hosting.co.kr DNS `A column -> 76.76.21.21` 연결
- [ ] Supabase SQL Editor에서 `docs/migration_question_tags.sql` 실행해 태그를 DB 정식 컬럼으로 승격
- [ ] 칼럼 상세 페이지 `/columns/[slug]`와 Q&A 내부링크 연결

---

## [2026-05-09] 운영 시드 질문/답변 콘텐츠 보강
**작업자:** Codex
**태그:** #SeedContent #HomeFeed #AnswerUX #SEO

### 변경사항
- [콘텐츠] 샘플 질문을 4개 → 8개로 확장하고 작성일, 조회수, 좋아요, 답변 수를 운영 중인 서비스처럼 자연스럽게 분산
- [콘텐츠] 질문별 주요 답변 seed를 추가해 DB 답변이 비어 있어도 상세/SEO에 밀도 있는 답변이 노출되도록 보강
- [홈] Supabase에 남아 있는 `dld`, `test` 등 얇은 테스트성 질문은 홈 피드에서 제외
- [홈] DB 질문이 적을 때 운영 시드 질문을 함께 섞어 빈집처럼 보이지 않게 처리
- [상세] DB에 같은 slug의 임시 질문이 있으면 화면 표시용 제목/본문/날짜/지표는 운영 시드 콘텐츠로 보정
- [상세] 실제 답변 row가 없고 시드 답변만 표시될 때 답변 목록 제목을 `주요 답변 N개`로 표시

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [ ] 라이브 홈에서 테스트성 글 제외 + 운영 시드 질문 노출 확인
- [ ] 라이브 `/q/monthly-300`에서 주요 답변/SEO 요약 확인

### 다음 작업자 TODO
- [ ] Supabase 운영 DB에 시드 질문/답변을 실제 row로 넣을지 결정
- [ ] seed 콘텐츠를 관리자 화면 또는 CMS로 관리하는 구조 검토

---

## [2026-05-09] 질문/답변 SEO S급 정규화 레이어
**작업자:** Codex
**태그:** #SEO #QAPage #검색노출 #질문상세

### 변경사항
- [SEO] 사용자 질문이 짧거나 어색해도 검색 의도가 드러나도록 SEO 제목/설명/키워드 생성기 `lib/seo-content.ts` 추가
- [SEO] 질문 상세 metadata title/description/OG/Twitter를 원문 그대로가 아니라 카테고리·본문·답변 맥락 기반으로 정규화
- [SEO] QAPage JSON-LD의 `name`, `text`, `description`, `keywords`, 답변 본문을 검색 친화적으로 정리
- [SEO] 채택/주요 답변 발췌를 JSON-LD `abstract`에 반영
- [SEO] BreadcrumbList JSON-LD 추가
- [콘텐츠] 질문 상세 본문에 검색엔진과 사용자가 함께 읽을 수 있는 `핵심 요약` 블록 추가

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [ ] 라이브 질문 상세 HTML에서 `핵심 요약`, QAPage, BreadcrumbList 확인

### 다음 작업자 TODO
- [ ] 질문 작성/답변 작성 시점에 SEO title/summary를 DB에 캐시하는 구조 검토
- [ ] Search Console에서 노출 쿼리 기반 키워드 사전 고도화

---

## [2026-05-09] 자동번역 MVP + 스파링 페이지 업그레이드
**작업자:** Codex
**태그:** #번역 #글로벌 #스파링 #UX #OpenAI

### 변경사항
- [번역] 영어권 브라우저에서 버튼 없이 질문/답변/댓글을 미국 Reddit 톤의 영어로 자동 표시
- [번역] `/api/translate` 추가: OpenAI Responses API 기반 번역, 숫자/금리/상품명 보존 프롬프트 적용
- [번역] `public.translations` 캐시용 `docs/migration_translations.sql` 추가
- [번역] 홈 피드와 질문 상세에 작은 `Translated` 배지만 표시하고, 큰 영어 버튼은 만들지 않음
- [스파링] `/sparring` 페이지 추가: 주제 선택, 찬반 선택, 반대논리, 체크리스트, 판단 준비도 슬라이더
- [내비게이션] 홈/질문 상세의 토픽·스파링 링크를 실제 경로로 연결

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [x] 로컬 `/sparring` 200 확인
- [x] 로컬 `/api/translate` fallback 응답 확인
- [ ] Vercel `OPENAI_API_KEY`, `OPENAI_TRANSLATION_MODEL` 설정
- [ ] Supabase SQL Editor에서 `docs/migration_translations.sql` 실행
- [ ] 영어 브라우저에서 홈/질문 상세 자동번역 확인

### 다음 작업자 TODO
- [ ] 번역 품질 로그를 보고 용어집(ISA, 연금저축, 전세대출 등) 고도화
- [ ] 스파링 결과를 질문/투표 데이터와 연결

---

## [2026-05-09] 경제형 랜덤닉네임 도입
**작업자:** Codex
**태그:** #Auth #닉네임 #운영정책 #DB

### 변경사항
- [Auth] 로그인 유저 표시명을 OAuth 실명/이메일 대신 경제형 랜덤닉네임으로 표시
  - 예: `신림동의현인`, `소현버핏`, `판교배당수집가`
- [Auth] 로그인 직후 `public.users.name`이 비어 있거나 OAuth 기본 이름이면 랜덤닉네임으로 동기화
- [DB] Supabase 트리거에서도 신규 회원 기본 이름을 랜덤닉네임으로 저장하도록 `docs/migration_random_nicknames.sql` 추가
- [운영] 유동성 공급은 여러 가짜 유저처럼 보이게 하기보다 운영/시드 답변 원칙을 지키는 방향 권장

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [ ] Supabase SQL Editor에서 `docs/migration_random_nicknames.sql` 실행
- [ ] Google/Kakao 로그인 후 `public.users.name` 랜덤닉네임 반영 확인

### 다음 작업자 TODO
- [ ] 프로필 편집 화면이 생기면 사용자가 닉네임을 직접 바꿀 수 있게 열기
- [ ] 운영 답변 계정은 내부 운영 주체임을 숨기지 않는 문구/배지 정책 검토

---

## [2026-05-09] 답변 SEO + 토픽 페이지 추가
**작업자:** Codex
**태그:** #SEO #AhaReference #TopicPage #StructuredData

### 변경사항
- [SEO] 질문 상세 QAPage 구조화 데이터에 `acceptedAnswer`/`suggestedAnswer` 추가
- [SEO] 카테고리/토픽 랜딩 페이지 추가
  - `/topics/finance-basics`
  - `/topics/stocks-etf`
  - `/topics/tax-saving`
  - `/topics/insurance`
  - `/topics/debt-loans`
- [SEO] `/sitemap.xml`에 토픽 페이지 URL 추가
- [SEO] 토픽 페이지에 CollectionPage + ItemList 구조화 데이터 추가
- [SEO] 추후 `hannipmoney.com` 서브도메인 이전을 대비해 `NEXT_PUBLIC_SITE_URL` 기준 canonical/sitemap 생성 가능하게 변경
- [DB] 테스트 질문 정리용 `scripts/cleanup-test-questions.mjs`, `docs/cleanup-test-questions.sql` 추가
- [운영] 하루 1개 답변 운영 루프 문서 `docs/daily-answer-loop.md` 추가

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [x] 라이브 `/topics/finance-basics` 200 확인
- [ ] 라이브 `/q/[slug]` JSON-LD에 답변 데이터 포함 확인
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 있는 환경에서 테스트 질문 정리 실행

### 다음 작업자 TODO
- [ ] 한입머니 서브도메인 연결 시 Vercel `NEXT_PUBLIC_SITE_URL`와 Search Console 갱신
- [ ] 실제 토픽 메뉴를 홈 네비게이션에 연결
- [ ] 하루 1개 운영 답변용 질문 선정표 만들기

---

## [2026-05-09] 아하형 질문 상세 SEO 강화
**작업자:** Codex
**태그:** #SEO #AhaReference #SSR #InternalLink

### 변경사항
- [SEO] 질문 상세 `/q/[slug]`가 서버에서 질문/답변/유사 질문 초기 데이터를 받아 HTML에 바로 노출되도록 개선
- [SEO] 홈 질문 카드 제목, 질문 상세 유사 질문, 프로필 질문/답변 목록을 실제 `<a href>` 링크로 노출
- [SEO] `dld`, `test`, `asdf`처럼 얇은 테스트성 질문은 sitemap 제외 + 상세 메타 `noindex, follow` 처리
- [SEO] 테스트성 질문은 유사 질문 내부링크에서도 제외
- [Data] 질문 상세 서버용 데이터 로더 `lib/question-detail.ts` 추가

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과
- [ ] 라이브 `/q/monthly-300` HTML에 질문 제목/본문이 스피너보다 먼저 노출되는지 확인
- [ ] 라이브 `/sitemap.xml`에서 테스트성 질문이 빠졌는지 확인

### 다음 작업자 TODO
- [ ] Supabase service role로 실제 테스트 질문 row 삭제 여부 결정
- [ ] 답변 본문까지 구조화 데이터 `acceptedAnswer`/`suggestedAnswer`로 확장 검토

---

## [2026-05-09] 질문 URL SEO 고도화
**작업자:** Codex
**태그:** #SEO #질문작성 #URL

### 변경사항
- [SEO] 질문 제목 기반 slug 생성기를 `lib/slugs.ts`로 분리
  - 공백/특수문자 정리, 중복 하이픈 제거, 너무 긴 URL 방지
  - 긴 타임스탬프 대신 짧은 base36 suffix 사용
- [UX/SEO] 홈 질문하기에서 질문 등록 후 새 질문 상세 `/q/[slug]`로 바로 이동
- [UX/SEO] 질문 상세 내 질문하기 모달도 등록 후 새 질문 상세로 바로 이동

### 확인
- [x] `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과

### 다음 작업자 TODO
- [ ] 기존 DB 질문 중 slug가 UUID/빈 값인 데이터 정리 여부 결정
- [ ] 중복 slug 충돌이 실제로 발생하면 DB unique 정책 또는 재시도 로직 추가

---

## [2026-05-09] SEO 기본 업로드
**작업자:** Codex
**태그:** #SEO #검색노출 #NextJS

### 변경사항
- [SEO] `app/robots.ts` 추가: `/robots.txt`에서 전체 공개, `/api`, `/auth` 제외, sitemap 연결
- [SEO] `app/sitemap.ts` 추가: 홈 + 질문 상세 URL을 `/sitemap.xml`로 노출
- [SEO] 질문 상세 `/q/[slug]`에 canonical, Open Graph, Twitter 메타, QAPage 구조화 데이터 추가
- [SEO] 질문 상세 title 중복 가능성을 줄이도록 `title`을 질문 제목 기준으로 정리
- [Infra] SEO 공통 상수/헬퍼를 `lib/seo.ts`로 분리

### 확인
- `npm_config_cache=/Users/yeho/Documents/New\ project/jaetechwhanip/.npm-cache npm run build` 통과

### 다음 작업자 TODO
- [ ] Vercel 최신 배포 READY 후 `/robots.txt`, `/sitemap.xml`, `/q/monthly-300` 라이브 확인
- [ ] Google Search Console에 `https://jaetechwhanip.vercel.app/sitemap.xml` 제출
- [ ] 운영 질문 수가 늘면 sitemap limit/페이지네이션 설계

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

## [2026-05-08] 홈 UI 일치 + 질문 상세 전면 개편
**작업자:** Claude Sonnet 4.6
**태그:** #UI개편 #UX수정 #오류수정 #배포

### 변경사항
- [UI] `app/q/[slug]/QuestionClient.tsx` + `QuestionClient.module.css` 전면 재작성
  - 홈과 동일한 `pcNav` 구조: Cafe24Ssurround 폰트 로고, 메뉴 구분선, "나도 질문하기" 파란 버튼
  - 유저 아바타 드롭다운 (내 프로필 + 로그아웃) — 홈과 완전 동일
  - 카테고리 `<h1>` 제거 → `catChip` (파란 알약형 칩) 브레드크럼으로 교체
  - 질문 액션: 도움돼요/답변수/저장/공유 알약형 버튼, 활성 상태 파란 테두리 표시
  - 답변 에디터: 로그인 유저 초록 아바타 + 최소 20자 유효성
  - 답변 카드: 이모지 아바타, 본인 답변 삭제 버튼, 좋아요/댓글/채택 버튼 일관 스타일
  - 댓글: DB 로드, Enter 등록, 본인 × 삭제 버튼
  - 모바일: 하단 탭 네비 + FAB 홈과 동일 구조
  - 질문하기 모달 인라인 포함
- [Fix] 이전 상세 페이지의 다양한 UI 오류 및 홈과의 스타일 불일치 해소
- [CSS] `QuestionClient.module.css` — CSS 변수(`--blue`, `--t1` 등) 기반으로 전면 정리

### 빌드/배포 확인
- ✅ `npm run build` 통과 (커밋 `545e586`)
- ✅ Vercel production READY — https://jaetechwhanip.vercel.app/q/monthly-300 실확인
- ✅ 네비게이션, 카테고리 칩, 질문 카드, 답변 에디터, 사이드바 모두 홈 스타일과 일치

### 다음 작업자 TODO
- [ ] 실제 DB 질문(monthly-300 외) 클릭 → 상세 페이지 진입 확인
- [ ] 로그인 후 좋아요 토글 + 댓글 입력 실동작 확인
- [ ] 질문 삭제 기능 (본인 질문)
- [ ] Google 로그인 앱 검증 진행

---

## [2026-05-08] DB 마이그레이션 실행 + 삭제 기능
**작업자:** Claude Sonnet 4.6
**태그:** #기능추가 #삭제 #DB마이그레이션완료

### 변경사항
- [DB] Supabase SQL Editor에서 마이그레이션 직접 실행 완료
  - `liked_questions`, `liked_answers`, `comments` 테이블 생성 + RLS 정책 적용
  - 이제 좋아요/댓글이 실제 DB에 저장됨
- [기능] 답변 삭제 — 본인 답변에만 "삭제" 버튼 표시 (빨간 테두리 스타일)
- [기능] 댓글 삭제 — 본인 댓글 우측에 "×" 버튼 표시
- [UI] 댓글 아이템 레이아웃 개선 (작성자명 + 본문 + 삭제버튼 한 줄)

### 빌드 확인
- ✅ `npm_config_cache=.npm-cache npm run build` 통과

### 다음 작업자 TODO
- [ ] 실로그인 후 좋아요 중복 방지 동작 확인 (다른 계정 2개로 테스트)
- [ ] 답변/댓글 삭제 실동작 확인
- [ ] 질문 삭제 기능 (홈 또는 질문 상세에서 본인 질문 삭제)
- [ ] Google 로그인 앱 검증 진행
- [ ] 카카오 비즈 인증 후 재활성화 여부 결정

---

## [2026-05-08] 좋아요 중복 방지 + 댓글 DB 저장
**작업자:** Claude Sonnet 4.6
**태그:** #기능추가 #DB #좋아요 #댓글

### 변경사항
- [기능] 질문/답변 좋아요 중복 방지 DB 기반으로 교체
  - `liked_questions(user_id, question_id)`, `liked_answers(user_id, answer_id)` 테이블 사용
  - 페이지 재진입 시 이전 좋아요 상태 복원 (로그인 유저)
  - 좋아요 토글 지원: 다시 누르면 취소
  - 마이그레이션 전(테이블 없는 경우) fallback으로 graceful 처리 — 앱 중단 없음
- [기능] 답변 댓글 DB 저장 (`comments` 테이블 연동)
  - 댓글 섹션 열 때 Supabase에서 실시간 로드
  - Enter 키로 등록 지원
  - 댓글 작성자 이름 표시
  - 마이그레이션 전 fallback — "마이그레이션 필요" 토스트

### ⚠️ 반드시 실행 필요: Supabase SQL 마이그레이션
**`docs/migration_likes_comments.sql`을 Supabase SQL Editor에서 실행해야 좋아요/댓글이 DB에 저장됩니다.**
- 실행 전까지는 앱이 fallback 모드로 동작 (기능은 제한되나 오류 없음)

### 빌드 확인
- ✅ `npm_config_cache=.npm-cache npm run build` 통과

### 다음 작업자 TODO
- [ ] **Supabase SQL Editor에서 `docs/migration_likes_comments.sql` 실행** (최우선)
- [ ] 실로그인 후 좋아요 중복 방지 동작 확인 (다른 계정 2개로 테스트)
- [ ] 댓글 입력 → 새로고침 후 유지 확인
- [ ] Google 로그인 앱 검증 진행
- [ ] 카카오 비즈 인증 후 재활성화 여부 결정

---

## [2026-05-08] Env 버그 수정 + 아하 스타일 업그레이드
**작업자:** Claude Sonnet 4.6
**태그:** #버그수정 #UI업그레이드 #배포

### 핵심 버그 수정
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` Sensitive 해제
  - Sensitive 설정 시 빌드 번들에 포함 안 됨 → 모든 Supabase 연결 실패
  - 기존 변수 삭제 → Sensitive OFF로 재등록 → Redeploy
  - **이게 어제부터 모든 기능이 안 되던 근본 원인**

### 기능 추가/개선
- 질문 상세 아하 스타일: 브레드크럼, 조회수, 도움돼요/저장/공유, 채택 뱃지, 관련 질문
- SEO generateMetadata (탭 제목에 질문 제목 표시)
- 홈: 검색, 무한스크롤(20개씩), 카테고리 DB 필터, Google full_name 이름 표시
- 사용자 프로필 `/u/[id]` 신규 (질문/답변 탭, 통계)
- DB: view_count, like_count 컬럼 추가

### 다음 작업자 TODO
- [ ] 답변 댓글 DB 저장 (parent_id 컬럼 필요)
- [ ] 좋아요 중복 방지 (liked_questions/liked_answers 테이블)
- [ ] Google 로그인 앱 검증
- [ ] 카카오 비즈 인증 후 재활성화

### RISK
- `NEXT_PUBLIC_` 변수 절대 Sensitive 설정 금지

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
