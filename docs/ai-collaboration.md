# AI 협업 원칙 v2 — 같은 룰을 쓰고 동기화하기

작성: 2026-05-09
대상: 이 레포에서 작업하는 모든 AI (Claude, Codex, GPT, 신규 AI 포함)
이전 버전: 슬랙 핀 메시지 "Claude Code 온보딩 가이드"

---

## 0. 사용자(예호님) 결정 우선순위

> UI 라벨, 메뉴명, 도메인, 카테고리, 톤 등 **사용자 향 결정**은 사용자(예호님)가 슬랙 또는 채팅에서 명시한 것이 최종이다. AI끼리 합의해서 바꾸지 않는다. 충돌 시 슬랙에 `❓ [결정 요청]` 으로 묻고 답변 기다린다.

예시:
- "칼럼 → 아티클" (Codex가 임의 결정) → "칼럼 → 피드" (예호 결정 시 이게 최종)
- "토스 감성" (구 ui-principles) → "a-ha 톤" (예호 결정 시 이게 최종)

---

## 1. 브랜치 / PR 워크플로우 (필수)

### 1-1. main 직접 push 금지
모든 변경은 feature 브랜치 → PR → review → merge.

```
main (production = we.hannipmoney.com)
  └ feat/... (개발 작업)
  └ fix/... (버그 수정)
  └ docs/... (문서만 수정)
  └ refactor/... (리팩토링)
```

브랜치 명명:
- `feat/sparring-comments` (스파링 댓글 시스템)
- `fix/oauth-kakao-scope` (카카오 스코프 버그)
- `docs/specs-v1` (스펙 문서 묶음)
- `refactor/extract-cards` (카드 컴포넌트 분리)

### 1-2. PR 생성 룰
- 제목: `[태그] 작업 한 줄 요약` (예: `[Feat] 스파링 댓글 찬성/반대 분리 컬럼`)
- 본문: 작업 내용 / 검증 방법 / 다음 작업자 TODO
- Vercel preview URL을 PR 본문에 명시 (Vercel이 자동 코멘트로 다는 것 확인)
- 코드 변경 시 `npm run build` 통과 후 PR

### 1-3. Merge 룰
- main에 merge 권한: **예호님** (또는 명시 위임된 AI)
- AI는 PR 만들고 슬랙 알림. 사용자가 preview URL 보고 OK 주면 merge.
- 머지 방법: **Squash and merge** (커밋 히스토리 깔끔)

### 1-4. 긴급 핫픽스 예외
프로덕션 다운 같은 긴급 상황만:
- `hotfix/...` 브랜치 → 빠른 PR → 즉시 merge
- 슬랙 `🚨 [HOTFIX]` 알림 필수

---

## 2. 문서 동기화 룰

### 2-1. SSOT (Single Source of Truth) 파일

| 영역 | SSOT 파일 |
|---|---|
| 카테고리 | `docs/categories.md` |
| 슬러그 룰 | `docs/slug-spec.md` |
| UI 톤 | `docs/ui-principles.md` |
| IA 구조 | `docs/ia-redesign.md` |
| 피드 (칼럼+RSS) | `docs/feed-page-spec.md` |
| 관리자 | `docs/admin-spec.md` |
| 기타 페이지 | `docs/pages-polish-spec.md` |
| 협업 룰 (이 문서) | `docs/ai-collaboration.md` |
| 도메인/계정/현황 | `docs/context.md` |
| 작업 히스토리 | `docs/patch-notes.md` |

**룰:**
- 어떤 결정이 여러 문서에 영향 가면 SSOT 파일 먼저 수정 → 다른 문서는 SSOT 참조
- 카테고리 변경? `docs/categories.md` 만 수정. 다른 문서는 "categories.md 참조"라고만 적기.
- SSOT 파일 변경 시 **반드시 patch-notes에 항목 추가** + 영향 범위 명시.

### 2-2. patch-notes.md 형식 (모든 AI 통일)

```markdown
## [YYYY-MM-DD] 작업 제목 (한 줄)
**작업자:** Claude | Codex | GPT
**태그:** #영역 #영역 ...

### 변경사항
- [구분] 무엇을 어떻게

### 확인
- [x] build 통과
- [x] preview URL 동작 확인
- [ ] 외부 의존성 (DNS 등) 미해결이면 명시

### 다음 작업자 TODO
- [ ] 이 작업 후속으로 누가 무엇

---
```

가장 위에 최신 항목, 시간 역순. 절대 기존 항목 삭제 금지 (append-only).

### 2-3. 충돌 발생 시
- 같은 파일을 여러 AI가 수정 → PR 병합 시 conflict 해결한 AI가 patch-notes에 명시
- 의미적 충돌 (Codex가 "아티클" 도입했는데 Claude가 "피드"로 변경 등) → 슬랙 `❓ [결정 요청]`으로 사용자 결정 받음

---

## 3. 슬랙 통신 룰

### 3-1. 메시지 형식
- ✅ **완료 보고:** `✅ [영역] 작업명 — 작업자` + 3-5 불릿
- 🚨 **긴급요청:** `🚨 [긴급요청] 제목` + 상세 (다른 AI에게 전달)
- ❓ **결정 요청:** `❓ [결정 요청] 질문` + 옵션 A/B/C — 예호님 답변 대기
- 🔑 **키 요청:** `🔑 [서비스] 키 요청 — 작업명` — 사용 목적 한 줄
- 🔒 **잠금 선언:** `🔒 [영역/파일] 작업 시작 — 작업자, 예상 시간` — 충돌 방지
- 📌 **정보 공유:** `📌 [정보] ...` — 작업 결과 외 참고 사항

### 3-1-a. ⭐ 완료 보고 필수 양식 (혼동 방지)

**모든 ✅ 완료 보고는 두 URL을 같이 적어야 한다:**

```
✅ [영역] 작업명 — 작업자

작업 내용 3-5 불릿

🧪 테스트 서버 (이 변경 검증용):
https://jaetechwhanip-git-{브랜치이름}-yeholees-projects.vercel.app

🌐 본서버 (현재 운영중, 비교용):
https://we.hannipmoney.com

PR 링크: https://github.com/yeholee2/jaetechwhanip/pull/new/{브랜치이름}
```

**왜:**
- 테스트 서버 = 작업한 결과만 들어있음. 검증할 때 이 링크.
- 본서버 = 머지 전 비교용. 차이를 눈으로 확인 가능.
- 헷갈려서 본서버 링크만 주면 사용자는 "어? 변경 안 됐는데?" 함.

**예시 (스파링 v1 작업 완료 시):**
```
✅ [Sparring] 댓글·투표 시스템 v1 — Codex

• 라운드 번호 자동 시리얼 + 양측 투표 카드 + 카운트다운
• 댓글: 사이드 뱃지 + 투표 항목별 필터, 투표 후 작성 lock 정책
• /admin/sparring 작성 폼 + 색상 polarity 자동 추론
• Supabase migration_sparring_v1.sql 실행 필요 (예호님)

🧪 테스트 서버: https://jaetechwhanip-git-feat-sparring-v1-yeholees-projects.vercel.app/sparring
🌐 본서버 (비교): https://we.hannipmoney.com/sparring
PR: https://github.com/yeholee2/jaetechwhanip/pull/new/feat/sparring-v1
```

**브랜치 이름 슬러그화 (Vercel URL용):**
- `feat/sparring-v1` → `feat-sparring-v1`
- `fix/q-detail-cleanup` → `fix-q-detail-cleanup`
- 슬래시(`/`)는 하이픈(`-`)으로, 그 외는 그대로

### 3-2. 상세는 docs, 슬랙은 알림용
- 슬랙 메시지는 3-5분 안에 읽는 분량
- 상세 (긴 코드, 표, 알고리즘)는 docs/*.md 에. 슬랙엔 "상세는 `docs/admin-spec.md`" 링크만.

### 3-3. 키/시크릿 절대 슬랙에 평문 X
- 키는 Vercel env 또는 1Password 같은 시크릿 매니저
- 슬랙으로 키 공유해야 한다면 `🔑 [Ghost] 키 요청`으로 말하고 사용자가 DM이나 secure 방식으로 직접 등록

---

## 4. 작업 잠금 (충돌 방지)

여러 AI가 동시에 같은 파일 만지면 코드 덮어씀. **잠금 선언 후 작업.**

### 4-1. 잠금 단위
- 파일 단위: `🔒 [components/HomeClient.tsx] 카드 추출 작업 — Codex, ~30분`
- 폴더 단위: `🔒 [app/admin/*] admin 페이지 작업 — Claude, ~2시간`
- 문서 단위: `🔒 [docs/feed-page-spec.md] 갱신 — Claude, ~10분`

### 4-2. 해제
작업 완료 시 ✅ 보고로 자연 해제. 30분 이상 진척 없으면 다른 AI가 슬랙에 "잠금 만료?" 확인 후 가져갈 수 있음.

### 4-3. 동시 수정 안전 영역
- 새 파일 생성 (서로 안 겹침)
- 자기 PR 브랜치 안에서의 작업
- patch-notes append (각자 새 항목 추가, 위치만 시간순으로 맞으면 OK)

---

## 5. 코드 작성 룰

### 5-1. 빌드 검증 필수
모든 PR 전에 `npm_config_cache=.npm-cache npm run build` 통과 확인.

### 5-2. 환경 변수
- 키는 `process.env.XXX`로만 접근, 코드 하드코딩 금지
- 새 env 추가 시 `docs/context.md` "키 정보" 표 갱신 + Vercel env 등록 (예호 작업)
- 로컬 테스트용 `.env.local` 은 git 커밋 X (`.gitignore`)

### 5-3. SSOT 참조
- 카테고리는 `lib/categories.ts`만 import. 어디에서도 하드코딩 X
- 슬러그는 `lib/slugs.ts`만 사용
- UI 토큰은 `globals.css` (또는 토큰 파일)만 참조

### 5-4. SQL 마이그레이션
- 새 테이블/컬럼은 `docs/migration_<주제>.sql` 파일로 패치
- 실행 전 `SELECT DISTINCT ...`로 영향 범위 점검
- 운영 DB 적용은 예호님이 직접 실행 (자동 적용 X)

---

## 6. 절대 금지

- ❌ main 직접 push (긴급 hotfix 제외)
- ❌ 다른 AI의 미커밋 작업물 덮어쓰기
- ❌ docs/patch-notes.md 항목 삭제 (append-only)
- ❌ 키/시크릿 평문 슬랙 또는 코드 커밋
- ❌ prod DB 임의 삭제/대량 UPDATE (예호님 승인 필수)
- ❌ SSOT 무시하고 자체 룰 적용 (카테고리·슬러그·UI톤 등)
- ❌ 사용자 결정 없이 UI 라벨/메뉴명 임의 변경 (예: "칼럼" 임의로 "아티클"로 바꾸기 — 슬랙 결정 후에만)

---

## 7. 새 AI 온보딩 (이 레포 처음 들어왔다면)

1. **이 문서 끝까지 읽기** — 룰 모르면 다른 AI 작업 다 망가뜨림
2. `docs/context.md` 읽기 — 서비스 개요·도메인·키 정보
3. `docs/patch-notes.md` 상단 5개 읽기 — 최근 무슨 일 있었나
4. SSOT 파일들 훑어보기 — `categories.md`, `slug-spec.md`, `ui-principles.md`, `ia-redesign.md`
5. 슬랙 채널(`#디지털노예-소통방-재테크한입`) 최근 20개 메시지 스캔
6. 본인 이름(어느 AI인지) + 작업 시작 인사 슬랙 한 줄

---

## 변경 이력
- v1: 슬랙 핀 메시지 (Claude Code 온보딩 가이드)
- v2 (2026-05-09): 정식 문서화. 브랜치/PR 워크플로우, SSOT, 잠금, 사용자 결정 우선순위 명시.
