'use client';

/**
 * "요즘 뜨는 ETF 테마" — 테마 토글 + 종목 리스트.
 * allEtfs prop을 받아 theme/category/name 기반으로 동적 필터링.
 * 데이터 없는 테마 탭은 자동으로 숨김.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import { EtfLogo } from './EtfLogo';
import { Chip } from '@/components/ui';
import sec from './sectionStyles.module.css';
import styles from './ThemeToggle.module.css';

/** 레버리지/인버스 ETF는 테마 섹션에서 제외 */
const NOT_LEVERAGE = (e: EtfInfo) => !/레버리지|인버스|곱버스/i.test(e.name);

const THEME_CONFIG = [
  { key: '반도체', test: (e: EtfInfo) => /반도체|필라델피아|SOX/i.test(e.theme + e.name) && NOT_LEVERAGE(e) },
  { key: 'AI',    test: (e: EtfInfo) => /\bAI\b|인공지능|글로벌AI/i.test(e.theme + e.name) && NOT_LEVERAGE(e) },
  { key: '배당',  test: (e: EtfInfo) => /배당|다우존스배당|고배당/i.test(e.theme + e.name) && !/월배당/.test(e.theme + e.name) },
  { key: '월배당',test: (e: EtfInfo) => /월배당|월분배|커버드콜/i.test(e.theme + e.name) },
  { key: 'S&P500',test: (e: EtfInfo) => /S&P500|S&P 500/i.test(e.theme + e.name) && NOT_LEVERAGE(e) },
  { key: '리츠',  test: (e: EtfInfo) => /리츠|REITs|부동산/i.test(e.theme + e.name + e.category) },
  { key: '원자재',test: (e: EtfInfo) => /원자재|코모디티/i.test(e.theme + e.name + e.category) },
] as const;

type ThemeKey = typeof THEME_CONFIG[number]['key'];

export function ThemeToggle({ allEtfs = [] }: { allEtfs?: EtfInfo[] }) {
  // 데이터 있는 테마만 탭으로 표시
  const availableThemes = useMemo(
    () => THEME_CONFIG.filter(t => allEtfs.some(t.test)),
    [allEtfs],
  );

  const [activeTheme, setActiveTheme] = useState<ThemeKey | null>(null);

  // 첫 번째 유효 테마를 기본값으로
  const resolvedTheme = activeTheme ?? availableThemes[0]?.key ?? null;

  const items = useMemo(() => {
    if (!resolvedTheme) return [];
    const config = THEME_CONFIG.find(t => t.key === resolvedTheme);
    if (!config) return [];
    return allEtfs.filter(config.test).slice(0, 5);
  }, [resolvedTheme, allEtfs]);

  if (availableThemes.length === 0) return null;

  return (
    <section className={sec.card} aria-label="요즘 뜨는 ETF 테마">
      <div className={sec.head}>
        <h3 className={sec.title}>요즘 뜨는 테마</h3>
      </div>

      <div className={`${sec.bleedScroller} ${styles.toggleRow}`}>
        {availableThemes.map(t => (
          <Chip
            key={t.key}
            active={t.key === resolvedTheme}
            size="sm"
            onClick={() => setActiveTheme(t.key)}
          >
            {t.key}
          </Chip>
        ))}
      </div>

      <ul className={styles.list}>
        {items.map(etf => (
          <li key={etf.slug}>
            <Link className={styles.item} href={etfPath(etf.slug)}>
              <EtfLogo name={etf.shortName} code={etf.code} size={36} />
              <div className={styles.info}>
                <strong>{etf.shortName}</strong>
                <span>{etf.price}</span>
              </div>
              <span className={etf.changeTone === 'down' ? styles.down : styles.up}>
                {etf.change}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
