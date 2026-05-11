/**
 * RiskWeather 인사이트 가로 카드 스크롤 — 큐레이션 묶음.
 * 카드 안: 큰 제목 + 종목 3개 + "더 보기".
 */
import Link from 'next/link';
import { etfPath, etfs } from '@/lib/etfs';
import sec from './sectionStyles.module.css';
import styles from './InsightCarousel.module.css';

type Insight = {
  title: string;
  picks: string[];
  href: string;
};

const INSIGHTS: Insight[] = [
  {
    title: '월급 모이는 월배당 ETF',
    picks: ['ACE 미국배당다우존스'],
    href: '/etf?theme=월배당',
  },
  {
    title: 'S&P500 첫 ETF 고르기',
    picks: ['TIGER 미국S&P500', 'KODEX 미국S&P500TR'],
    href: '/etf?theme=S%26P500',
  },
  {
    title: '나스닥 100 노리는 사람들',
    picks: ['KODEX 미국나스닥100TR'],
    href: '/etf?theme=나스닥100',
  },
  {
    title: 'ISA 계좌에 담기 좋은 ETF',
    picks: ['TIGER 미국S&P500', 'ACE 미국배당다우존스'],
    href: '/etf?theme=ISA',
  },
];

function InsightCard({ insight }: { insight: Insight }) {
  const items = etfs
    .filter(e => insight.picks.some(p => e.shortName.includes(p) || e.name.includes(p)))
    .slice(0, 3);

  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>{insight.title}</h4>
      <ul className={styles.cardList}>
        {items.length > 0 ? items.map(etf => (
          <li key={etf.slug}>
            <Link className={styles.cardItem} href={etfPath(etf.slug)}>
              <span className={styles.cardEtf}>{etf.shortName}</span>
            </Link>
          </li>
        )) : <li className={styles.cardEmpty}>—</li>}
      </ul>
      <Link className={styles.cardMore} href={insight.href}>더 보기 →</Link>
    </div>
  );
}

export function InsightCarousel() {
  return (
    <section className={sec.card} aria-label="ETF 큐레이션">
      <div className={sec.head}>
        <h3 className={sec.title}>이번 주 ETF 큐레이션</h3>
        <span className={sec.meta}>{INSIGHTS.length}개 묶음</span>
      </div>
      <div className={`${sec.bleedScroller} ${styles.scroller}`}>
        {INSIGHTS.map(i => (
          <InsightCard key={i.title} insight={i} />
        ))}
      </div>
    </section>
  );
}
