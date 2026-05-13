/**
 * /portfolio/compare/[slug] — 내 포트폴리오 vs 선택한 대가 템플릿 비교.
 *
 * 비로그인 / 보유 0개 → 안내 화면.
 * 보유 있으면 → 인사이트 두 컬럼 side-by-side + 차이 요약.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui';
import { getTemplateBySlug, PORTFOLIO_TEMPLATES } from '@/lib/portfolioTemplates';
import { fetchEtfs } from '@/lib/etfsDb';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { CompareClient } from './CompareClient';
import styles from './Compare.module.css';

export const revalidate = 600;

export function generateStaticParams() {
  return PORTFOLIO_TEMPLATES.map(t => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = getTemplateBySlug(params.slug);
  if (!t) return { title: '포트폴리오를 찾을 수 없어요' };
  return {
    title: `내 포트폴리오 vs ${t.name}`,
    description: `${t.name} 자산배분과 내 포트폴리오를 비교해드려요. 위험·환노출·섹터 집중도·보수 차이를 한눈에.`,
    alternates: { canonical: `/portfolio/compare/${t.slug}` },
    openGraph: {
      title: `내 vs ${t.name} | ${SITE_NAME}`,
      description: `${t.tagline} — 내 포트폴리오와 비교`,
      url: `${SITE_URL}/portfolio/compare/${t.slug}`,
      type: 'website',
    },
  };
}

export default async function ComparePage({ params }: { params: { slug: string } }) {
  const template = getTemplateBySlug(params.slug);
  if (!template) notFound();

  const pool = await fetchEtfs(2000);

  return (
    <AppShell active="portfolio" hideSlogan>
      <main className={styles.page}>
        <div className={styles.topBar}>
          <Link href={`/portfolio/templates/${template.slug}`} className={styles.back}>
            ← {template.name}
          </Link>
        </div>

        <section className={styles.hero}>
          <Badge tone="primary">비교</Badge>
          <h1>내 포트폴리오 vs {template.name}</h1>
          <p className={styles.lead}>
            내 보유 자산이 {template.author}의 자산배분과 어떻게 다른지 한 번에 봐요.
          </p>
        </section>

        <CompareClient template={template} pool={pool} />
      </main>
    </AppShell>
  );
}
