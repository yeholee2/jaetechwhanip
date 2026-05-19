import { AppShell } from '@/components/AppShell';
import styles from './EtfDetailPage.module.css';

export default function LoadingEtfDetail() {
  return (
    <AppShell active="etf" wide hideSlogan>
      <main className={styles.page} aria-busy="true" aria-label="ETF 상세 정보를 불러오는 중">
        <section className={`${styles.hero} ${styles.loadingHero}`}>
          <div className={styles.heroMain}>
            <div className={`${styles.loadingLine} ${styles.loadingBadge}`} />
            <div className={`${styles.loadingLine} ${styles.loadingTitle}`} />
            <div className={`${styles.loadingLine} ${styles.loadingText}`} />
            <div className={styles.loadingActions}>
              <div className={`${styles.loadingLine} ${styles.loadingButton}`} />
              <div className={`${styles.loadingLine} ${styles.loadingButton}`} />
              <div className={`${styles.loadingLine} ${styles.loadingButton}`} />
            </div>
          </div>
          <div className={styles.loadingPrice}>
            <div className={`${styles.loadingLine} ${styles.loadingSmall}`} />
            <div className={`${styles.loadingLine} ${styles.loadingPriceValue}`} />
            <div className={`${styles.loadingLine} ${styles.loadingSmall}`} />
          </div>
        </section>
        <div className={`${styles.quoteBlock} ${styles.loadingChart}`}>
          <div className={`${styles.loadingLine} ${styles.loadingChartTitle}`} />
          <div className={`${styles.loadingLine} ${styles.loadingChartBody}`} />
        </div>
        <section className={styles.decisionSummary}>
          <div className={styles.decisionIntro}>
            <div className={`${styles.loadingLine} ${styles.loadingSmall}`} />
            <div className={`${styles.loadingLine} ${styles.loadingTextWide}`} />
          </div>
          <div className={styles.decisionGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={styles.decisionCard}>
                <div className={`${styles.loadingLine} ${styles.loadingSmall}`} />
                <div className={`${styles.loadingLine} ${styles.loadingMetric}`} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
