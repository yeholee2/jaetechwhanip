/**
 * 시장 지수 — Yahoo Finance 라이브.
 * 서버 컴포넌트 (revalidate 60s).
 */
import { Stat } from '@/components/ui';
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

type Quote = { price: number; change: number; currency?: string };

async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const m = j?.chart?.result?.[0]?.meta;
    if (!m) return null;
    const price = m.regularMarketPrice;
    const prev = m.chartPreviousClose ?? m.previousClose;
    const change = prev ? ((price - prev) / prev) * 100 : 0;
    return { price, change, currency: m.currency };
  } catch {
    return null;
  }
}

function format(price: number, unit?: string): string {
  if (!unit || unit === '원') {
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }
  return `${unit}${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export async function MarketIndices() {
  const results = await Promise.all(INDICES.map(idx => fetchQuote(idx.symbol)));
  return (
    <section className={sec.card} aria-label="시장 지수">
      <div className={sec.head}>
        <h3 className={sec.title}>오늘의 시장</h3>
        <span style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 600 }}>
          실시간
        </span>
      </div>
      <div className={styles.grid}>
        {INDICES.map((idx, i) => {
          const q = results[i];
          if (!q) {
            return (
              <div key={idx.symbol} className={styles.item}>
                <Stat label={idx.name} value="—" size="md" />
              </div>
            );
          }
          const tone = q.change > 0 ? 'up' : q.change < 0 ? 'down' : 'flat';
          const sign = q.change > 0 ? '+' : '';
          return (
            <div key={idx.symbol} className={styles.item}>
              <Stat
                label={idx.name}
                value={format(q.price, idx.unit)}
                delta={`${sign}${q.change.toFixed(2)}%`}
                tone={tone}
                size="md"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
