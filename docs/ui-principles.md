# UI 원칙 — 재테크한입

> v3 (2026-05-10): **RiskWeather standard 채택** — `globals.css` `--rw-*` 토큰이 표준. ETF 페이지부터 적용, 향후 전 페이지 마이그레이션.
> v2.2 (2026-05-09): a-ha 정밀 분석 후 카드 모티브 결정 — **bg/border/shadow 모두 제거, 디바이더만**.
> v2.1 (2026-05-09): a-ha 사이트 자동 추출 데이터 큐레이션 후 흡수. 노이즈 토큰 제거.
> v2 (2026-05-09): 방향성 a-ha 톤으로 전환. 기존 "토스 감성/여백 넓게" 폐기.

## 핵심 철학
> **a-ha처럼. 정보 밀도 높고 스캐너블, 단일 컬럼 중앙 집중, 카드는 카드가 아니다.**
> 금융 Q&A는 한 번에 여러 질문을 훑어보는 게 핵심 — 토스의 1액션 1화면과 다른 방향.

## Do
- ✅ 정보 밀도 적정 — 한 화면에 카드 3-5개 보이게
- ✅ 단일 컬럼 중앙 집중 (`max-width: 720px` 데스크탑)
- ✅ **카드는 카드가 아니다** (v2.2 / a-ha 모티브):
  - bg `transparent`, border `none`, box-shadow `none`
  - 콘텐츠 블록 사이는 `border-bottom: 1px solid #e5e8eb` (gray-200) 디바이더만
  - 카드 자체는 `padding: 24px 0` (좌우 0, 위아래 24)
  - 호버 시: `background: rgba(0,0,0,0.02)` 살짝 어둡게 (피드백)
- ✅ 본문 14-16px, 카드 제목 16-18px, 메타 12-13px gray
- ✅ 라인 높이 1.5-1.6 (스캐너블한 정도)
- ✅ Pretendard 기본, 로고만 Cafe24 Ssurround
- ✅ Primary 색 `#1e59da` (a-ha 블루, blue-600)을 핵심 CTA에 명확히 노출. dark 호버는 `#0649db`
- ✅ 카드형 피드 (border-radius: 16px 유지)

## Don't
- ❌ 토스식 "한 화면 한 액션" 격자 (스캐너빌리티 떨어짐)
- ❌ 카드에 border, shadow, 또는 background-color 사용 (a-ha 패턴: 디바이더만)
- ❌ 메타 한 줄에 정보 4개 이상 cramped
- ❌ 광고/배너 느낌 레이아웃 (깜빡이는 강조, 자극적 카피)
- ❌ 금융 공포감 조성 ("지금 안 하면 손해!", "급등 예상!")
- ❌ AI 요약·자동 요약 박스 본문 위에 박기 (a-ha엔 없음, 사용자 결정)
- ❌ 핵심 CTA를 회색·검정으로 (primary blue 안 보임 → CTA 약화)

## 타이포 토큰
| 역할 | 크기/굵기/높이 |
|---|---|
| 페이지 타이틀 | 28-32 / 700 / 1.3 |
| 섹션 헤더 | 18-20 / 700 / 1.4 |
| 카드 제목 | 16-18 / 600 / 1.45 |
| 본문/발췌 | 14-16 / 400 / 1.55 |
| 메타 (시간·카테고리) | 12-13 / 400 / 1.4 / text-3 (#999) |
| 버튼 | 14-15 / 600 |

## 컴포넌트 규칙
- **버튼**: 기본 height 44px, primary 액션 height 52px, border-radius 12px
- **카드**: 피드형 블록은 bg/border/shadow 없이 디바이더만. 별도 도구/모달/반복 카드만 radius 16px + 가벼운 shadow 허용
- **칩 (카테고리)**: border-radius 999, padding 6-12px, height 28-32px
- **간격**: 섹션 간 32px, 카드 간 12-16px, 요소 간 8-12px
- **모달**: 중앙 정렬, 배경 딤(rgba(0,0,0,0.4)), 부드러운 트랜지션

## 색상 토큰
| 토큰 | 값 | 용도 |
|---|---|---|
| primary | `#1e59da` | 핵심 CTA, 활성 칩, 강조 |
| primary-dk | `#0649db` | CTA hover |
| text-1 | `#191f28` | 제목 |
| text-2 | `#333d4b` | 본문 |
| text-3 | `#6b7684` | 메타 |
| kakao | `#FEE500` | 카카오 로그인 등 |
| bg | `#ffffff` | 페이지 배경 |
| surface | `#ffffff` | 카드 배경 |
| border | `#e5e7eb` | (사용 최소화 — 카드는 shadow만) |
| text-quiet | `#b0b8c1` | 비활성/캡션 |
| focus-ring | `rgba(30,89,218,0.5)` | focus-visible 아웃라인 (접근성) |

## 폰트 스택 (a-ha와 동일, 한글 fallback 견고)
```css
font-family:
  'Pretendard Variable', Pretendard,
  -apple-system, system-ui,
  Roboto, 'Helvetica Neue', 'Segoe UI',
  'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic',
  'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
  sans-serif;
```
- Pretendard Variable 우선 (가변 폰트, 모든 weight 한 파일로)
- 시스템 폰트 fallback으로 로딩 깜빡임 최소화

## 모션 토큰 (a-ha 추출본 그대로 — 일관됨)
| 토큰 | 값 | 용도 |
|---|---|---|
| duration-instant | 150ms | 즉각적 반응 (hover, click 피드백) |
| duration-fast | 200ms | 짧은 트랜지션 (드롭다운, 토스트) |
| duration-normal | 300ms | 표준 트랜지션 (모달, 패널) |
| duration-slow | 400ms | 큰 변화 (페이지 전환) |

`ease`는 `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard) 권장.

## 반응형
- 데스크탑 우선 (현재 우선순위), 모바일은 별도 트랙
- 데스크탑: 단일 컬럼 `max-width: 720px` 가운데 정렬
- 모바일: 풀너비 + 좌우 padding 16px, 하단 탭바 5개
- 모바일 톤은 추후 별도 정의 (참고: 삼쩜삼 / 모니모)

## 컴포넌트 필수 상태 (a-ha 룰 차용)
모든 인터랙티브 컴포넌트(버튼·칩·카드·입력)는 7개 상태 모두 정의해야 한다:

| 상태 | 정의 | 시각 |
|---|---|---|
| **default** | 기본 | 토큰 그대로 |
| **hover** | 마우스 올림 | 배경 살짝 어둡게(2-4%) 또는 그림자 강조 |
| **focus-visible** | 키보드 포커스 | 2px focus-ring 아웃라인 (접근성 필수) |
| **active** | 누름 | 배경 더 어둡게(6-8%), scale 0.98 |
| **disabled** | 비활성 | opacity 0.4, cursor not-allowed, hover X |
| **loading** | 로딩 중 | 스피너 + 텍스트 가림 또는 `…` |
| **error** | 에러 | red border + 에러 메시지 |

→ `:hover` 만 정의하고 끝내면 안 됨. 키보드 사용자에 `focus-visible` 누락은 a11y 위반.

## 접근성 (Accessibility)
- 목표: **WCAG 2.2 AA**
- 키보드 우선: Tab/Shift+Tab으로 모든 인터랙션 접근 가능해야 함
- focus-visible: 모든 인터랙티브 요소에 명확한 포커스 인디케이터
- 명도 대비: 본문 텍스트 4.5:1 이상, 큰 텍스트(18px+) 3:1 이상
- 라벨: `aria-label` 또는 가시 텍스트 필수, "더보기" "여기를 클릭" 같은 모호한 라벨 X
- 모션 감소: `prefers-reduced-motion` 미디어쿼리 존중

## 작성 규칙 (코드 룰북에서 차용)
- 비협상 가능한 룰은 **must** 사용 (예: "버튼은 focus-visible을 must 정의")
- 권장은 **should** (예: "카드 hover에서 그림자 should 강조")
- 시스템 일관성 > 로컬 예외. 한 페이지만 다르게 하지 말 것.
- 의미 없는 토큰 예외 금지 — 새 값 필요하면 토큰 표 수정해서 도입

## RiskWeather Design System v3 (2026-05-10)

Chrome MCP로 `riskweather.io/ko`에서 직접 추출한 design tokens. `app/globals.css` `:root`에 `--rw-*` 토큰으로 정의돼 있고 이게 표준.

### 핵심 시맨틱 토큰
| 토큰 | 값 | 용도 |
|---|---|---|
| `--rw-screen` | `#f6f7f8` | 페이지 배경 (회색) |
| `--rw-card` | `#fff` | 카드 배경 (흰색) |
| `--rw-card-muted` | `#f2f4f6` | 보조 회색 카드 |
| `--rw-hairline` | `#e5e8eb` | 디바이더/얇은 경계 |
| `--rw-text-strong` | `#333d4b` | 제목 (gray80) |
| `--rw-text-body` | `#4e5968` | 본문 (gray70) |
| `--rw-text-muted` | `#8b95a1` | 메타 (gray50) |
| `--rw-text-disabled` | `#b0b8c1` | 비활성 (gray40) |
| `--rw-primary` | `#3182f6` | 핵심 CTA (blue50, Toss 블루) |
| `--rw-primary-hover` | `#2272eb` | hover (blue60) |
| `--rw-up` | `#e42939` | 상승 (red60, 한국 증시) |
| `--rw-down` | `#3182f6` | 하락 (blue50) |
| `--rw-radius-md` | `14px` | 카드 모서리 |
| `--rw-radius-lg` | `20px` | 큰 컨테이너 |

### Gray scale (gray2~90)
회색 12단계 `--rw-gray2` ~ `--rw-gray90` (#f9fafb → #191f28). 시맨틱 토큰이 부족할 때만 직접 사용.

### 채택 룰
- **모든 새 페이지/컴포넌트는 `--rw-*` 토큰만 사용.**
- 기존 `--t1`, `--blue` 등 legacy 토큰은 점진 폐기 (마이그레이션 중).
- ETF 페이지가 1차 적용 완료, Q&A·스파링·피드는 v3 이후 작업.

### 핵심 패턴 (RiskWeather 모방)
- **페이지 회색 배경 + 흰 카드 컨테이너** (그림자 X, hairline X — 배경 대비만으로 카드 분리)
- **카드 padding 16-20px**, 모서리 `--rw-radius-md` 14px
- **섹션 간 12-16px 간격**
- **리스트 아이템 사이 1px hairline divider** (`--rw-hairline`)
- **타이포 위계:** 제목 17-20px / 700 / strong, 본문 14-15px / 400-500 / body, 메타 12-13px / muted
- **❯ 화살표:** 진입 가능한 행에 우측 작게 (font-size 20-22, color disabled, font-weight 300)
- **이모지 아이콘:** 카드 좌측 36-40px 사각 배경 (`--rw-blue5` 또는 `--rw-card-muted`) + 중앙 정렬
- **한국 증시 색:** 상승=`--rw-up` 빨강, 하락=`--rw-down` 파랑

## 변경 이력
- v1 (~2026-05-08): 토스 감성, 여백 넓게
- v2 (2026-05-09): **a-ha 톤으로 전환.** 정보 밀도 ↑, 카드 shadow 단일, primary 색 활성화, AI 요약 박스 금지 추가
- v2.1 (2026-05-09): a-ha 사이트 자동 추출본 큐레이션 흡수. Pretendard 폰트 스택, 모션 토큰(150/200/300/400), 컴포넌트 7종 상태, WCAG 2.2 AA, must/should 룰 추가. 노이즈 토큰(`radius.lg=16777200px`, `surface.base=#000000`, `text=#0000ee` 등)은 거름.
