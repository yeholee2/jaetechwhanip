/**
 * 시장 지수 가로 티커 — Yahoo Finance 라이브.
 * Toss증권 톤: 상단에 길게 펼쳐지는 sparkline + 가격 + 등락률.
 * 좌측 상태 (국내 애프터마켓 / 해외 프리마켓 등) 표시.
 */
import sec from './sectionStyles.module.css';
import styles from './MarketTicker.module.css';

type IndexDef = {
  symbol: string;
  name: string;
  unit?: string;
  region: 'kr' | 'us';
};

const INDICES: IndexDef[] = [
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
    return { price, change, changePct, series };
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

/** Mini horizontal sparkline (90×28) */
function Sparkline({ series, up }: { series: number[]; up: boolean }) {
  if (series.length < 2) return <div className={styles.sparkPlaceholder} aria-hidden="true" />;
  const W = 90;
  const H = 28;
  const padY = 3;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stride = (W - 2) / (series.length - 1);
  const points = series.map((v, i) => {
    const x = 1 + i * stride;
    const y = padY + (1 - (v - min) / range) * (H - padY * 2);
    return [x, y] as [number, number];
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L${points[points.length - 1][0]},${H} L${points[0][0]},${H} Z`;
  const color = up ? 'var(--rw-up)' : 'var(--rw-down)';
  const gradId = `tg-${up ? 'u' : 'd'}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={styles.spark} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export async function MarketTicker() {
  const results = await Promise.all(INDICES.map(idx => fetchQuote(idx.symbol)));
  const status = getMarketStatus();

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

      <div className={styles.scrollWrap}>
        <div className={styles.row}>
          {INDICES.map((idx, i) => {
            const q = results[i];
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
                <Sparkline series={q.series} up={up} />
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
        </div>
      </div>
    </section>
  );
}
