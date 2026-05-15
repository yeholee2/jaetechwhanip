/**
 * 증시 캘린더 — Finnhub 실데이터 fetch.
 *
 * 환경변수: FINNHUB_API_KEY
 *   - https://finnhub.io 가입 → API Keys 에서 발급 (무료 60건/분)
 *   - .env.local 에 등록 후 Vercel 환경변수에도 동일하게 등록
 *
 * 키 없으면 시드 데이터로 fallback (lib/marketCalendar.ts).
 *
 * Endpoints:
 *  - 경제지표: GET /api/v1/calendar/economic?from=YYYY-MM-DD&to=YYYY-MM-DD
 *  - 실적:    GET /api/v1/calendar/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD
 */

import type { CalendarEvent, CalendarImportance } from '@/lib/marketCalendar';
import { CALENDAR_EVENTS } from '@/lib/marketCalendar';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

type FinnhubEconomicItem = {
  actual?: number;
  estimate?: number;
  prev?: number;
  country?: string;        // 'US', 'KR' 등
  event?: string;          // 'Initial Jobless Claims', 'CPI MoM' 등
  impact?: 'low' | 'medium' | 'high';
  time?: string;           // YYYY-MM-DD HH:mm:ss
  unit?: string;           // '%' '$' 등
};

type FinnhubEarningsItem = {
  date?: string;           // YYYY-MM-DD
  symbol?: string;
  epsActual?: number;
  epsEstimate?: number;
  hour?: 'amc' | 'bmo' | string;
  quarter?: number;
  year?: number;
};

/** Finnhub 경제지표 한국어 매핑 (자주 보는 이벤트만) */
const EVENT_KOR: Record<string, string> = {
  'Initial Jobless Claims': '주간 신규실업수당 청구건수',
  'CPI MoM': '소비자물가지수(CPI) MoM',
  'CPI YoY': '소비자물가지수(CPI) YoY',
  'Core CPI MoM': '근원 CPI MoM',
  'PPI MoM': '생산자물가지수(PPI) MoM',
  'Nonfarm Payrolls': '비농업부문 고용자수',
  'Unemployment Rate': '실업률',
  'Retail Sales MoM': '소매판매 MoM',
  'ISM Manufacturing PMI': 'ISM 제조업 PMI',
  'ISM Services PMI': 'ISM 서비스업 PMI',
  'ISM Non-Manufacturing PMI': 'ISM 비제조업 PMI',
  'JOLTs Job Openings': '노동시장 신규 구인건수(JOLTs)',
  'GDP QoQ': 'GDP QoQ',
  'GDP YoY': 'GDP YoY',
  'FOMC Statement': 'FOMC 성명',
  'FOMC Press Conference': 'FOMC 기자회견',
  'FOMC Meeting Minutes': 'FOMC 의사록',
  'Fed Interest Rate Decision': 'Fed 기준금리 결정',
  'Core PCE Price Index MoM': '근원 PCE 물가지수 MoM',
  'Michigan Consumer Sentiment': '미시간대 소비자심리지수',
  'Michigan Inflation Expectations': '미시간대 인플레이션 기대치',
  'ADP Employment Change': '비농업부문 고용변화량(ADP)',
  'Industrial Production MoM': '산업생산 MoM',
  'Housing Starts': '주택착공건수',
};

function translateEvent(name: string): string {
  return EVENT_KOR[name] || name;
}

function mapImpact(impact?: 'low' | 'medium' | 'high'): CalendarImportance {
  return impact === 'high' ? 'major' : 'normal';
}

function formatValue(raw: number | undefined, unit?: string): string | undefined {
  if (raw == null || !Number.isFinite(raw)) return undefined;
  const formatted = raw.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return unit ? `${formatted}${unit}` : formatted;
}

function formatEarnings(value: number | undefined): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return `$${value.toFixed(2)} EPS`;
}

/** 회사명 한국어 매핑 (자주 보는 빅테크) */
const TICKER_KOR: Record<string, string> = {
  AAPL: '애플', MSFT: '마이크로소프트', GOOGL: '알파벳', AMZN: '아마존',
  META: '메타', NVDA: '엔비디아', TSLA: '테슬라', AMD: 'AMD',
  AVGO: '브로드컴', INTC: '인텔', NFLX: '넷플릭스', DIS: '디즈니',
  JPM: 'JP모건', BAC: '뱅크오브아메리카', GS: '골드만삭스',
  XOM: '엑손모빌', CVX: '셰브론', WMT: '월마트', PG: 'P&G',
  KO: '코카콜라', PEP: '펩시', MCD: '맥도날드', NKE: '나이키',
  V: '비자', MA: '마스터카드', PYPL: '페이팔',
  ABBV: '애브비', LLY: '일라이 릴리', PFE: '화이자', JNJ: '존슨앤존슨',
  UNH: '유나이티드헬스', MRK: '머크', CRM: '세일즈포스', ORCL: '오라클',
  CSCO: '시스코 시스템즈', IBM: 'IBM',
};

function translateTicker(symbol: string): string {
  return TICKER_KOR[symbol] || symbol;
}

async function finnhubFetch<T>(path: string): Promise<T | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  try {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${FINNHUB_BASE}${path}${sep}token=${encodeURIComponent(key)}`;
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) {
      console.error(`[finnhub] ${path} → HTTP ${r.status}`);
      return null;
    }
    return r.json() as Promise<T>;
  } catch (e) {
    console.error('[finnhub] fetch failed:', e);
    return null;
  }
}

/** 경제지표 + 실적을 한 번에 fetch + CalendarEvent 로 변환 */
export async function fetchLiveCalendar(opts?: { weeksAhead?: number }): Promise<CalendarEvent[]> {
  const weeksAhead = opts?.weeksAhead ?? 3;
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + weeksAhead * 7);
  const to = toDate.toISOString().slice(0, 10);

  const [econ, earn] = await Promise.all([
    finnhubFetch<{ economicCalendar?: FinnhubEconomicItem[] }>(`/calendar/economic?from=${from}&to=${to}`),
    finnhubFetch<{ earningsCalendar?: FinnhubEarningsItem[] }>(`/calendar/earnings?from=${from}&to=${to}`),
  ]);

  // 키 없거나 두 응답 모두 빈 경우 → 시드 데이터
  if (!econ && !earn) return CALENDAR_EVENTS;

  const events: CalendarEvent[] = [];

  // 경제지표 — KR / US 만 (다국가는 과다)
  for (const item of econ?.economicCalendar ?? []) {
    if (!item.event || !item.time) continue;
    const country = (item.country || '').toUpperCase();
    if (country !== 'US' && country !== 'KR') continue;
    events.push({
      id: `econ-${country}-${item.event}-${item.time}`,
      date: item.time.slice(0, 10),
      region: country === 'US' ? 'us' : 'kr',
      kind: 'economic',
      title: `${translateEvent(item.event)} 발표`,
      actual: formatValue(item.actual, item.unit),
      forecast: formatValue(item.estimate, item.unit),
      previous: formatValue(item.prev, item.unit),
      importance: mapImpact(item.impact),
    });
  }

  // 실적 — 미국 대형주 + Finnhub 의 quarter/year 정보 활용
  for (const item of earn?.earningsCalendar ?? []) {
    if (!item.symbol || !item.date) continue;
    // 빅테크/유명 종목만 (TICKER_KOR 매핑된 것만)
    if (!TICKER_KOR[item.symbol]) continue;
    events.push({
      id: `earn-${item.symbol}-${item.date}`,
      date: item.date,
      region: 'us',
      kind: 'earnings',
      title: `${translateTicker(item.symbol)} 실적발표`,
      ticker: item.symbol,
      actual: formatEarnings(item.epsActual),
      forecast: formatEarnings(item.epsEstimate),
      importance: 'major',
    });
  }

  // 비어있으면 시드 fallback
  if (events.length === 0) return CALENDAR_EVENTS;

  // 날짜순 정렬
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
