/**
 * /etf?tab=ai
 * Phase B 단계: placeholder UI.
 * Phase E에서 OpenAI 기반 시장 브리프 + ETF별 3섹션 요약 구현 예정.
 */
import Link from 'next/link';
import styles from './TabPlaceholder.module.css';

export function AiTab() {
  return (
    <section className={styles.empty} aria-label="AI 인사이트">
      <div className={styles.icon}>🤖</div>
      <h2 className={styles.title}>AI가 시장과 ETF를 5줄로 정리해드려요</h2>
      <p className={styles.desc}>매일 아침 시장 동향과 보유 ETF의 개요·리스크·전망을 짧게 요약해드립니다.</p>

      <ul className={styles.features}>
        <li className={styles.feature}>
          <span className={styles.featureIcon}>✓</span>
          오늘의 ETF 시장 5줄 브리프 (매일 자동)
        </li>
        <li className={styles.feature}>
          <span className={styles.featureIcon}>✓</span>
          ETF별 개요 · 리스크 · 전망 3섹션
        </li>
        <li className={styles.feature}>
          <span className={styles.featureIcon}>✓</span>
          24시간 캐시 — 빠르고 일관된 답변
        </li>
      </ul>

      <p className={styles.desc} style={{ fontSize: 13 }}>
        곧 만나요 — OpenAI 연동 후 활성화됩니다.
      </p>

      <Link className={styles.cta} href="/etf">
        ETF 둘러보기로 돌아가기
      </Link>
    </section>
  );
}
