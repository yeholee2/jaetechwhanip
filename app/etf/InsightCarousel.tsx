/**
 * ETF 큐레이션 가로 카드 스크롤.
 * allEtfs prop을 받아 실제 DB 기반으로 ETF를 찾아 표시.
 */
import Link from 'next/link';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import sec from './sectionStyles.module.css';
import styles from './InsightCarousel.module.css';

type Insight = {
  title: string;
  /** ETF name/shortName 일부 문자열로 매칭 */
  picks: string[];
  href: string;
};

const INSIGHTS: Insight[] = [
  {
    title: '월급 모이는 배당 ETF',
    picks: ['배당', '월배당', '다우존스배당'],
    href: '/etf?theme=월배당',
  },
  {
    title: 'S&P500 첫 ETF 고르기',
    picks: ['S&P500', 'SP500'],
    href: '/etf?theme=S%26P500',
  },
  {
    title: '나스닥 100 노리는 사람들',
    picks: ['나스닥100', '나스닥 100', 'NASDAQ100'],
    href: '/etf?theme=나스닥100',
  },
  {
    title: 'ISA 계좌에 담기 좋은 ETF',
    picks: ['S&P500', '나스닥100', '배당'],
    href: '/etf/screener',
  },
];

function InsightCard({ insight, allEtfs }: { insight: Insight; allEtfs: EtfInfo[] }) {
  const items = allEtfs
    .filter(e => insight.picks.some(p => e.shortName.includes(p) || e.name.includes(p) || e.theme.includes(p)))
    .slice(0, 3);

  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>{insight.title}</h4>
      <ul className={styles.cardList}>
        {items.length > 0 ? items.map(etf => (
          <li key={etf.slug}>
            <a className={styles.cardItem} href={etfPath(etf.slug)}>
              <span className={styles.cardEtf}>{etf.shortName}</span>
            </a>
          </li>
        )) : <li className={styles.cardEmpty}>—</li>}
      </ul>
      <Link className={styles.cardMore} href={insight.href}>더 보기 →</Link>
    </div>
  );
}

export function InsightCarousel({ allEtfs = [] }: { allEtfs?: EtfInfo[] }) {
  return (
    <section className={sec.card} aria-label="ETF 큐레이션">
      <div className={sec.head}>
        <h3 className={sec.title}>목적별 ETF 큐레이션</h3>
      </div>
      <div className={`${sec.bleedScroller} ${styles.scroller}`}>
        {INSIGHTS.map(i => (
          <InsightCard key={i.title} insight={i} allEtfs={allEtfs} />
        ))}
      </div>
    </section>
  );
}
