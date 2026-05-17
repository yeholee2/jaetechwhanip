import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className="logo-font">재테크<em>한입</em></span>
          <p>재테크 고민을 한 곳에서. 시장 흐름·ETF·포트폴리오·Q&A까지.</p>
        </div>

        <nav className={styles.nav} aria-label="사이트 맵">
          <div className={styles.col}>
            <h3>서비스</h3>
            <Link href="/">홈 (Q&A)</Link>
            <Link href="/etf">ETF</Link>
            <Link href="/etf/all">전체 ETF 검색</Link>
            <Link href="/etf/compare">ETF 비교</Link>
            <Link href="/feed">피드</Link>
            <Link href="/sparring">스파링</Link>
          </div>
          <div className={styles.col}>
            <h3>기능</h3>
            <Link href="/etf?tab=watch">관심 ETF</Link>
            <Link href="/etf?tab=diagnostic">포트폴리오 진단</Link>
            <Link href="/feed?tab=report">리포트</Link>
            <Link href="/questions/create">질문하기</Link>
          </div>
          <div className={styles.col}>
            <h3>안내</h3>
            <a href="https://hannipmoney.com" target="_blank" rel="noreferrer">한입머니 블로그</a>
            <a href="mailto:imyeho@gmail.com">문의 보내기</a>
          </div>
        </nav>
      </div>

      <div className={styles.legal}>
        <p>© 2026 재테크한입. 본 서비스의 정보는 투자 권유가 아니며 참고 목적입니다.</p>
      </div>
    </footer>
  );
}
