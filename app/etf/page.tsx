import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_PATH, ETF_HOME_URL, etfs } from '@/lib/etfs';
import { SITE_NAME } from '@/lib/seo';
import styles from './EtfPage.module.css';
import { EtfPageTabs } from './EtfPageTabs';
import { MyEtfSection } from './MyEtfSection';
import { MarketIndices } from './MarketIndices';
import { EtfNews } from './EtfNews';
import { EtfRanking } from './EtfRanking';
import { CtaCards } from './CtaCards';
import { StrategyToggle } from './StrategyToggle';
import { ThemeToggle } from './ThemeToggle';
import { InsightCarousel } from './InsightCarousel';
import { FeaturePromo } from './FeaturePromo';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ETF',
  description: 'ETF 자산을 한입에 관리하세요. 시장 지수·최신 뉴스·랭킹·전략·테마·큐레이션까지 한 페이지에서.',
  keywords: ['ETF', '포트폴리오', 'S&P500 ETF', '나스닥100 ETF', '월배당 ETF', 'ISA ETF', SITE_NAME],
  alternates: { canonical: ETF_HOME_PATH },
  openGraph: {
    title: `ETF | ${SITE_NAME}`,
    description: 'ETF 자산을 한입에 관리하세요.',
    url: ETF_HOME_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `ETF | ${SITE_NAME}`,
    description: 'ETF 자산을 한입에 관리하세요.',
  },
};

export default async function EtfPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '재테크한입 ETF',
    url: ETF_HOME_URL,
    inLanguage: 'ko-KR',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: ETF_HOME_URL.replace('/etf', ''),
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: etfs.map((etf, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${ETF_HOME_URL}/${encodeURIComponent(etf.slug)}`,
        name: etf.name,
      })),
    },
  };

  return (
    <AppShell active="etf" hideSlogan>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>ETF</h1>
          <p>시장 흐름부터 내 포트폴리오까지 한 화면에서.</p>
        </header>

        {/* RW 상단 탭 — 발견/관심/진단/피드 */}
        <EtfPageTabs active="discover" />

        {/* 1. 내 ETF (RW엔 CTA에 진단으로 들어가나, 우리는 도미노 풀화면 가능해 상단에) */}
        <MyEtfSection />

        {/* 2. 시장 지수 가로 스크롤 */}
        <MarketIndices />

        {/* 3. 최신 ETF 뉴스 */}
        <EtfNews />

        {/* 4. 투자 매력도 높은 ETF (RW: 투자 매력도 높은 주식) */}
        <EtfRanking />

        {/* 5. CTA 카드 2개 (RW: 큰 돈 / 내 주식 진단) */}
        <CtaCards />

        {/* 6. 따라하면 돈 버는 ETF 전략 (RW: 따라하면 돈 버는 투자 전략) */}
        <StrategyToggle />

        {/* 7. 요즘 뜨는 ETF 테마 (RW: 요즘 뜨는 산업) */}
        <ThemeToggle />

        {/* 8. ETF 큐레이션 가로 카드 (RW: 트럼프 리스크 / AI 전기 / K-푸드) */}
        <InsightCarousel />

        {/* 9. 단일 진입 카드 (RW: 세계가 주목하는 K-뷰티) */}
        <FeaturePromo />
      </main>
    </AppShell>
  );
}
