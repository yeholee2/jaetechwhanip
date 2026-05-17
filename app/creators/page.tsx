import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import type { Creator } from '@/lib/creator';
import { getMockCreators } from '@/lib/creatorMock';
import { CreatorsDirectoryClient } from './CreatorsDirectoryClient';

export const revalidate = 120;

export const metadata: Metadata = {
  title: '재프콘 — 재테크한입',
  description: '신뢰할 수 있는 재테크 크리에이터를 만나보세요. 토픽별 · 인기순 · 신규순.',
  keywords: ['재프콘', '재테크', '크리에이터', 'ETF', SITE_NAME],
  alternates: { canonical: '/creators' },
  openGraph: {
    title: `재프콘 디렉토리 | ${SITE_NAME}`,
    description: '재테크 크리에이터를 토픽별로 발견해 보세요.',
    url: `${SITE_URL}/creators`,
    type: 'website',
  },
};

export default async function CreatorsDirectoryPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('is_published', true)
    .order('follower_count', { ascending: false })
    .limit(60);
  const dbCreators = (data || []) as Creator[];
  // 실제 크리에이터가 8명 미만이면 mock 합쳐서 와꾸 미리보기
  const creators = dbCreators.length >= 8
    ? dbCreators
    : [...dbCreators, ...getMockCreators()].slice(0, 30);

  return (
    <AppShell active="etf" wide hideSlogan>
      <main className="pc-layout-stack">
        <CreatorsDirectoryClient creators={creators} />
      </main>
    </AppShell>
  );
}
