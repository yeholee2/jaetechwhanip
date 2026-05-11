import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_PATH, ETF_HOME_URL, etfs } from '@/lib/etfs';
import { SITE_NAME } from '@/lib/seo';
import { PageHero, Badge, Card, Button } from '@/components/ui';
import styles from './EtfPage.module.css';
import { EtfPageTabs, type EtfPageTab } from './EtfPageTabs';
import { MyEtfSection } from './MyEtfSection';
import { MarketIndices } from './MarketIndices';
import { EtfNews } from './EtfNews';
import { EtfRanking } from './EtfRanking';
import { CtaCards } from './CtaCards';
import { StrategyToggle } from './StrategyToggle';
import { ThemeToggle } from './ThemeToggle';
import { InsightCarousel } from './InsightCarousel';
import { FeaturePromo } from './FeaturePromo';
import { WatchList } from './WatchList';
import { PortfolioDiagnostic } from './PortfolioDiagnostic';
import { EtfLearnCard } from './EtfLearnCard';

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

const VALID_TABS: EtfPageTab[] = ['discover', 'watch', 'diagnostic', 'feed'];

function getActiveTab(raw?: string): EtfPageTab {
  if (raw && (VALID_TABS as string[]).includes(raw)) return raw as EtfPageTab;
  return 'discover';
}

export default async function EtfPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const active = getActiveTab(searchParams?.tab);

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
        <PageHero
          eyebrow="ETF"
          title="시장과 내 자산을 한 화면에"
          lead="지수·뉴스·랭킹·전략·테마를 한 페이지에서 보고, 내 포트폴리오로 바로 이어가요."
          aside={
            <>
              <Badge tone="primary">{etfs.length}개</Badge>
              <Button href="/etf/all" variant="outline" size="sm">전체 검색</Button>
            </>
          }
        />

        <EtfPageTabs active={active} />

        {active === 'discover' && <DiscoverTab />}
        {active === 'watch' && <WatchTabPlaceholder />}
        {active === 'diagnostic' && <DiagnosticTabPlaceholder />}
        {active === 'feed' && <FeedTabPlaceholder />}
      </main>
    </AppShell>
  );
}

function DiscoverTab() {
  return (
    <>
      {/* 1. 내 ETF (로그인 시 도미노 풀화면, 비로그인 시 가입 CTA) */}
      <MyEtfSection />

      {/* 2. 시장 지수 */}
      <MarketIndices />

      {/* 3. 최신 ETF 뉴스 */}
      <EtfNews />

      {/* 4. 투자 매력도 높은 ETF */}
      <EtfRanking />

      {/* 5. CTA 카드 2개 */}
      <CtaCards />

      {/* 6. 따라하면 돈 버는 ETF 전략 */}
      <StrategyToggle />

      {/* 7. 요즘 뜨는 ETF 테마 */}
      <ThemeToggle />

      {/* 8. 큐레이션 캐러셀 */}
      <InsightCarousel />

      {/* 9. 단일 피처 카드 */}
      <FeaturePromo />

      {/* 10. ETF 입문 가이드 (첫 사용자용) */}
      <EtfLearnCard />
    </>
  );
}

function ComingSoonCard({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <Card pad="lg" className={styles.comingSoonCard}>
      <div className={styles.comingSoonInner}>
        <Badge tone="purple">{eyebrow}</Badge>
        <h2 className={styles.comingSoonTitle}>{title}</h2>
        <p className={styles.comingSoonBody}>{body}</p>
        {ctaLabel && ctaHref && (
          <Button href={ctaHref} variant="primary" size="md" className={styles.comingSoonCta}>
            {ctaLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}

function WatchTabPlaceholder() {
  return <WatchList />;
}

function DiagnosticTabPlaceholder() {
  return <PortfolioDiagnostic />;
}

function FeedTabPlaceholder() {
  return (
    <ComingSoonCard
      eyebrow="ETF 피드"
      title="ETF 관련 글만 모아 보기"
      body="질문·뉴스·리포트·칼럼 중 ETF 카테고리만 필터링해 보여드릴 예정이에요. 그동안은 전체 피드에서 카테고리 칩으로 좁혀 보세요."
      ctaLabel="피드로 가기"
      ctaHref="/feed?category=국내주식·ETF"
    />
  );
}
