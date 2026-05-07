# 패치노트

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
