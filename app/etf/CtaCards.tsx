/**
 * CTA 링크 카드 — '입문 + 진단' 두 개를 한 섹션 카드 안에 정렬.
 */
import Link from 'next/link';
import sec from './sectionStyles.module.css';
import styles from './CtaCards.module.css';

const CARDS = [
  {
    icon: '💰',
    title: '큰 돈 모으는 ETF 전략',
    sub: '적립식, 장기투자, ISA',
    href: '/feed?category=재테크입문',
  },
  {
    icon: '🩺',
    title: '내 ETF 포트폴리오 진단받기',
    sub: '비중·수익률·리스크 한눈에',
    href: '/etf?tab=diagnostic',
  },
] as const;

export function CtaCards() {
  return (
    <section className={sec.card} aria-label="ETF 가이드">
      <div className={sec.head}>
        <h3 className={sec.title}>가이드</h3>
        <span className={sec.meta}>입문 · 진단</span>
      </div>
      <div className={styles.grid}>
        {CARDS.map(c => (
          <Link key={c.href} className={styles.card} href={c.href}>
            <span className={`${styles.icon} tf`} aria-hidden="true">{c.icon}</span>
            <div className={styles.body}>
              <strong>{c.title}</strong>
              <span>{c.sub}</span>
            </div>
            <span className={styles.arrow} aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
