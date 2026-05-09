# 관리자 페이지 스펙

작성: 2026-05-09
대상: GPT/Codex
라우트: `we.hannipmoney.com/admin/*`
접근: `users.role = 'admin'` 만 허용

---

## 0. 권한 모델 (전제)

```sql
ALTER TABLE public.users ADD COLUMN role text DEFAULT 'user';
-- 'user' | 'expert' | 'admin'
```

**RLS 정책 (admin):**
```sql
CREATE POLICY admin_all ON public.[any_table]
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

**미들웨어 (`middleware.ts` 또는 layout):**
```ts
// /admin/* 접근 시
if (user.role !== 'admin') redirect('/')
```

**초기 admin 지정:**
- 예호님 계정(imyeho@gmail.com)을 직접 `UPDATE users SET role='admin' WHERE email='imyeho@gmail.com';` 로 시드

---

# 🔴 v1 — High Priority (먼저 만들 것)

3개. 운영자가 매일 콘텐츠 시드하려면 반드시 필요.

## v1-A. 스파링 라운드 관리 (`/admin/sparring`)

**목록 페이지 (`/admin/sparring`):**
```
[새 라운드 만들기 →]

[필터: 진행중 / 마감임박 / 종료]
[테이블]
| 라운드# | 제목 | 카테고리 | 시작 | 마감 | 투표수 | 댓글수 | 상태 | 액션 |
| 12 | ISA vs 연금저축 | 절세 | 5/9 | 5/12 | 234 | 56 | 진행중 | [편집][마감][삭제] |
```

**작성/편집 페이지 (`/admin/sparring/new`, `/admin/sparring/[id]/edit`):**
- 입력: 제목, 본문(에디터), 카테고리(6개 select), `side_a_label`, `side_b_label`, 마감일
- 라운드 번호는 auto-increment
- slug 자동 생성 (`docs/slug-spec.md` 알고리즘)
- 저장 시 `public.sparrings` insert/update

**액션:**
- [편집] → 편집 페이지
- [마감] → `status = 'closed'` 토글
- [삭제] → soft delete (`deleted_at` 컬럼)

## v1-B. 토픽 관리 (`/admin/topics`)

**목록:**
```
[새 토픽 만들기 →]

| slug | 이름 | 카테고리 | 질문수 | 팔로워 | 액션 |
| etf-guide | ETF 시작하기 | 국내주식·ETF | 12 | 45 | [편집][삭제] |
```

**작성/편집:**
- slug, name, description, 카테고리(6개 중 1), 썸네일 업로드(선택)
- 저장 시 `public.topics` 테이블

**스키마:**
```sql
public.topics
  - id, slug (unique), name, description, category, thumbnail_url
  - created_at, deleted_at
```

## v1-C. 모더레이션 패널 (`/admin/moderation`)

신고/부적절 콘텐츠 일괄 처리용.

**탭 3개:**
- 신고된 질문/답변 (사용자 신고 또는 자동 필터링된 것)
- 신고된 댓글 (스파링 댓글 포함)
- 신고된 사용자

**행동:**
- [통과] — 이상 없음 표시
- [숨김] — soft delete (`hidden = true`)
- [삭제] — 영구 삭제 (확인 모달)
- [사용자 차단] — 작성자에게 7일/30일/영구 차단

**스키마:**
```sql
public.reports
  - id, target_type ('question'|'answer'|'comment'|'user')
  - target_id, reporter_id, reason, status ('pending'|'resolved')
  - resolved_by, resolved_at, action_taken
  - created_at

public.users
  + banned_until timestamp  -- null이면 정상
```

---

# 🟡 v2 — Mid/Low Priority (v1 끝나면)

## v2-A. 사용자 관리 (`/admin/users`)

- 사용자 검색 (이메일/닉네임)
- 권한 변경 (user ↔ expert ↔ admin)
- 차단 처리 / 차단 해제
- 활동 로그 (질문/답변/스파링 참여 수)

## v2-B. 미션 관리 (`/admin/missions`)

- 시즌제 미션 (예: "5월 챌린지 — 7일 연속 답변하기")
- 보상: 포인트 / 뱃지 / 레벨업
- 스키마: `missions`, `mission_participations`, `mission_rewards`
- 일단 v1엔 없으니 v2에서 도입

## v2-C. 통계 대시보드 (`/admin/stats`)

- 일별/주별 DAU·MAU
- 질문수·답변수·스파링 참여율
- 카테고리별 콘텐츠 분포
- 인기 질문/스파링 top 10
- Vercel Analytics + Supabase 집계 view 조합

## v2-D. RSS 수집 모니터링 (`/admin/rss`)

- 매체별 최근 수집 시각·성공/실패 카운트
- 자동 매핑된 카테고리 일괄 수정 UI (잘못 매핑된 뉴스 카테고리 변경)
- 키워드 룰 편집 (`docs/feed-page-spec.md` §3-3 RULES 배열을 DB로 이전 옵션)

## v2-E. Ghost 동기화 점검 (`/admin/ghost-sync`)

- Ghost API 호출 결과 + 에러 로그
- 카테고리 미매핑 글 표시 (Ghost 태그가 6개 외 일 때 알림)

---

## 공통 UX 원칙
- 모든 admin 페이지는 `<AdminLayout>`로 감쌈 (좌측 사이드바 메뉴 + 메인)
- 액션 버튼은 destructive(삭제)만 빨강, 나머지 outline
- 일괄 처리 가능한 곳은 체크박스 + 일괄 액션 버튼
- 모든 변경은 `audit_logs` 테이블에 기록 (admin이 뭐 했는지 추적용)

```sql
public.audit_logs
  - id, admin_id, action, target_type, target_id, before_value (jsonb), after_value (jsonb), created_at
```

---

## 검증 기준

### v1 완료 시점
- [ ] 비-admin 사용자가 `/admin/*` 접근 시 홈으로 리다이렉트
- [ ] 예호님 계정으로 `/admin/sparring/new` 라운드 작성 → 라이브에 즉시 노출
- [ ] `/admin/topics/new` 토픽 작성 → 토픽 페이지에 노출
- [ ] 신고된 댓글 [숨김] 처리 시 라이브에서 안 보임
- [ ] `audit_logs`에 모든 액션 기록됨

### v2 완료 시점
- [ ] 사용자 차단 → 차단된 사용자는 작성/투표 불가
- [ ] 통계 대시보드에서 DAU 그래프 정상 표시
- [ ] RSS 매핑 일괄 수정 + 룰 편집 가능
- [ ] Ghost 미매핑 글 자동 알림

---

## 작업 로그
- 2026-05-09 v1: 초안 (v1=High 3개 / v2=Mid·Low 5개로 단계 구분)
