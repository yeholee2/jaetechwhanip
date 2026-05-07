# 패치노트

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
