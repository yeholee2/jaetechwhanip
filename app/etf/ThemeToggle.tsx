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
  { key: '반도체', test: (e: EtfInfo) => /반도체|필라델피아|SOX/i.test(e.theme + e.name) && NOT_LEVERAGE(e),
    ai: 'HBM·AI 인프라 수요로 SK하이닉스·삼성전자가 끌고 있어요. 변동은 크지만 장기 흐름은 견조한 편.' },
  { key: 'AI',    test: (e: EtfInfo) => /\bAI\b|인공지능|글로벌AI/i.test(e.theme + e.name) && NOT_LEVERAGE(e),
    ai: '엔비디아 중심으로 인프라 → 응용 단계로 확장 중이에요. 성장은 크지만 단기 변동성이 높아요.' },
  { key: '배당',  test: (e: EtfInfo) => /배당|다우존스배당|고배당/i.test(e.theme + e.name) && !/월배당/.test(e.theme + e.name),
    ai: '고금리 환경에서 안정 현금흐름 선호가 올라가는 중. 보수적 포트폴리오의 코어로 자주 담겨요.' },
  { key: '월배당',test: (e: EtfInfo) => /월배당|월분배|커버드콜/i.test(e.theme + e.name),
    ai: '매월 분배금이 들어오는 구조 — 은퇴자·현금흐름 중심 투자자에게 인기. 커버드콜형이 분배율 ↑.' },
  { key: 'S&P500',test: (e: EtfInfo) => /S&P500|S&P 500/i.test(e.theme + e.name) && NOT_LEVERAGE(e),
    ai: '미국 대형주 500개 — 글로벌 포트폴리오의 코어. 장기 우상향이 검증된 가장 무난한 선택.' },
  { key: '리츠',  test: (e: EtfInfo) => /리츠|REITs|부동산/i.test(e.theme + e.name + e.category),
    ai: '금리 인하 기대 + 데이터센터 리츠 강세. 분배수익률이 높아 현금흐름 위주로 담는 자산.' },
  { key: '원자재',test: (e: EtfInfo) => /원자재|코모디티/i.test(e.theme + e.name + e.category),
    ai: '달러 약세 + 인플레이션 헤지 수요로 관심이 올라요. 원유·금이 동시에 강세인 구간이에요.' },
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

  const resolvedConfig = useMemo(
    () => THEME_CONFIG.find(t => t.key === resolvedTheme),
    [resolvedTheme],
  );

  const items = useMemo(() => {
    if (!resolvedConfig) return [];
    return allEtfs.filter(resolvedConfig.test).slice(0, 5);
  }, [resolvedConfig, allEtfs]);

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

      {/* 한입 AI 요약 — 왜 이 테마가 핫한지 한 줄 */}
      {resolvedConfig?.ai && (
        <div className={styles.aiCard}>
          <span className={styles.aiEyebrow}>
            <span className={`${styles.aiSparkle} tf`} aria-hidden="true">✨</span>
            한입 AI 요약
          </span>
          <p className={styles.aiBody}>{resolvedConfig.ai}</p>
        </div>
      )}

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
