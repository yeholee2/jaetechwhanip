import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import {
  getOrCreatePortfolio,
  fetchHoldings,
  buildPortfolioSummary,
  findSimilarEtfs,
  fetchPostsForHoldings,
} from '@/lib/portfolio';
import { PortfolioClient } from './PortfolioClient';

export const metadata: Metadata = {
  title: '내 종목 트래커 | 재테크한입',
  description: '보유 종목 트래킹 + ETF 유사도 + 크리에이터 글 자동 추천.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function MyPortfolioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/my/portfolio');

  const portfolio = await getOrCreatePortfolio(user.id);
  if (!portfolio) {
    return (
      <AppShell active="my" hideSlogan>
        <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>포트폴리오 초기화 실패</h1>
        </main>
      </AppShell>
    );
  }

  const holdings = await fetchHoldings(portfolio.id);
  const [summary, similarEtfs, mentionedPosts] = await Promise.all([
    buildPortfolioSummary(portfolio, holdings),
    findSimilarEtfs(holdings, 5),
    fetchPostsForHoldings(holdings, 8),
  ]);

  return (
    <AppShell active="my" hideSlogan>
      <PortfolioClient
        summary={summary}
        similarEtfs={similarEtfs}
        mentionedPosts={mentionedPosts}
      />
    </AppShell>
  );
}
