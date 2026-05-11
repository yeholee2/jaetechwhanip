/**
 * ETFCheck식 HOT 테마 카드 가로 스크롤.
 * Phase B 현재: 정적 시드. Phase F에서 실시간 테마 수익률 계산 검토.
 */
import Link from 'next/link';
import { ETF_HOME_PATH } from '@/lib/etfs';
import styles from './HotThemes.module.css';

type HotTheme = {
  rank: number;
  theme: string;
  themePct: string;
  topEtf: { name: string; pct: string };
  totalCount: number;
  trend: 'up' | 'down';
  region: 'kr' | 'us';
};

const HOT_KR: HotTheme[] = [
  { rank: 1, theme: '우주항공', themePct: '+7.44%', topEtf: { name: 'TIGER 미국우주테크', pct: '+16.08%' }, totalCount: 10, trend: 'up', region: 'kr' },
  { rank: 2, theme: '원유', themePct: '+5.76%', topEtf: { name: 'TIGER 원유선물Enhanced', pct: '+5.81%' }, totalCount: 2, trend: 'up', region: 'kr' },
  { rank: 3, theme: '밸류업', themePct: '+5.61%', topEtf: { name: 'RISE 코리아밸류업', pct: '+6.23%' }, totalCount: 13, trend: 'up', region: 'kr' },
  { rank: 4, theme: 'MSCI Korea', themePct: '+5.42%', topEtf: { name: 'KODEX MSCI Korea', pct: '+5.72%' }, totalCount: 4, trend: 'up', region: 'kr' },
  { rank: 5, theme: '반도체', themePct: '+5.08%', topEtf: { name: 'KODEX 반도체레버리지', pct: '+12.80%' }, totalCount: 18, trend: 'up', region: 'kr' },
];

const HOT_US: HotTheme[] = [
  { rank: 1, theme: 'AMD', themePct: '+9.49%', topEtf: { name: 'AMDY (AMD Option Income)', pct: '+9.49%' }, totalCount: 1, trend: 'up', region: 'us' },
  { rank: 2, theme: '모더나', themePct: '+8.35%', topEtf: { name: 'MRNY (MRNA Option Income)', pct: '+8.35%' }, totalCount: 1, trend: 'up', region: 'us' },
  { rank: 3, theme: 'MSCI Korea', themePct: '+7.61%', topEtf: { name: 'EWY (MSCI South Korea)', pct: '+7.61%' }, totalCount: 1, trend: 'up', region: 'us' },
  { rank: 4, theme: '힘스앤허즈', themePct: '+7.23%', topEtf: { name: 'HIYY (HIMS Option Income)', pct: '+7.23%' }, totalCount: 1, trend: 'up', region: 'us' },
];

function ThemeCard({ item }: { item: HotTheme }) {
  return (
    <Link
      className={styles.card}
      href={`${ETF_HOME_PATH}?q=${encodeURIComponent(item.theme)}`}
    >
      <div className={styles.rankBadge}>{item.rank}</div>
      <div className={styles.themeName}>{item.theme}</div>
      <div className={styles.themePct}>{item.themePct}</div>
      <div className={styles.divider} />
      <div className={styles.topEtf}>
        <span className={styles.topEtfName}>{item.topEtf.name}</span>
        <span className={styles.topEtfPct}>{item.topEtf.pct}</span>
      </div>
      <div className={styles.meta}>
        <span>{item.totalCount}개 종목 / 상승</span>
      </div>
    </Link>
  );
}

export function HotThemes() {
  return (
    <>
      <section className={styles.section} aria-label="국내 HOT 테마">
        <div className={styles.head}>
          <h3 className={styles.title}>
            HOT 테마
            <span className={styles.subTitle}>국내</span>
          </h3>
          <div className={styles.controls}>
            <span className={`${styles.toggle} ${styles.toggleActive}`}>상승</span>
            <span className={styles.toggle}>하락</span>
            <span className={styles.range}>당일</span>
          </div>
        </div>
        <div className={styles.scroller}>
          {HOT_KR.map(item => <ThemeCard key={item.rank} item={item} />)}
        </div>
      </section>

      <section className={styles.section} aria-label="미국 HOT 테마">
        <div className={styles.head}>
          <h3 className={styles.title}>
            US HOT 테마
            <span className={styles.subTitle}>미국</span>
          </h3>
          <div className={styles.controls}>
            <span className={`${styles.toggle} ${styles.toggleActive}`}>상승</span>
            <span className={styles.toggle}>하락</span>
            <span className={styles.range}>전일</span>
          </div>
        </div>
        <div className={styles.scroller}>
          {HOT_US.map(item => <ThemeCard key={item.rank} item={item} />)}
        </div>
      </section>
    </>
  );
}
