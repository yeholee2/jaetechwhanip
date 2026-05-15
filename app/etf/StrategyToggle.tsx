'use client';

/**
 * "돈 버는 ETF 전략" — 전략 카드 토글 + 종목 리스트.
 * allEtfs prop을 받아 theme/category/name 기반으로 동적 필터링.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import { EtfLogo } from './EtfLogo';
import sec from './sectionStyles.module.css';
import styles from './StrategyToggle.module.css';

type StrategyKey = 'big' | 'dividend' | 'safe';

const STRATEGIES: { key: StrategyKey; label: string; icon: string; sub: string; test: (e: EtfInfo) => boolean }[] = [
  {
    key: 'big',
    label: '믿을만한 대형주',
    icon: '📦',
    sub: '시장 대표 지수 ETF',
    test: (e) => /S&P500|나스닥100|MSCI|코스피200/i.test(e.theme + e.name) && !/레버리지|인버스/i.test(e.name),
  },
  {
    key: 'dividend',
    label: '배당 ETF',
    icon: '💵',
    sub: '배당 수익 중심',
    test: (e) => /배당|월배당|다우존스배당|고배당/i.test(e.theme + e.name),
  },
  {
    key: 'safe',
    label: '안전형 ETF',
    icon: '🍀',
    sub: '저변동 / 채권 혼합',
    test: (e) => /채권|국채|회사채|머니마켓|MMF/i.test(e.theme + e.name + e.category),
  },
];

export function StrategyToggle({ allEtfs = [] }: { allEtfs?: EtfInfo[] }) {
  const [active, setActive] = useState<StrategyKey>('big');

  const items = useMemo(() => {
    const strategy = STRATEGIES.find(s => s.key === active);
    if (!strategy) return [];
    return allEtfs.filter(strategy.test).slice(0, 3);
  }, [active, allEtfs]);

  return (
    <section className={sec.card} aria-label="따라하면 돈 버는 ETF 전략">
      <div className={sec.head}>
        <h3 className={sec.title}>돈 버는 ETF 전략</h3>
        <Link href="/etf/all" className={sec.metaLink}>더 보기 →</Link>
      </div>

      <div className={styles.toggleRow} role="tablist">
        {STRATEGIES.map(s => (
          <button
            key={s.key}
            role="tab"
            aria-selected={s.key === active}
            type="button"
            onClick={() => setActive(s.key)}
            className={`${styles.strategyCard} ${s.key === active ? styles.strategyActive : ''}`}
          >
            <span className={`${styles.strategyIcon} tf`} aria-hidden="true">{s.icon}</span>
            <div className={styles.strategyBody}>
              <strong>{s.label}</strong>
              <span>{s.sub}</span>
            </div>
          </button>
        ))}
      </div>

      <ul className={styles.list}>
        {items.length > 0 ? items.map(etf => (
          <li key={etf.slug}>
            <Link className={styles.item} href={etfPath(etf.slug)}>
              <EtfLogo name={etf.shortName} code={etf.code} size={32} />
              <strong className={styles.itemName}>{etf.shortName}</strong>
              <span className={etf.changeTone === 'down' ? styles.down : styles.up}>
                {etf.change}
              </span>
            </Link>
          </li>
        )) : (
          <li className={styles.empty}>'{STRATEGIES.find(s => s.key === active)?.label}' ETF를 불러오는 중이에요.</li>
        )}
      </ul>
    </section>
  );
}
