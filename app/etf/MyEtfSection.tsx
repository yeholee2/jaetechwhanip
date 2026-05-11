/**
 * 내 ETF 진입 카드 — RiskWeather "내 주식 포트폴리오 진단받기" 패턴.
 * Phase C에서 보유 fetch + 풀 화면 분기.
 */
import Link from 'next/link';
import styles from './MyEtfSection.module.css';

export function MyEtfSection() {
  return (
    <Link className={styles.row} href="/auth?next=/etf" aria-label="내 ETF 포트폴리오 시작하기">
      <span className={styles.icon} aria-hidden="true">📊</span>
      <div className={styles.body}>
        <strong>내 ETF 포트폴리오 시작하기</strong>
        <span>수량·평단 입력 → 자산·비중·예상 배당 자동 계산</span>
      </div>
      <span className={styles.arrow} aria-hidden="true">›</span>
    </Link>
  );
}
