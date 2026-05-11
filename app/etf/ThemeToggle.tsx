'use client';

/**
 * "요즘 뜨는 ETF 테마" — RiskWeather "요즘 뜨는 산업" 패턴.
 * 가로 토글 + 종목 리스트. 클릭으로 활성 테마 전환.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { etfPath, etfs } from '@/lib/etfs';
import { EtfLogo } from './EtfLogo';
import { Chip } from '@/components/ui';
import styles from './ThemeToggle.module.css';

const THEMES = ['반도체', 'AI', '배당', '월배당', 'S&P500', '리츠', '원자재'] as const;

type ThemeKey = typeof THEMES[number];

// 테마별 매핑 시드 — Phase F에서 etfs.tags 기반 동적 필터로 대체.
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
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('반도체');

  const items = useMemo(() => {
    const targetNames = SEED[activeTheme];
    return etfs
      .filter(e => targetNames.some(n => e.shortName.includes(n) || e.name.includes(n)))
      .slice(0, 5);
  }, [activeTheme]);

  return (
    <section className={styles.section} aria-label="요즘 뜨는 ETF 테마">
      <h3 className={styles.title}>요즘 뜨는 테마</h3>

      <div className={styles.toggleRow}>
        {THEMES.map(theme => (
          <Chip
            key={theme}
            active={theme === activeTheme}
            size="sm"
            onClick={() => setActiveTheme(theme)}
          >
            {theme}
          </Chip>
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
          <li className={styles.empty}>'{activeTheme}' 테마 ETF를 곧 보강할게요.</li>
        )}
      </ul>
    </section>
  );
}
