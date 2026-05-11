/**
 * CTA 링크 카드 — RiskWeather "큰 돈 나갈 일 미리 준비하기" 패턴.
 */
import Link from 'next/link';
import styles from './CtaCards.module.css';

const CARDS = [
  {
    icon: '💰',
    title: '큰 돈 모으는 ETF 전략',
    sub: '적립식, 장기투자, ISA',
    href: '/articles?topic=재테크입문',
  },
  {
    icon: '🩺',
    title: '내 ETF 포트폴리오 진단받기',
    sub: '비중·수익률·리스크 한눈에',
    href: '/auth?next=/etf',
  },
] as const;

export function CtaCards() {
  return (
    <section className={styles.section} aria-label="ETF 가이드">
      {CARDS.map(c => (
        <Link key={c.href} className={styles.card} href={c.href}>
          <span className={styles.icon} aria-hidden="true">{c.icon}</span>
          <div className={styles.body}>
            <strong>{c.title}</strong>
            <span>{c.sub}</span>
          </div>
          <span className={styles.arrow} aria-hidden="true">›</span>
        </Link>
      ))}
    </section>
  );
}
