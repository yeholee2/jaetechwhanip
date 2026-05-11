/**
 * RiskWeather "따라하면 돈 버는 투자 전략" — 카테고리 토글 + 종목 3개 + 더 보기.
 * 우리 버전: "따라하면 돈 버는 ETF 전략"
 */
import Link from 'next/link';
import { etfPath, etfs } from '@/lib/etfs';
import { EtfLogo } from './EtfLogo';
import styles from './StrategyToggle.module.css';

type StrategyKey = 'big' | 'dividend' | 'safe';

const STRATEGIES: { key: StrategyKey; label: string; icon: string; sub: string }[] = [
  { key: 'big', label: '믿을만한 대형주', icon: '📦', sub: '이번달 +16.9%' },
  { key: 'dividend', label: '월배당 ETF', icon: '💵', sub: '안정적 현금흐름' },
  { key: 'safe', label: '안전형 ETF', icon: '🍀', sub: '저변동 / 채권 혼합' },
];

const STRATEGY_PICKS: Record<StrategyKey, string[]> = {
  big: ['TIGER 미국S&P500', 'KODEX 미국나스닥100TR', 'KODEX 미국S&P500TR'],
  dividend: ['ACE 미국배당다우존스'],
  safe: [],
};

export function StrategyToggle() {
  const active: StrategyKey = 'big';
  const picks = STRATEGY_PICKS[active];
  const items = etfs.filter(e => picks.some(p => e.shortName.includes(p) || e.name.includes(p))).slice(0, 3);

  return (
    <section className={styles.section} aria-label="따라하면 돈 버는 ETF 전략">
      <div className={styles.head}>
        <h3 className={styles.title}>따라하면 돈 버는 ETF 전략</h3>
        <Link href="#" className={styles.more}>더 보기 →</Link>
      </div>

      <div className={styles.toggleRow}>
        {STRATEGIES.map(s => (
          <div
            key={s.key}
            className={`${styles.strategyCard} ${s.key === active ? styles.strategyActive : ''}`}
          >
            <span className={styles.strategyIcon} aria-hidden="true">{s.icon}</span>
            <div className={styles.strategyBody}>
              <strong>{s.label}</strong>
              <span>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <ul className={styles.list}>
        {items.length > 0 ? items.map(etf => (
          <li key={etf.slug}>
            <Link className={styles.item} href={etfPath(etf.slug)}>
              <EtfLogo name={etf.shortName} size={32} />
              <strong className={styles.itemName}>{etf.shortName}</strong>
              <span className={etf.changeTone === 'down' ? styles.down : styles.up}>
                {etf.change}
              </span>
            </Link>
          </li>
        )) : (
          <li className={styles.empty}>해당 전략 ETF를 곧 보강할게요.</li>
        )}
      </ul>
    </section>
  );
}
