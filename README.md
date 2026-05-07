# 재테크한입

> 돈 고민, 여기서 해결 — 금융 특화 Q&A 커뮤니티

**라이브:** https://jaetechwhanip.vercel.app (Vercel 배포 후 업데이트)
**레거시:** https://yeholee2.github.io/jaetechwhanip (GitHub Pages, 정적 버전)

---

## 🛠️ 기술 스택

| 항목 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) |
| 호스팅 | Vercel (무료) |
| DB + Auth | Supabase (무료) |
| 스타일 | CSS Modules + 디자인 토큰 |
| 아이콘 | Lucide React |
| 이모티콘 | Tossface |
| 로고 폰트 | Cafe24 Ssurround |

---

## 🚀 로컬 실행

```bash
git clone https://github.com/yeholee2/jaetechwhanip.git
cd jaetechwhanip
npm install
cp .env.example .env.local
# .env.local에 Supabase 키 입력
npm run dev
# http://localhost:3000
```

---

## 🔑 환경변수 설정 (Supabase 연동 후)

`.env.local` 파일 생성:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Vercel 대시보드 → Settings → Environment Variables에도 동일하게 등록

---

## 🌿 브랜치 전략

```
main   → Vercel 자동 배포 (실 서비스)
dev    → 개발/테스트
feature/xxx → 기능별 작업
```

**업데이트 흐름:**
1. `dev` 브랜치에서 작업
2. Vercel preview URL로 테스트
3. `main`에 머지 → 자동 배포

---

## 🔐 OAuth 설정 가이드

### 구글
현재 프로덕션 로그인은 Google만 유지합니다.

1. https://console.cloud.google.com → OAuth 2.0 클라이언트 생성
2. Redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. Supabase → Auth → Providers → Google에 키 입력
4. Google 앱 검증 전에는 "확인되지 않은 앱" 경고가 표시될 수 있음

### 카카오
로그인 UI는 활성화되어 있습니다. 실제 동작하려면 Kakao Developers와 Supabase Provider 설정이 맞아야 합니다.

1. https://developers.kakao.com → 앱 생성
2. 카카오 로그인 활성화
3. Redirect URI: `https://fqoeacfkzptlzohdzhgd.supabase.co/auth/v1/callback`
4. Supabase → Auth → Providers → Kakao에 REST API 키와 Client Secret 입력
5. 운영 사이트 콜백은 `/api/auth/callback`이 세션 교환 후 `NEXT_PUBLIC_SITE_URL`로 이동 처리

### 네이버
최신 코드에서는 네이버 Custom OAuth 라우트가 제거되어 있습니다. 다시 켤 경우 `/api/auth/naver`와 콜백 라우트를 새 결정에 맞춰 복구해야 합니다.

---

## 🗺️ 서브도메인 연결

도메인 DNS CNAME 추가:
```
CNAME  jaetechwhanip  →  cname.vercel-dns.com
```
Vercel → Settings → Domains → `jaetechwhanip.yeholee.com` 추가

---

## 📋 패치노트

> **다음 작업자에게:** 아래 형식으로 이어서 작성해주세요 👇

---

### [2026-05-06] 레거시 정적 사이트 (GitHub Pages)

- HTML/CSS/JS 단일 파일 구조
- 아하 UI 클로닝 (모바일/PC 반응형)
- Tossface 이모티콘, Lucide 아이콘
- 로그인 뷰 (position:fixed 오버레이)
- 카카오/네이버/Google 소셜 버튼 (더미)
- AI 질문 다듬기 (Anthropic API 직접 호출)
- 미디어쿼리 768px 기준 반응형

**파일:** `legacy/index.html`

---

### [2026-05-06] OAuth 연동 완료

**카카오 OAuth ✅**
- 앱 ID: 1449623
- REST API 키 발급 및 Supabase 등록
- Redirect URI: https://fqoeacfkzptlzohdzhgd.supabase.co/auth/v1/callback
- Client Secret 등록 완료
- 상태: 실제 로그인 동작 ✅

**Google OAuth ✅**
- 프로젝트: hannipmoney-indexing (imyeho@gmail.com)
- 클라이언트: 재테크한입 (901777384682-ab607...)
- Redirect URI 등록 완료
- 상태: 동작하나 "확인되지 않은 앱" 경고 표시 중
  → Google 앱 검증 신청 후 해결 예정 (실서비스 오픈 전)
  → 지금은 "고급 > 계속" 으로 우회 가능

**남은 작업:**
- [ ] 네이버 로그인 (Custom OAuth, 추후)
- [ ] Supabase DB 테이블 생성 (questions, answers, users)
- [ ] 질문 실제 저장 연동
- [ ] Google 앱 검증 신청 (실서비스 오픈 전)

---

### [2026-05-06] Next.js + Vercel + Supabase 마이그레이션 시작

**변경 이유:** SEO, 실제 로그인 연동, DB 연결, 서브도메인 지원

**추가된 파일:**
- `app/layout.tsx` — SEO 메타데이터 (og, twitter, robots)
- `app/page.tsx` — 홈 (SSG, 60초 revalidate)
- `app/auth/page.tsx` — 로그인 페이지
- `app/questions/[slug]/page.tsx` — 질문 상세 (SSG, SEO)
- `app/api/auth/callback/route.ts` — OAuth 콜백
- `components/HomeClient.tsx` — 홈 UI (React)
- `components/AuthClient.tsx` — 로그인 UI (Supabase OAuth)
- `lib/supabase/client.ts` — 브라우저 Supabase 클라이언트
- `lib/supabase/server.ts` — 서버 Supabase 클라이언트
- `middleware.ts` — 세션 갱신
- `.env.example` — 환경변수 템플릿

**남은 작업 (yeholee2 직접):**
- [ ] Vercel 계정 생성 (imyeho@gmail.com)
- [ ] GitHub repo 연결
- [ ] Supabase 프로젝트 생성 + 키 발급
- [ ] 카카오/구글 OAuth 키 발급
- [ ] `.env.local` 및 Vercel env 등록
- [ ] 서브도메인 DNS 설정

---
