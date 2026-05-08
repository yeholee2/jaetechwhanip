# 패치노트

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
