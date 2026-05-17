import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { AdminPayoutsClient } from './AdminPayoutsClient';

export const metadata: Metadata = {
  title: '정산 관리',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminPayoutsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/admin/payouts');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') {
    return (
      <AppShell active="my" hideSlogan>
        <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>관리자만 접근 가능</h1>
        </main>
      </AppShell>
    );
  }

  // 최근 정산 6개월 조회
  const { data: payouts } = await supabase
    .from('creator_payouts')
    .select('*, creators:creator_id(slug, display_name, avatar_url)')
    .order('period_start', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <AppShell active="my" hideSlogan>
      <AdminPayoutsClient initialPayouts={payouts || []} />
    </AppShell>
  );
}
