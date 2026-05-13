import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHero, Badge } from '@/components/ui';
import { PortfolioDiagnostic } from '../etf/PortfolioDiagnostic';
import { PORTFOLIO_TEMPLATES } from '@/lib/portfolioTemplates';
import { fetchWhales } from '@/lib/portfolioWhalesDb';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
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

export default async function PortfolioPage() {
  const WHALE_PORTFOLIOS = await fetchWhales();
  return (
    <AppShell active="portfolio" wide hideSlogan>
      <main className={styles.page}>
        <PageHero
          eyebrow={<Badge tone="primary">MY포트폴리오</Badge>}
          title="내 ETF, 한 번에 진단"
          lead="섹터 중복도 · 환노출 · 보수 가중평균 · 위험 등급. 대가들의 자산배분으로 시작해도 좋아요."
        />

        <div className={styles.layout}>
          {/* 메인: 진단 */}
          <div className={styles.main}>
            <PortfolioDiagnostic />
          </div>

          {/* 사이드: 대가 포트폴리오 모델 + 실시간 13F */}
          <aside className={styles.side}>
            {/* 모델 포트폴리오 */}
            <div className={styles.sideCard}>
              <div className={styles.sideHead}>
                <Badge tone="primary">모델 포트폴리오</Badge>
                <Link href="/portfolio/templates" className={styles.sideMore}>전체 →</Link>
              </div>
              <h3 className={styles.sideTitle}>어디서 시작할지 모르겠다면</h3>
              <p className={styles.sideLead}>
                버핏 · 달리오 · 보글 — 검증된 자산배분 6가지. 따라하고 백테스트까지.
              </p>
              <ul className={styles.tplList}>
                {PORTFOLIO_TEMPLATES.slice(0, 4).map(t => (
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
            </div>

            {/* 실시간 13F */}
            <div className={styles.sideCard} style={{ background: 'linear-gradient(135deg, rgba(126, 87, 194, 0.08), var(--rw-card))' }}>
              <div className={styles.sideHead}>
                <Badge tone="purple">실시간 13F</Badge>
                <Link href="/portfolio/whales" className={styles.sideMore}>전체 →</Link>
              </div>
              <h3 className={styles.sideTitle}>대가가 지금 갖고 있는 것</h3>
              <p className={styles.sideLead}>
                버핏·버리·애크먼이 SEC에 분기마다 공시하는 실제 보유 종목.
              </p>
              <ul className={styles.tplList}>
                {WHALE_PORTFOLIOS.slice(0, 4).map(w => (
                  <li key={w.slug}>
                    <Link href={`/portfolio/whales/${w.slug}`} className={styles.tplItem}>
                      <div className={styles.tplItemMain}>
                        <strong>{w.manager}</strong>
                        <span>{w.topHoldings[0].ticker} {(w.topHoldings[0].weight * 100).toFixed(0)}% · Top {w.positionCount}개</span>
                      </div>
                      <span className={styles.tplAuthor}>{w.quarter}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
