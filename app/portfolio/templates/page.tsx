/**
 * /portfolio/templates — 대가들의 포트폴리오 카탈로그.
 *
 * 비로그인 사용자도 둘러볼 수 있는 공개 페이지.
 * 가입 안 해도 흥미를 가지도록 — 각 포트폴리오의 구성·전략·강점을 한 눈에.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHero, Badge, Card } from '@/components/ui';
import { PORTFOLIO_TEMPLATES } from '@/lib/portfolioTemplates';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import styles from './Templates.module.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '대가들의 포트폴리오 — 따라하기 + 백테스트',
  description: '워런 버핏 · 레이 달리오 · 보글 · 예일 모델 — 검증된 자산배분 6가지를 ETF 비중으로 재구현. 1년 백테스트와 따라하기 한 번에.',
  keywords: ['포트폴리오 따라하기', '레이 달리오 올웨더', '버핏 90/10', '보글헤드 3펀드', '예일 모델', 'ETF 자산배분', '백테스트', SITE_NAME],
  alternates: { canonical: '/portfolio/templates' },
  openGraph: {
    title: `대가들의 포트폴리오 | ${SITE_NAME}`,
    description: 'ETF로 따라하는 검증된 자산배분 6가지 + 백테스트.',
    url: `${SITE_URL}/portfolio/templates`,
    type: 'website',
  },
};

const RISK_LABEL: Record<number, { label: string; tone: 'success' | 'neutral' | 'fresh' }> = {
  1: { label: '낮음',       tone: 'success' },
  2: { label: '다소 낮음', tone: 'success' },
  3: { label: '보통',       tone: 'neutral' },
  4: { label: '다소 높음', tone: 'fresh' },
  5: { label: '높음',       tone: 'fresh' },
};

export default function TemplatesPage() {
  return (
    <AppShell active="portfolio" hideSlogan>
      <main style={{ padding: 'var(--space-4) 0 var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <PageHero
          eyebrow={<Badge tone="primary">대가들의 포트폴리오</Badge>}
          title="이 사람들은 어떻게 굴렸을까?"
          lead="버핏 · 달리오 · 보글 · 예일까지 — 검증된 자산배분 6가지를 ETF로 재구현했어요. 가입 없이 둘러보고, 마음에 들면 내 포트폴리오로 한 번에 가져오기."
        />

        <div className={styles.intro}>
          <Card pad="md">
            <strong>왜 따라하나?</strong>
            <p>
              자산배분은 수익률의 90%를 결정합니다 (Brinson 1986 연구).
              대가들이 검증한 비율을 시작점으로 두면, 본인의 위험 성향에 맞춰 미세조정만 하면 돼요.
            </p>
          </Card>
        </div>

        <div className={styles.grid}>
          {PORTFOLIO_TEMPLATES.map(t => {
            const riskMeta = RISK_LABEL[t.risk];
            return (
              <Link key={t.slug} href={`/portfolio/templates/${t.slug}`} className={styles.card}>
                <div className={styles.cardHead}>
                  <Badge tone={riskMeta.tone}>위험 {riskMeta.label}</Badge>
                  <span className={styles.author}>{t.author}</span>
                </div>
                <h3 className={styles.cardTitle}>{t.name}</h3>
                <p className={styles.cardTagline}>{t.tagline}</p>
                <p className={styles.cardDesc}>{t.description}</p>

                <div className={styles.allocPreview}>
                  {t.allocations.map(a => (
                    <div key={a.ticker} className={styles.allocBar}>
                      <span className={styles.allocLabel}>{a.label}</span>
                      <span className={styles.allocBarBg}>
                        <span
                          className={styles.allocBarFill}
                          style={{ width: `${(a.weight * 100).toFixed(1)}%` }}
                        />
                      </span>
                      <span className={styles.allocPct}>{(a.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>

                <div className={styles.cardFoot}>
                  <span className={styles.cardCta}>1년 백테스트 보기 →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}
