# 슬러그 스펙 — 한글 URL 통일

## 결정
- 질문, 토픽, 스파링, 피드 URL은 한글 의미를 보존한다.
- Romanization은 사용하지 않는다.
- UUID는 사용자/검색엔진에 노출하지 않는다.

## 공통 규칙
- 3~5개 핵심 키워드를 하이픈으로 연결한다.
- 최대 50자.
- 허용 문자: 한글, 영문 소문자, 숫자, 하이픈.
- 공백/특수문자/가운뎃점은 하이픈으로 변환한다.
- 중복 시 `-2`, `-3` 접미사를 붙인다.

## 예시
```text
/q/월급-300만원-저축-얼마나
/topics/국내주식-etf
/sparring/12-isa-연금저축-우선순위
/feed/[ghost-slug]
```

## 카테고리 매핑
UI 라벨과 URL 슬러그는 정규식 변환 없이 `lib/categories.ts`에서 직접 매핑한다.

```text
재테크 입문   -> /topics/재테크-입문
국내주식·ETF -> /topics/국내주식-etf
절세          -> /topics/절세
보험          -> /topics/보험
대출·부채     -> /topics/대출-부채
```

기존 영문 토픽 URL은 새 한글 URL로 308 이동한다.

## 구현 위치
- `lib/slugs.ts`: `generateSlug()`, `ensureUniqueSlug()`
- `lib/categories.ts`: 카테고리 key, UI label, emoji, topic slug 매핑
- `app/q/[slug]/page.tsx`: UUID 접근 시 실제 slug URL로 영구 이동
- `docs/migration_korean_slugs.sql`: 기존 질문 slug 백필 SQL 초안
