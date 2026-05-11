/**
 * /etf?tab=alerts
 * Phase B 단계: placeholder UI.
 * Phase D에서 가격 알림 + 증시 캘린더 구현 예정.
 */
import Link from 'next/link';
import styles from './TabPlaceholder.module.css';

export function AlertsTab() {
  return (
    <section className={styles.empty} aria-label="알림·캘린더">
      <div className={styles.icon}>🔔</div>
      <h2 className={styles.title}>가격 알림과 증시 일정을 한 곳에서</h2>
      <p className={styles.desc}>목표가에 도달하거나 FOMC·CPI 같은 주요 일정이 있을 때 미리 알려드려요.</p>

      <ul className={styles.features}>
        <li className={styles.feature}>
          <span className={styles.featureIcon}>✓</span>
          ETF 목표가 도달 / 일간 ±X% 변동 알림
        </li>
        <li className={styles.feature}>
          <span className={styles.featureIcon}>✓</span>
          FOMC · CPI · 한미 금리 결정 캘린더
        </li>
        <li className={styles.feature}>
          <span className={styles.featureIcon}>✓</span>
          보유 ETF 분배락 일정 자동 표시
        </li>
      </ul>

      <p className={styles.desc} style={{ fontSize: 13 }}>
        곧 만나요 — 매일 시세 체크 cron 연동 후 활성화됩니다.
      </p>

      <Link className={styles.cta} href="/etf">
        ETF 둘러보기로 돌아가기
      </Link>
    </section>
  );
}
