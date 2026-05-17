import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import type { Creator, CreatorPost } from '@/lib/creator';
import { fetchCreatorStats } from '@/lib/creatorStats';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '대시보드',
  robots: { index: false, follow: false },
};

type Props = { params: { slug: string } };

export default async function DashboardPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/creator/${params.slug}/dashboard`);

  const { data: creatorRow } = await supabase
    .from('creators')
    .select('*')
    .eq('slug', decodeURIComponent(params.slug))
    .maybeSingle();
  const creator = creatorRow as Creator | null;
  if (!creator) notFound();

  // 본인 또는 admin 만 접근
  if (creator.user_id !== user.id) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') {
      return (
        <AppShell active="my" hideSlogan>
          <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>본인 대시보드만 접근 가능</h1>
            <p style={{ color: '#666', marginTop: 12 }}>본인의 채널 대시보드만 볼 수 있어요.</p>
          </main>
        </AppShell>
      );
    }
  }

  // 통계 + 글 목록 + 최근 멤버 일자 분포
  const stats = await fetchCreatorStats(creator.id);

  const { data: posts } = await supabase
    .from('creator_posts')
    .select('id, title, slug, published_at, is_member_only, view_count, like_count, comment_count')
    .eq('creator_id', creator.id)
    .order('published_at', { ascending: false })
    .limit(50);

  const { data: members } = await supabase
    .from('creator_subscriptions')
    .select('id, created_at, status, plan, price_won, is_beta_free')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // 최근 30일 일자별 멤버 추가
  const memberDaily = buildDailyCount((members || []).map(m => m.created_at), 30);

  return (
    <AppShell active="my" hideSlogan minimalNav>
      <DashboardClient
        creator={creator}
        stats={stats}
        posts={(posts || []) as CreatorPost[]}
        members={(members || []) as any[]}
        memberDaily={memberDaily}
      />
    </AppShell>
  );
}

function buildDailyCount(dates: string[], days: number): { date: string; count: number }[] {
  const now = new Date();
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }
  for (const ds of dates) {
    const key = (ds || '').slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}
