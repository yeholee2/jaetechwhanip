# 패치노트

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
