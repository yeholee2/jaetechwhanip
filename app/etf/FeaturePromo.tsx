/**
 * RiskWeather "세계가 주목하는 K-뷰티" 패턴 — 이미지/이모지 + 큰 카피 + ❯ 한 줄.
 */
import Link from 'next/link';
import styles from './FeaturePromo.module.css';

export function FeaturePromo() {
  return (
    <Link className={styles.card} href="/articles?topic=재테크입문">
      <span className={styles.illustration} aria-hidden="true">💼</span>
      <div className={styles.body}>
        <strong>월급 모으는 ETF, 처음부터 끝까지</strong>
        <span>적립식 투자가 처음이라면 이 글부터 읽어보세요</span>
      </div>
      <span className={styles.arrow} aria-hidden="true">›</span>
    </Link>
  );
}
