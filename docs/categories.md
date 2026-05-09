# 카테고리 마스터 (서비스 전역 공통)

작성: 2026-05-09

> **이 문서가 단일 진실 공급원(SSOT)**. 다른 문서·코드·Ghost 태그·DB는 모두 이걸 따른다.
> 카테고리 추가/변경 시 반드시 이 파일을 먼저 수정하고 영향 범위를 patch-notes에 기록.

---

## 확정 카테고리 (6개, 순서 고정)

| 순서 | 카테고리명 | UI 표기 | Ghost 태그 | DB 값 |
|---|---|---|---|---|
| 1 | 재테크입문 | 재테크입문 | `재테크입문` | `재테크입문` |
| 2 | 국내주식·ETF | 국내주식·ETF | `국내주식·ETF` | `국내주식·ETF` |
| 3 | 해외주식·ETF | 해외주식·ETF | `해외주식·ETF` | `해외주식·ETF` |
| 4 | 절세 | 절세 | `절세` | `절세` |
| 5 | 보험 | 보험 | `보험` | `보험` |
| 6 | 대출·부채 | 대출·부채 | `대출·부채` | `대출·부채` |

**모든 컬럼이 동일한 문자열.** 매칭 깨짐 방지.

---

## 표기 규칙
- ✅ 가운뎃점(`·`)만 예외 허용 — 복합어 구분용 (`국내주식·ETF`, `해외주식·ETF`, `대출·부채`)
- ❌ 그 외 특수문자 금지 (`/`, `-`, `_`, 슬래시, 하이픈 등)
- ❌ 이모지 사용 금지
- ❌ 공백 금지
- ❌ 영문/대소문자 혼용 (단 ETF는 대문자 그대로 유지)
- ✅ 한글 + ETF + ·만 허용

UI에서 시각 강조가 필요하면 컴포넌트 단에서 emoji prefix를 *별도 추가* (저장값은 깨끗하게 유지):
```tsx
const CATEGORY_DISPLAY = {
  '재테크입문':   { emoji: '💡', label: '재테크입문' },
  '국내주식·ETF': { emoji: '📈', label: '국내주식·ETF' },
  '해외주식·ETF': { emoji: '🌎', label: '해외주식·ETF' },
  '절세':         { emoji: '🏦', label: '절세' },
  '보험':         { emoji: '🛡️', label: '보험' },
  '대출·부채':    { emoji: '💳', label: '대출·부채' },
}
```
→ DB/Ghost에는 깨끗한 한글만, UI에서만 이모지 prefix.

---

## 적용 범위
- [ ] 홈 필터 칩 (`components/HomeClient.tsx`)
- [ ] 피드 페이지 필터 (`app/feed/page.tsx`)
- [ ] 질문 작성 카테고리 셀렉트 (질문하기 폼)
- [ ] 질문 상세 카테고리 라벨 (`/q/[slug]`)
- [ ] 토픽 페이지 (있을 경우)
- [ ] Supabase `questions.category` 값
- [ ] Ghost 어드민 태그 6개

---

## 마이그레이션 (구→신)

### Supabase questions.category
기존에 다른 문자열로 저장된 게 있다면:
```sql
-- 예시 (실제 기존 값 확인 후 작성)
UPDATE public.questions SET category = '국내주식·ETF' WHERE category IN ('주식·ETF', '주식 ETF', '국내주식', '주식ETF');
UPDATE public.questions SET category = '해외주식·ETF' WHERE category IN ('미국주식', '해외주식');
UPDATE public.questions SET category = '재테크입문' WHERE category = '재테크 입문';
UPDATE public.questions SET category = '대출·부채' WHERE category IN ('대출 부채', '대출부채');
-- 절세, 보험은 이미 일치할 가능성 큼
```
→ 실행 전 `SELECT DISTINCT category FROM public.questions;`로 현황 먼저 확인.

### Ghost 태그
hannipmoney 어드민 → Tags → 기존 태그 이름 수정 또는 글마다 재할당.
기존 태그 매핑 (예상):
- `국내주식` → `국내주식·ETF`
- `미국주식` → `해외주식·ETF`
- `경제지식` → `재테크입문` (성격 따라 절세/대출·부채로 분산도 가능)
- `재테크` → 글마다 적절한 6개 중 하나로 재할당

---

## 변경 이력
- 2026-05-09 v1: 초안. 6개 확정 (특수문자 전부 제거 버전)
- 2026-05-09 v2: 가운뎃점(`·`) 표기 복원 → `국내주식·ETF`, `해외주식·ETF`, `대출·부채`. 가독성 우선.
