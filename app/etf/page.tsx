import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_PATH, ETF_HOME_URL } from '@/lib/etfs';
import { fetchEtfs } from '@/lib/etfsDb';
import { SITE_NAME } from '@/lib/seo';
import { PageHero, Badge, Card, Button } from '@/components/ui';
import styles from './EtfPage.module.css';
import { EtfPageTabs, EtfUtilityRow, type EtfPageTab } from './EtfPageTabs';
import { MyEtfSection } from './MyEtfSection';
import { MarketTicker } from './MarketTicker';
import { EtfNews } from './EtfNews';
import { EtfRanking } from './EtfRanking';
import { CtaCards } from './CtaCards';
import { StrategyToggle } from './StrategyToggle';
import { ThemeToggle } from './ThemeToggle';
import { InsightCarousel } from './InsightCarousel';
import { FeaturePromo } from './FeaturePromo';
import { WatchList } from './WatchList';
import { PortfolioDiagnostic } from './PortfolioDiagnostic';
import { PageSidebar } from '@/components/PageSidebar';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ETF',
  description: 'ETF 자산을 한 화면에서. 시장 지수·최신 뉴스·랭킹·전략·테마·큐레이션까지.',
  keywords: ['ETF', '포트폴리오', 'S&P500 ETF', '나스닥100 ETF', '월배당 ETF', 'ISA ETF', SITE_NAME],
  alternates: { canonical: ETF_HOME_PATH },
  openGraph: {
    title: `ETF | ${SITE_NAME}`,
    description: 'ETF 자산을 한 화면에서 관리하세요.',
    url: ETF_HOME_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `ETF | ${SITE_NAME}`,
    description: 'ETF 자산을 한 화면에서 관리하세요.',
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
  searchParams?: { tab?: string; view?: string };
}) {
  const active = getActiveTab(searchParams?.tab);
  const savedListView = searchParams?.view === 'watch' ? 'watch' : 'recent';
  const sidebarWidgets: import('@/components/PageSidebar').SidebarWidget[] =
    active === 'watch' ? ['sparring', 'help'] : ['sparring', 'watch', 'help'];
  const [{ sparrings }, etfs] = await Promise.all([
    listSparrings(),
    fetchEtfs(2000),
  ]);
  const featured = getFeaturedActiveSparring(sparrings);

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
      itemListElement: etfs.slice(0, 50).map((etf, index) => ({
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
      <main className="pc-layout-stack">
        {/* 시장 시세 티커 — 전체 폭 (사이드 끝까지) */}
        <MarketTicker />

        {/* 메인 + 사이드 */}
        <div className="pc-layout">
          <div className="pc-layout-main">
            <EtfPageTabs active={active} />

            {active === 'discover' && <DiscoverTab allEtfs={etfs} />}
            {active === 'watch' && <WatchTabPlaceholder allEtfs={etfs} initialView={savedListView} />}
            {active === 'diagnostic' && <DiagnosticTabPlaceholder allEtfs={etfs} />}
            {active === 'feed' && <FeedTabPlaceholder />}
          </div>

          <PageSidebar widgets={sidebarWidgets} featuredSparring={featured} />
        </div>
      </main>
    </AppShell>
  );
}

async function DiscoverTab({ allEtfs }: { allEtfs: import('@/lib/etfs').EtfInfo[] }) {
  // 발견 탭은 핵심만. 테마·뉴스·전체검색은 상단 탭으로 분리.
  return (
    <div className={styles.discoverStack}>
      {/* 0. 유틸리티 도구 행 (비교/관심/진단) */}
      <EtfUtilityRow />

      {/* 1. 내 ETF (로그인 시 도미노 풀화면, 비로그인 시 가입 CTA) */}
      <MyEtfSection />

      {/* 2. 투자 매력도 높은 ETF */}
      <EtfRanking allEtfs={allEtfs} />

      {/* 3. 요즘 뜨는 테마 (mini) — AI 요약 포함 */}
      <ThemeToggle allEtfs={allEtfs} />
    </div>
  );
}

// DiscoverMoreCards 제거됨 — 콘텐츠는 상단 탭(테마·전략/뉴스/전체 검색)으로 승격

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

function WatchTabPlaceholder({
  allEtfs,
  initialView,
}: {
  allEtfs: import('@/lib/etfs').EtfInfo[];
  initialView: 'recent' | 'watch';
}) {
  return <WatchList allEtfs={allEtfs} initialView={initialView} />;
}

function DiagnosticTabPlaceholder({ allEtfs }: { allEtfs: import('@/lib/etfs').EtfInfo[] }) {
  return <PortfolioDiagnostic allEtfs={allEtfs} />;
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
