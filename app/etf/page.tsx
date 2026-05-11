import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_PATH, ETF_HOME_URL, etfs } from '@/lib/etfs';
import { SITE_NAME } from '@/lib/seo';
import styles from './EtfPage.module.css';
import { MyEtfSection } from './MyEtfSection';
import { ExploreHero } from './ExploreHero';
import { HotThemes } from './HotThemes';
import { EtfRanking } from './EtfRanking';
import { EtfNews } from './EtfNews';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ETF',
  description: 'ETF 자산을 한입에 관리하세요. 보유 ETF·HOT 테마·랭킹·증시 일정·AI 인사이트까지 한 페이지에서.',
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
    <AppShell active="etf" wide hideSlogan>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>ETF</span>
          <h1>ETF를 한입에 관리해요</h1>
          <p>내 보유부터 시장 흐름까지, 도미노식 자산 화면과 ETFCheck식 둘러보기를 한 페이지에서.</p>
        </header>

        <MyEtfSection />

        <ExploreHero />

        <HotThemes />

        <EtfRanking />

        <EtfNews />
      </main>
    </AppShell>
  );
}
