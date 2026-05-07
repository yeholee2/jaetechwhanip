# 재테크한입 — 프로젝트 컨텍스트

## 한 줄 요약
금융 특화 Q&A 커뮤니티. "아하" 스타일 UI, 토스 감성 디자인.

## 기술 스택
| 항목 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) |
| 스타일 | CSS Modules + Pretendard + Cafe24 Ssurround (로고) |
| DB/Auth | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel (GitHub push → 자동배포) |
| 아이콘 | Lucide React |
| 이모티콘 | Tossface |

## 키 정보
| 항목 | 값 |
|---|---|
| GitHub | `yeholee2/jaetechwhanip` |
| 라이브 | https://jaetechwhanip.vercel.app |
| Supabase Project ID | `fqoeacfkzptlzohdzhgd` |
| Vercel 계정 | `yeholees-projects` (imyeho@gmail.com) |

## OAuth 현황
| Provider | 상태 | 비고 |
|---|---|---|
| Google | ✅ 동작 | "확인되지 않은 앱" 경고 (검증 전) |
| 네이버 | ✅ Custom OAuth | `/api/auth/naver` 라우트 |
| 카카오 | ❌ 비활성 | 비즈 인증 필요 (account_email 권한) |

## DB 스키마
```
public.users       -- id, email, name, avatar_url, created_at
public.questions   -- id, title, body, category, slug, author_id, created_at, answer_count
public.answers     -- id, question_id, body, author_id, is_adopted, created_at
```
- RLS: 누구나 읽기 / 본인만 쓰기
- 트리거: 로그인 시 auth.users → public.users 자동 생성

## 파일 구조
```
app/
  page.tsx                          # 홈 (SSG, revalidate=60)
  auth/page.tsx                     # 로그인 페이지
  api/auth/callback/route.ts        # Google OAuth 콜백
  api/auth/naver/route.ts           # 네이버 OAuth 시작
  api/auth/naver/callback/route.ts  # 네이버 콜백 (매직링크)
components/
  HomeClient.tsx                    # 홈 UI
  AuthClient.tsx                    # 로그인 UI
lib/supabase/
  client.ts                         # 브라우저 Supabase
  server.ts                         # 서버 Supabase
```

## ⚠️ 절대 건드리면 안 되는 것
- Google Cloud `hannipmoney-indexing` 프로젝트의 **Apps Script** (5/5 생성) — 블로그 인덱싱 자동화
- 재테크한입 OAuth 클라이언트만 수정할 것

## AI 작업 규칙
1. 작업 전 이 문서 + `patch-notes.md` 최근 기록 읽기
2. 다른 AI 작업물 불확실하면 **먼저 물어보기**
3. 작업 후 `patch-notes.md`에 기록, Slack에 3줄 요약
4. 민감한 키는 코드에 절대 하드코딩 금지 — Vercel env 참조
