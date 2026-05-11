import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { etfs, getEtfByCode, ETF_HOME_URL } from '@/lib/etfs';
import { SITE_NAME } from '@/lib/seo';
import { PageHero } from '@/components/ui';
import { EtfCompareClient } from './EtfCompareClient';
import styles from './EtfCompare.module.css';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'ETF 비교',
  description: '두 ETF의 현재가·순자산·총보수·분배금·환헤지를 한눈에 비교해보세요.',
  keywords: ['ETF 비교', 'ETF 가격 비교', 'ETF 수수료 비교', SITE_NAME],
  alternates: { canonical: '/etf/compare' },
  openGraph: {
    title: `ETF 비교 | ${SITE_NAME}`,
    description: '두 ETF를 한 화면에서 비교',
    url: `${ETF_HOME_URL}/compare`,
    type: 'website',
  },
};

export default async function EtfComparePage({
  searchParams,
}: {
  searchParams?: { a?: string; b?: string };
}) {
  const a = searchParams?.a ? getEtfByCode(searchParams.a) : undefined;
  const b = searchParams?.b ? getEtfByCode(searchParams.b) : undefined;

  return (
    <AppShell active="etf" hideSlogan>
      <main className={styles.page}>
        <PageHero
          eyebrow="ETF 비교"
          title="두 ETF를 한눈에 비교해요"
          lead="현재가·순자산·총보수·분배금·환헤지를 나란히 놓고 보세요."
        />
        <EtfCompareClient initialA={a} initialB={b} candidates={etfs} />
      </main>
    </AppShell>
  );
}
