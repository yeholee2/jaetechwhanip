/**
 * "요즘 뜨는 ETF 테마" — RiskWeather "요즘 뜨는 산업" 패턴.
 * 가로 토글 + 종목 리스트.
 * Phase B: 정적 시드. Phase F에서 카테고리별 실시간 매핑.
 */
import Link from 'next/link';
import { etfPath, etfs } from '@/lib/etfs';
import { EtfLogo } from './EtfLogo';
import styles from './ThemeToggle.module.css';

const THEMES = ['반도체', 'AI', '배당', '월배당', 'S&P500', '리츠', '원자재'] as const;

type ThemeKey = typeof THEMES[number];

// 시드 — 테마별 매핑 (Phase F에서 etfs.tags 기반 동적 필터)
const SEED: Record<ThemeKey, string[]> = {
  '반도체': ['TIGER 미국필라델피아반도체나스닥', 'KODEX 미국S&P500TR'],
  'AI': ['KODEX 미국나스닥100TR', 'TIGER 미국S&P500'],
  '배당': ['ACE 미국배당다우존스'],
  '월배당': ['ACE 미국배당다우존스'],
  'S&P500': ['TIGER 미국S&P500', 'KODEX 미국S&P500TR'],
  '리츠': [],
  '원자재': [],
};

export function ThemeToggle() {
  // 첫 번째 테마 기본 활성 (Phase B는 정적, Phase F에서 client component로 토글)
  const activeTheme: ThemeKey = '반도체';
  const targetNames = SEED[activeTheme];
  const items = etfs.filter(e => targetNames.some(n => e.shortName.includes(n) || e.name.includes(n))).slice(0, 5);

  return (
    <section className={styles.section} aria-label="요즘 뜨는 ETF 테마">
      <h3 className={styles.title}>요즘 뜨는 테마</h3>

      <div className={styles.toggleRow}>
        {THEMES.map(theme => (
          <span
            key={theme}
            className={`${styles.toggle} ${theme === activeTheme ? styles.toggleActive : ''}`}
          >
            {theme}
          </span>
        ))}
      </div>

      <ul className={styles.list}>
        {items.length > 0 ? items.map(etf => (
          <li key={etf.slug}>
            <Link className={styles.item} href={etfPath(etf.slug)}>
              <EtfLogo name={etf.shortName} size={36} />
              <div className={styles.info}>
                <strong>{etf.shortName}</strong>
                <span>{etf.price}</span>
              </div>
              <span className={etf.changeTone === 'down' ? styles.down : styles.up}>
                {etf.change}
              </span>
            </Link>
          </li>
        )) : (
          <li className={styles.empty}>해당 테마 ETF를 곧 보강할게요.</li>
        )}
      </ul>
    </section>
  );
}
