/**
 * 도미노 자산 홈 영역.
 * Phase B 현재: 비로그인/0보유 CTA만. 풀 기능은 Phase C에서.
 */
import Link from 'next/link';
import styles from './MyEtfSection.module.css';

export function MyEtfSection() {
  // TODO Phase C: Supabase에서 보유 ETF 조회해서 분기
  // - 비로그인 또는 보유 0: 현재 placeholder
  // - 보유 있음: <MyEtfDashboard /> (Phase C에서 구현)
  return (
    <section className={styles.empty} aria-label="내 ETF">
      <div className={styles.left}>
        <span className={styles.eyebrow}>내 ETF</span>
        <h2>보유 ETF를 한입에 관리하세요</h2>
        <p>수량·평단을 입력하면 자산 합계, 비중 도넛, 월별 예상 배당까지 자동으로 보여드려요.</p>
        <div className={styles.bullets}>
          <span>총자산 · 수익률 · 비중</span>
          <span>월별 예상 배당</span>
          <span>가격 알림 · 증시 캘린더</span>
        </div>
      </div>
      <div className={styles.right}>
        <Link className={styles.ctaPrimary} href="/auth?next=/etf">
          내 ETF 시작하기
        </Link>
        <Link className={styles.ctaGhost} href="#explore">
          먼저 둘러보기 ↓
        </Link>
      </div>
    </section>
  );
}
