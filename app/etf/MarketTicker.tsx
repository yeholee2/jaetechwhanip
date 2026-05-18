/**
 * 시장 지수 가로 티커 — Yahoo Finance 라이브.
 * Toss증권 톤: 상단에 길게 펼쳐지는 sparkline + 가격 + 등락률.
 * 좌측 상태 (국내 애프터마켓 / 해외 프리마켓 등) 표시.
 *
 * 사용:
 *  - 서버 컴포넌트로: <MarketTicker />  (자체 fetch)
 *  - 또는 prop으로 데이터 주입: <MarketTickerView quotes={...} />
 */
import Link from 'next/link';
import styles from './MarketTicker.module.css';
import { getNextMajorEvent, type CalendarEvent } from '@/lib/marketCalendar';
import { fetchLiveCalendar } from '@/lib/marketCalendarLive';
import { TickerScroller } from './TickerScroller';

type IndexDef = {
  symbol: string;
  name: string;
  unit?: string;
  region: 'kr' | 'us';
};

export const TICKER_INDICES: IndexDef[] = [
  { symbol: '^KS11', name: '코스피', region: 'kr' },
  { symbol: '^KQ11', name: '코스닥', region: 'kr' },
  { symbol: 'KRW=X', name: '원/달러', region: 'kr', unit: '원' },
  { symbol: '^GSPC', name: 'S&P 500', region: 'us' },
  { symbol: '^IXIC', name: '나스닥', region: 'us' },
  { symbol: 'NQ=F', name: '나스닥 100 선물', region: 'us' },
  { symbol: 'GC=F', name: '금', region: 'us', unit: '$' },
];

type Quote = {
  price: number;
  change: number;
  changePct: number;
  series: number[];
  prev: number;          // 전일 종가 — sparkline 기준선
};

async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta?.regularMarketPrice;
    const prev = meta?.chartPreviousClose ?? meta?.previousClose;
    if (typeof price !== 'number' || typeof prev !== 'number') return null;
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const series = closes.filter((v: number | null): v is number => typeof v === 'number');
    const change = price - prev;
    const changePct = prev ? (change / prev) * 100 : 0;
    return { price, change, changePct, series, prev };
  } catch {
    return null;
  }
}

function formatPrice(price: number, unit?: string): string {
  if (!unit || unit === '원') {
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }
  return `${unit}${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatChange(change: number, pct: number): string {
  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  const pctSign = pct > 0 ? '+' : '';
  const absChg = Math.abs(change).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${sign}${absChg} (${pctSign}${pct.toFixed(2)}%)`;
}

/** 한국 시장 상태 — 평일 9~15:30 KST 정규장 / 외 시간 = 애프터마켓 */
function getMarketStatus(): { krOpen: boolean; usOpen: boolean } {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const krDay = kst.getUTCDay();
  const krMins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const krOpen = krDay >= 1 && krDay <= 5 && krMins >= 9 * 60 && krMins <= 15 * 60 + 30;
  // 미국 정규장 9:30~16:00 ET (= 23:30~06:00 KST 다음날)
  const et = new Date(now.getTime() - 5 * 60 * 60 * 1000); // EST 기준 (간단화)
  const usDay = et.getUTCDay();
  const usMins = et.getUTCHours() * 60 + et.getUTCMinutes();
  const usOpen = usDay >= 1 && usDay <= 5 && usMins >= 9 * 60 + 30 && usMins <= 16 * 60;
  return { krOpen, usOpen };
}

/** Mini horizontal sparkline — 전일 종가 기준선(점선) + 깔끔한 곡선 */
function Sparkline({ series, up, baseline }: { series: number[]; up: boolean; baseline?: number }) {
  if (series.length < 2) return <div className={styles.sparkPlaceholder} aria-hidden="true" />;
  const W = 56;
  const H = 22;
  const padY = 3;

  // 기준선(전일 종가)을 포함한 스케일 — 곡선이 baseline 위 아래로 펼쳐지게
  const dataMin = Math.min(...series);
  const dataMax = Math.max(...series);
  const min = baseline !== undefined ? Math.min(dataMin, baseline) : dataMin;
  const max = baseline !== undefined ? Math.max(dataMax, baseline) : dataMax;
  const range = max - min || 1;

  const yOf = (v: number) => padY + (1 - (v - min) / range) * (H - padY * 2);
  const stride = (W - 2) / (series.length - 1);

  const points = series.map((v, i) => [1 + i * stride, yOf(v)] as [number, number]);
  const path = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${path} L${points[points.length - 1][0]},${H} L${points[0][0]},${H} Z`;

  const baselineY = baseline !== undefined ? yOf(baseline) : null;
  const color = up ? 'var(--rw-up)' : 'var(--rw-down)';
  const gradId = `tg-${up ? 'u' : 'd'}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={styles.spark} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.16} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      {baselineY !== null && (
        <line
          x1={0.5}
          y1={baselineY}
          x2={W - 0.5}
          y2={baselineY}
          stroke="var(--rw-text-disabled, #c7ced9)"
          strokeWidth={0.7}
          strokeDasharray="2 2"
          opacity={0.85}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type TickerQuote = Quote;

/** 순수 렌더링 컴포넌트 (server/client 어디든) — 데이터 prop 주입 */
export function MarketTickerView({
  quotes,
  nextEvent: nextEventProp,
}: {
  quotes: (TickerQuote | null)[];
  /** 외부 주입 (live data). 없으면 seed 사용 */
  nextEvent?: { event: CalendarEvent; dDay: number } | null;
}) {
  const status = getMarketStatus();
  const nextEvent = nextEventProp !== undefined ? nextEventProp : getNextMajorEvent();
  return (
    <section className={styles.ticker} aria-label="실시간 시장 시세">
      <div className={styles.statusBar}>
        <span className={styles.status}>
          <span className={`${styles.statusDot} ${status.krOpen ? styles.open : styles.closed}`} aria-hidden="true" />
          국내 {status.krOpen ? '장중' : '애프터마켓'}
        </span>
        <span className={styles.status}>
          <span className={`${styles.statusDot} ${status.usOpen ? styles.open : styles.closed}`} aria-hidden="true" />
          해외 {status.usOpen ? '장중' : '프리마켓'}
        </span>
      </div>

      <TickerScroller>
        {/* 첫 카드: 증시 캘린더 D-X (가장 가까운 major 이벤트) */}
        {nextEvent && (
          <Link href="/calendar" className={`${styles.item} ${styles.itemCalendar}`}>
            <span className={styles.dBadge}>D-{nextEvent.dDay}</span>
            <div className={styles.body}>
              <span className={styles.name}>증시캘린더</span>
              <span className={styles.priceCal}>{nextEvent.event.title}</span>
            </div>
          </Link>
        )}

        {TICKER_INDICES.map((idx, i) => {
          const q = quotes[i];
          if (!q) {
            return (
              <div key={idx.symbol} className={styles.item}>
                <div className={styles.sparkPlaceholder} aria-hidden="true" />
                <div className={styles.body}>
                  <span className={styles.name}>{idx.name}</span>
                  <span className={styles.price}>—</span>
                </div>
              </div>
            );
          }
          const up = q.change >= 0;
          return (
            <div key={idx.symbol} className={styles.item}>
              <Sparkline series={q.series} up={up} baseline={q.prev} />
              <div className={styles.body}>
                <span className={styles.name}>{idx.name}</span>
                <div className={styles.priceRow}>
                  <strong className={styles.price}>{formatPrice(q.price, idx.unit)}</strong>
                  <span className={`${styles.change} ${up ? styles.up : styles.down}`}>
                    {formatChange(q.change, q.changePct)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </TickerScroller>
    </section>
  );
}

/** 서버 사이드 fetch + 렌더 (기존 호환) — Finnhub 키 있으면 live calendar 자동 */
export async function MarketTicker() {
  const [quotes, calendarEvents] = await Promise.all([
    Promise.all(TICKER_INDICES.map(idx => fetchQuote(idx.symbol))),
    fetchLiveCalendar({ weeksAhead: 2 }),
  ]);
  const nextEvent = getNextMajorEvent(new Date(), calendarEvents);
  return <MarketTickerView quotes={quotes} nextEvent={nextEvent} />;
}

import { unstable_cache } from 'next/cache';

async function fetchTickerQuotesInner(): Promise<(TickerQuote | null)[]> {
  return Promise.all(TICKER_INDICES.map(idx => fetchQuote(idx.symbol)));
}

async function fetchNextMajorEventInner() {
  const events = await fetchLiveCalendar({ weeksAhead: 2 });
  return getNextMajorEvent(new Date(), events);
}

// 60초 캐시 — Finnhub/Naver 외부 호출 비용 ↓, 홈 TTFB 단축
export const fetchTickerQuotes = unstable_cache(
  fetchTickerQuotesInner,
  ['ticker-quotes-v1'],
  { revalidate: 60, tags: ['ticker'] },
);

// 5분 캐시 — 캘린더 이벤트는 자주 변하지 않음
export const fetchNextMajorEvent = unstable_cache(
  fetchNextMajorEventInner,
  ['next-major-event-v1'],
  { revalidate: 300, tags: ['calendar'] },
);
