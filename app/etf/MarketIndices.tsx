/**
 * 시장 지수 가로 스크롤 — RiskWeather 상단 패턴.
 * Phase B: 정적 시드. Phase F에서 data.go.kr API 연결.
 */
import styles from './MarketIndices.module.css';

type Index = { name: string; price: string; change: string; tone: 'up' | 'down'; warn?: boolean };

const INDICES: Index[] = [
  { name: '코스피', price: '7,822.24', change: '+4.32%', tone: 'up' },
  { name: '코스닥', price: '1,207.34', change: '0.00%', tone: 'up' },
  { name: 'S&P500', price: '7,398.93', change: '+0.84%', tone: 'up' },
  { name: '나스닥', price: '26,247.08', change: '+1.71%', tone: 'up' },
  { name: '다우존스', price: '49,609.16', change: '+0.02%', tone: 'up', warn: true },
  { name: '원달러', price: '1,474.46', change: '+0.86%', tone: 'up' },
];

export function MarketIndices() {
  return (
    <section className={styles.section} aria-label="시장 지수">
      <div className={styles.scroller}>
        {INDICES.map(idx => (
          <div key={idx.name} className={styles.item}>
            <div className={styles.head}>
              <span className={styles.name}>{idx.name}</span>
              {idx.warn && <span className={styles.warn} aria-hidden="true">⚠️</span>}
            </div>
            <div className={styles.price}>{idx.price}</div>
            <div className={idx.tone === 'down' ? styles.down : styles.up}>{idx.change}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
