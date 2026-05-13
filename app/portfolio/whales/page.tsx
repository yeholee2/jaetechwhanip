/**
 * /portfolio/whales — 대가들의 실시간 보유 (13F-HR).
 *
 * 모델 포트폴리오와 별도 카테고리.
 * 분기 lag 명시 + 변동률 표시로 신뢰성 확보.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHero, Badge, Card } from '@/components/ui';
import { WHALE_PORTFOLIOS } from '@/lib/portfolioWhales';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import styles from './Whales.module.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '대가들의 실시간 보유 — 13F 공시',
  description: '워런 버핏 · 빌 애크먼 · 마이클 버리 · 드러켄밀러 — 미국 헷지펀드 매니저들이 분기마다 SEC에 공시하는 실제 보유 종목.',
  keywords: ['13F', 'SEC 공시', '버핏 보유', '버리 13F', '애크먼 포트폴리오', '대가 실시간 보유', SITE_NAME],
  alternates: { canonical: '/portfolio/whales' },
  openGraph: {
    title: `대가들의 실시간 보유 | ${SITE_NAME}`,
    description: '6명의 헷지펀드 매니저가 분기마다 공시하는 실제 보유 종목.',
    url: `${SITE_URL}/portfolio/whales`,
    type: 'website',
  },
};

function formatBillion(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
}

export default function WhalesPage() {
  return (
    <AppShell active="portfolio" hideSlogan>
      <main className={styles.page}>
        <PageHero
          eyebrow={<Badge tone="primary">실시간 보유 · 13F</Badge>}
          title="대가들이 지금 갖고 있는 것"
          lead="미국 SEC에 분기마다 공시되는 실제 보유 종목. 모델 추천(권장 비중)과 다르게 실제로 자기 돈으로 산 종목들이에요."
        />

        <Card pad="md" muted>
          <strong style={{ fontSize: 13, fontWeight: 900, color: 'var(--rw-text-strong)' }}>
            ⚠️ 13F 공시의 한계
          </strong>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--rw-text-body)', lineHeight: 1.6, fontWeight: 600 }}>
            · <strong>45일 lag</strong>: 분기 마감 후 45일 안에 공시 → 항상 1.5~3개월 과거 데이터<br />
            · <strong>롱 포지션만</strong>: 숏·옵션·해외 종목 일부 제외<br />
            · <strong>매수·매도 시점 모름</strong>: 분기 중 거래 상세는 비공개<br />
            → "지금 어떻게 굴리는지 큰 흐름"을 보는 용도. 따라 사기 위한 신호 아님.
          </p>
        </Card>

        <div className={styles.grid}>
          {WHALE_PORTFOLIOS.map(w => (
            <Link key={w.slug} href={`/portfolio/whales/${w.slug}`} className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <h3 className={styles.cardName}>{w.name}</h3>
                  <p className={styles.cardManager}>{w.manager}</p>
                </div>
                <Badge tone="neutral">{w.quarter}</Badge>
              </div>
              <p className={styles.cardTagline}>{w.tagline}</p>

              <div className={styles.cardStats}>
                <div>
                  <span>총 자산</span>
                  <strong>{formatBillion(w.totalValueMln)}</strong>
                </div>
                <div>
                  <span>보유 종목</span>
                  <strong>{w.positionCount}개</strong>
                </div>
                <div>
                  <span>Top 비중</span>
                  <strong>{(w.topHoldings[0].weight * 100).toFixed(0)}%</strong>
                </div>
              </div>

              <div className={styles.topHoldings}>
                {w.topHoldings.slice(0, 5).map(h => (
                  <span key={h.ticker} className={styles.holdingChip}>
                    <strong>{h.ticker}</strong>
                    <em>{(h.weight * 100).toFixed(0)}%</em>
                  </span>
                ))}
                {w.topHoldings.length > 5 && (
                  <span className={styles.holdingMore}>+{w.topHoldings.length - 5}</span>
                )}
              </div>

              <span className={styles.cardCta}>실제 보유 종목 보기 →</span>
            </Link>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
