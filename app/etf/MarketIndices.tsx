/**
 * 시장 지수 — Yahoo Finance 라이브 + 미니 sparkline.
 * 서버 컴포넌트 (revalidate 60s).
 *
 * Figma 톤: [sparkline] [라벨] / [큰 가격] [+ 등락률]
 */
import sec from './sectionStyles.module.css';
import styles from './MarketIndices.module.css';

type Index = {
  symbol: string;
  name: string;
  unit?: string;
};

const INDICES: Index[] = [
  { symbol: '^KS11', name: '코스피' },
  { symbol: '^KQ11', name: '코스닥' },
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: '나스닥' },
  { symbol: 'KRW=X', name: '원/달러', unit: '원' },
  { symbol: 'GC=F', name: '금', unit: '$' },
];

type Quote = {
  price: number;
  prevClose: number;
  change: number;     // 절댓값
  changePct: number;
  series: number[];   // intraday 가격 시계열 (sparkline 용)
};

async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    // 1일 5분 단위 — 인트라데이 충분 + 가벼움
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
    // 시계열 (null 값 제거)
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const series = closes.filter((v: number | null): v is number => typeof v === 'number');
    const change = price - prev;
    const changePct = prev ? (change / prev) * 100 : 0;
    return { price, prevClose: prev, change, changePct, series };
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
  // 일관된 부호 표기: +232.88 (+0.88%) / -488.23 (-6.12%)
  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  const absChg = Math.abs(change).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const pctSign = pct > 0 ? '+' : '';
  return `${sign}${absChg} (${pctSign}${pct.toFixed(2)}%)`;
}

/** Mini sparkline SVG (60×30) — Toss 톤 톤온톤 라인 */
function Sparkline({ series, up, idKey }: { series: number[]; up: boolean; idKey: string }) {
  if (series.length < 2) return <div className={styles.sparkPlaceholder} aria-hidden="true" />;
  const W = 64;
  const H = 32;
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
  const gradId = `sparkgrad-${idKey.replace(/[^a-zA-Z0-9]/g, '')}-${up ? 'u' : 'd'}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={styles.spark} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export async function MarketIndices() {
  const results = await Promise.all(INDICES.map(idx => fetchQuote(idx.symbol)));
  return (
    <section className={sec.card} aria-label="시장 지수">
      <div className={sec.head}>
        <h3 className={sec.title}>오늘의 시장</h3>
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} aria-hidden="true" />
          실시간
        </span>
      </div>
      <div className={styles.grid}>
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
              <Sparkline series={q.series} up={up} idKey={idx.symbol} />
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
    </section>
  );
}
