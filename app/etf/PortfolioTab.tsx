/**
 * /etf?tab=portfolio
 * Phase B 단계: placeholder UI.
 * Phase C에서 보유 입력/도넛/배당 캘린더 구현 예정.
 */
import Link from 'next/link';
import styles from './TabPlaceholder.module.css';

export function PortfolioTab() {
  return (
    <section className={styles.empty} aria-label="내 포트폴리오">
      <div className={styles.icon}>💼</div>
      <h2 className={styles.title}>내 ETF 포트폴리오를 한입에 관리하세요</h2>
      <p className={styles.desc}>보유 ETF를 입력하면 자산 합계와 비중, 월별 예상 배당까지 자동으로 보여드려요.</p>

      <ul className={styles.features}>
        <li className={styles.feature}>
          <span className={styles.featureIcon}>✓</span>
          보유 ETF 직접 입력 (수량·평단·계좌)
        </li>
        <li className={styles.feature}>
          <span className={styles.featureIcon}>✓</span>
          자산 합계 · 수익률 · 비중 도넛 자동 계산
        </li>
        <li className={styles.feature}>
          <span className={styles.featureIcon}>✓</span>
          월별 예상 배당금 캘린더
        </li>
      </ul>

      <p className={styles.desc} style={{ fontSize: 13 }}>
        곧 만나요 — 데이터 마이그레이션 후 활성화됩니다.
      </p>

      <Link className={styles.cta} href="/etf">
        ETF 둘러보기로 돌아가기
      </Link>
    </section>
  );
}
