/**
 * ETFCheck식 둘러보기 진입점 — 인기 키워드 칩.
 * Phase B 현재: 정적 시드. Phase F에서 실시간 인기 검색어 연결 검토.
 */
import Link from 'next/link';
import { ETF_HOME_PATH } from '@/lib/etfs';
import styles from './ExploreHero.module.css';

const POPULAR_KEYWORDS = [
  '반도체', '월배당', 'AI전력', '로봇', '우주항공',
  '나스닥100', '커버드콜', 'S&P500', '밸류업', '레버리지2X',
] as const;

export function ExploreHero() {
  return (
    <section id="explore" className={styles.hero} aria-label="ETF 둘러보기">
      <div className={styles.head}>
        <h2 className={styles.title}>둘러보기</h2>
        <p className={styles.sub}>인기 테마와 키워드로 빠르게 찾아봐요</p>
      </div>
      <div className={styles.keywords}>
        {POPULAR_KEYWORDS.map(kw => (
          <Link
            key={kw}
            className={styles.chip}
            href={`${ETF_HOME_PATH}?q=${encodeURIComponent(kw)}`}
          >
            #{kw}
          </Link>
        ))}
      </div>
    </section>
  );
}
