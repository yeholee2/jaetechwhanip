import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHero, Badge } from '@/components/ui';
import { PortfolioDiagnostic } from '../etf/PortfolioDiagnostic';
import { PORTFOLIO_TEMPLATES } from '@/lib/portfolioTemplates';
import { fetchWhales } from '@/lib/portfolioWhalesDb';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { PortfolioTabs, type PortfolioTab } from './PortfolioTabs';
import { LabSection } from './LabSection';
import { AutoPortfolio } from './AutoPortfolio';
import styles from './PortfolioPage.module.css';

export const revalidate = 300;

const PATH = '/portfolio';
const URL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: 'MY포트폴리오',
  description:
    '내 보유 ETF를 입력하면 섹터 중복도·환노출·총보수 가중평균·위험 등급을 한 번에 분석해드려요. 대가들의 포트폴리오로 시작하기.',
  keywords: ['포트폴리오 진단', 'ETF 진단', '내 자산', '섹터 중복도', '환노출', '대가 포트폴리오', SITE_NAME],
  alternates: { canonical: PATH },
  openGraph: {
    title: `MY포트폴리오 | ${SITE_NAME}`,
    description: '내 ETF 포트폴리오를 한 번에 진단하고, 대가들의 자산배분을 따라하세요.',
    url: URL,
    type: 'website',
  },
};

type Props = { searchParams?: { tab?: string } };

const TAB_HERO: Record<PortfolioTab, { title: string; lead: string }> = {
  build: {
    title: '내 ETF, 한 번에 진단',
    lead: '섹터 중복도 · 환노출 · 보수 가중평균 · 위험 등급을 한 화면에서.',
  },
  auto: {
    title: '나이·성향에 맞춘 자동 추천',
    lead: 'TDF 글라이드 패스로 자산 배분 + 카테고리별 ETF를 즉시 제안해요.',
  },
  copy: {
    title: '대가의 포트폴리오로 시작하기',
    lead: '버핏 · 달리오 · 보글 — 검증된 자산배분과 SEC 13F 실시간 보유.',
  },
  lab: {
    title: '실험실 — 더 깊게 놀아보기',
    lead: '백테스트 · 시뮬레이션 · AI 코치. 가장 필요한 도구부터 만들어요.',
  },
};

export default async function PortfolioPage({ searchParams }: Props) {
  const tab: PortfolioTab =
    searchParams?.tab === 'auto' ? 'auto' :
    searchParams?.tab === 'copy' ? 'copy' :
    searchParams?.tab === 'lab'  ? 'lab'  :
    'build';

  const WHALE_PORTFOLIOS = tab === 'copy' ? await fetchWhales() : [];
  const hero = TAB_HERO[tab];

  return (
    <AppShell active="portfolio" wide hideSlogan>
      <main className={styles.page}>
        <PageHero
          eyebrow={<Badge tone="primary">MY포트폴리오</Badge>}
          title={hero.title}
          lead={hero.lead}
        />

        <PortfolioTabs active={tab} />

        {tab === 'build' && (
          <div className={styles.buildLayout}>
            <PortfolioDiagnostic />
          </div>
        )}

        {tab === 'auto' && <AutoPortfolio />}

        {tab === 'copy' && (
          <div className={styles.copyGrid}>
            {/* 모델 포트폴리오 */}
            <section className={styles.copyCard}>
              <div className={styles.copyHead}>
                <Badge tone="primary">모델 포트폴리오</Badge>
                <Link href="/portfolio/templates" className={styles.copyMore}>전체 →</Link>
              </div>
              <h3 className={styles.copyTitle}>검증된 자산배분 따라하기</h3>
              <p className={styles.copyLead}>
                버핏 · 달리오 · 보글이 추천한 자산배분 6가지. 따라 만들고 백테스트까지 한 번에.
              </p>
              <ul className={styles.tplList}>
                {PORTFOLIO_TEMPLATES.slice(0, 6).map(t => (
                  <li key={t.slug}>
                    <Link href={`/portfolio/templates/${t.slug}`} className={styles.tplItem}>
                      <div className={styles.tplItemMain}>
                        <strong>{t.name}</strong>
                        <span>{t.tagline}</span>
                      </div>
                      <span className={styles.tplAuthor}>{t.author.split(/[\s(]/)[0]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* 실시간 13F */}
            <section className={`${styles.copyCard} ${styles.copyCardAlt}`}>
              <div className={styles.copyHead}>
                <Badge tone="purple">실시간 13F</Badge>
                <Link href="/portfolio/whales" className={styles.copyMore}>전체 →</Link>
              </div>
              <h3 className={styles.copyTitle}>대가가 지금 갖고 있는 것</h3>
              <p className={styles.copyLead}>
                버핏·버리·애크먼이 SEC에 분기마다 공시하는 실제 보유 종목.
              </p>
              <ul className={styles.tplList}>
                {WHALE_PORTFOLIOS.slice(0, 6).map(w => (
                  <li key={w.slug}>
                    <Link href={`/portfolio/whales/${w.slug}`} className={styles.tplItem}>
                      <div className={styles.tplItemMain}>
                        <strong>{w.manager}</strong>
                        <span>
                          {w.topHoldings[0].ticker} {(w.topHoldings[0].weight * 100).toFixed(0)}% · Top {w.positionCount}개
                        </span>
                      </div>
                      <span className={styles.tplAuthor}>{w.quarter}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === 'lab' && <LabSection />}
      </main>
    </AppShell>
  );
}
