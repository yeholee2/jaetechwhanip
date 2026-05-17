import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { fetchStockProfile, fetchTopEtfsHolding } from '@/lib/stockDetail';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { StockDetailView } from '@/components/stock/StockDetailView';
import styles from './StockPage.module.css';

export const revalidate = 3600;

type Props = { params: { symbol: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sym = decodeURIComponent(params.symbol || '').toUpperCase();
  const profile = await fetchStockProfile(sym).catch(() => null);
  const name = profile?.name || sym;
  return {
    title: `${name} (${sym}) | ${SITE_NAME}`,
    description: profile?.longBusinessSummary?.slice(0, 160)
      || `${name} 의 가격 차트, 핵심 지표, 그리고 이 종목을 가장 많이 담은 ETF Top 10.`,
    alternates: { canonical: `/stock/${sym}` },
    openGraph: {
      title: `${name} (${sym})`,
      description: `${name} 종목 상세 — 차트 + 역방향 ETF 노출도`,
      url: `${SITE_URL}/stock/${sym}`,
      type: 'website',
    },
  };
}

export default async function StockPage({ params }: Props) {
  const sym = decodeURIComponent(params.symbol || '').toUpperCase();
  if (!sym) notFound();

  const [profile, topEtfs] = await Promise.all([
    fetchStockProfile(sym).catch(() => null),
    fetchTopEtfsHolding(sym, 10).catch(() => []),
  ]);

  if (!profile && topEtfs.length === 0) {
    return (
      <AppShell active="my" hideSlogan>
        <main className={styles.empty}>
          <h1>종목을 찾지 못했어요</h1>
          <p>심볼 <code>{sym}</code> 에 해당하는 데이터가 없어요. 미국 종목은 티커, 한국 종목은 6자리 코드로 시도해보세요.</p>
          <Link href="/etf">ETF 둘러보기 →</Link>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell active="my" hideSlogan>
      <main className={styles.wrap}>
        <nav className={styles.crumb}>
          <Link href="/etf">ETF</Link>
          <span>·</span>
          <span>{sym}</span>
        </nav>
        <div className={styles.panel}>
          <StockDetailView
            symbol={sym}
            displayName={profile?.name}
            initialProfile={profile}
            initialTopEtfs={topEtfs}
          />
        </div>
      </main>
    </AppShell>
  );
}
