# 슬러그 스펙 (SEO 친화)

작성: 2026-05-09
대상: GPT/Codex (코드 구현)
적용 라우트: `/q/[slug]`, `/topics/[slug]`, `/sparring/[slug]`, `/columns/[slug]`

---

## 0. 원칙

1. **한글을 직접 사용한다.** Google은 한글 URL을 잘 인덱싱하며, 한국 사용자에게 의미가 그대로 전달됨. Romanization(`woolgeup-300`)은 의미 손실로 SEO/UX 둘 다 떨어짐.
2. **짧고 키워드 위주.** 3-5단어, 50자 이내.
3. **하이픈(`-`) 외 특수문자 금지.** 공백·물음표·쉼표·마침표·이모지·괄호 모두 제거.
4. **소문자 영문 + 한글 + 숫자 + 하이픈만 허용.**
5. **충돌 시 `-2`, `-3` 접미사** (절대 UUID 노출 X).
6. **카테고리/토픽 슬러그는 `docs/categories.md` SSOT와 정확히 일치** (재테크입문, 국내주식·ETF 등).

---

## 1. 라우트별 슬러그 패턴

### 1-1. 질문 `/q/[slug]`

**패턴:** `[핵심키워드3-5개]-하이픈연결`

**예시:**
| 원본 제목 | 슬러그 |
|---|---|
| 월급 300만원인데 저축은 얼마나 해야 하나요? | `월급-300만원-저축-얼마나` |
| S&P500 ETF 매달 50만원씩 사도 될까요? | `sp500-etf-매달-50만원-적립` |
| ISA 계좌 vs 연금저축 우선순위? | `isa-vs-연금저축-우선순위` |
| 청년적금 가입할 가치 있나요 | `청년적금-가입-가치` |
| 카카오 주식 지금 사도 늦지 않았나? | `카카오-주식-지금-매수` |

**알고리즘:**
1. 제목 가져오기
2. 특수문자 제거 (`?`, `!`, `,`, `&`, `·` 등)
3. 조사 제거 (`을/를/이/가/은/는/에/의/와/과/로`)
4. 의문/추측 어미 제거 (`까요`, `나요`, `세요`, `어요`, `있나`, `될까`)
5. 영문은 소문자화 (`S&P500` → `sp500`)
6. 공백 → 하이픈
7. 50자 자르기 (단어 단위로)
8. 충돌 시 `-2`, `-3`...

### 1-2. 토픽 `/topics/[slug]`

**패턴:** 카테고리/SSOT 그대로 사용

| 토픽 | 슬러그 |
|---|---|
| 재테크입문 | `재테크입문` |
| 국내주식·ETF | `국내주식-etf` (·는 하이픈으로) |
| 해외주식·ETF | `해외주식-etf` |
| 절세 | `절세` |
| 보험 | `보험` |
| 대출·부채 | `대출-부채` |

**주의:** UI 표기는 `국내주식·ETF` (가운뎃점), URL에서는 `국내주식-etf` (하이픈+소문자). 매핑 함수 한 곳에 관리:
```ts
// lib/slug.ts
export const categoryToSlug = (cat: string) =>
  cat.replace(/·/g, '-').replace(/ETF/g, 'etf')
export const slugToCategory = (slug: string) =>
  slug.replace(/etf/g, 'ETF').replace(/-/g, '·')  // 단, 하이픈은 ·만 의미하지 않으니 화이트리스트 매칭 권장
```
→ 안전하게는 6개 카테고리에 대한 양방향 매핑 테이블을 `lib/categories.ts`에 직접 정의.

### 1-3. 스파링 `/sparring/[slug]`

**패턴:** `[라운드번호]-[핵심키워드]`

라운드 번호가 시리즈 식별자 + SEO에 도움 (a-ha 라운드 패턴 차용).

| 스파링 | 슬러그 |
|---|---|
| (1라운드) S&P500 지금 들어가도 될까요? | `1-sp500-지금-매수` |
| (12라운드) ISA와 연금저축 우선순위 | `12-isa-연금저축-우선순위` |
| (3라운드) 20대 실손보험 필요성 | `3-20대-실손보험-필요성` |

라운드 번호는 DB auto-increment, 슬러그 알고리즘은 §1-1과 동일.

### 1-4. 칼럼 `/columns/[slug]`

**Ghost가 자체 slug 제공.** Ghost API의 `slug` 필드 그대로 사용.
- Ghost가 영문 자동 변환하는 경우 → 발행자에게 한글 slug 권장 가이드 (Ghost Admin → Post → URL 수동 편집 가능)
- 만약 영문 slug면 그대로 유지 (인덱싱 이미 진행 중일 수 있음)

---

## 2. 구현 헬퍼 (`lib/slug.ts`)

```ts
const PARTICLES = ['을','를','이','가','은','는','에','의','와','과','로','으로','에서','에게','한테']
const ENDINGS = ['까요','나요','세요','어요','있나','될까','일까','할까','해요','이에요','예요']

export function generateSlug(title: string, maxLen = 50): string {
  let s = title

  // 1. 특수문자 제거 (하이픈만 유지, 추후 단어구분용)
  s = s.replace(/[^\p{L}\p{N}\s-]/gu, ' ')

  // 2. 조사·어미 제거 (간단히 — 정확한 형태소 분석은 over-engineering)
  PARTICLES.forEach(p => { s = s.replace(new RegExp(`(\\S)${p}(?=\\s|$)`, 'g'), '$1') })
  ENDINGS.forEach(e => { s = s.replace(new RegExp(`${e}\\s*$`, 'g'), '') })

  // 3. 영문 소문자
  s = s.toLowerCase()

  // 4. 공백 → 하이픈, 연속 하이픈 단축
  s = s.trim().replace(/\s+/g, '-').replace(/-+/g, '-')

  // 5. 최대 길이 (단어 단위로 자르기)
  if (s.length > maxLen) {
    s = s.slice(0, maxLen).replace(/-[^-]*$/, '')
  }

  return s
}

export async function ensureUniqueSlug(base: string, table: 'questions'|'sparrings', supabase: any): Promise<string> {
  let slug = base
  let n = 1
  while (true) {
    const { data } = await supabase.from(table).select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    n++
    slug = `${base}-${n}`
  }
}
```

→ Codex가 정확한 형태소 분석 라이브러리(`hangul-utils` 등) 도입하면 더 깔끔, 일단 위 정도로도 충분.

---

## 3. 마이그레이션

### 기존 질문
현재 `/q/[slug]`는 UUID와 샘플 slug 둘 다 받음 (Codex 작업 기존 상태).

**작업:**
- [ ] 모든 기존 질문에 `slug` 필드 백필 (`generateSlug(title)` 적용 후 unique 보장)
- [ ] UUID 직접 접근 시 → 새 slug URL로 301 리다이렉트
- [ ] sitemap 재생성

### Ghost 칼럼 slug
Ghost 어드민 검토 — 한글 slug 권장 가이드를 발행자에게 전달.

---

## 4. SEO 영향

✅ **장점:**
- 검색결과에서 URL이 의미 전달 (`hannipmoney.com/q/월급-300만원-저축-얼마나`)
- 한국어 키워드 매칭 ↑
- 사용자 클릭률(CTR) ↑
- 외부 공유 시 URL만 봐도 내용 파악 가능

⚠️ **주의:**
- 한글 URL은 슬랙·메신저에 붙여넣을 때 percent-encoding으로 못생기게 보임
  → 슬랙은 자동 decode 해서 표시. 큰 문제 아님.
- copy-paste시 인코딩된 형태로 가는 경우 있음
  → Open Graph에 깨끗한 제목 노출하면 사용자 인지엔 문제 없음
- 검색 콘솔에서 URL이 percent-encoded로 표기됨 — 정상

---

## 5. 검증
- [ ] `/q/월급-300만원-저축-얼마나` 정상 응답
- [ ] `/q/[uuid]` 접근 시 301로 새 slug URL 리다이렉트
- [ ] 같은 제목 두 번 등록 시 `-2` 접미사 동작
- [ ] 한글 URL이 sitemap.xml에 percent-encoded로 정확히 출력
- [ ] Search Console에서 새 URL 인덱싱 시작 확인
