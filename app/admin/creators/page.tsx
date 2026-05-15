import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { SITE_NAME } from '@/lib/seo';
import { AdminCreatorsClient } from './AdminCreatorsClient';

export const metadata: Metadata = {
  title: '크리에이터 관리',
  description: '핀플루언서 신청 검토 + 승인',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminCreatorsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/admin/creators');

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
          <p style={{ color: '#666', marginTop: 12 }}>현재 로그인 계정은 admin 권한이 없어요.</p>
        </main>
      </AppShell>
    );
  }

  const [{ data: apps }, { data: creators }] = await Promise.all([
    supabase
      .from('creator_applications')
      .select('*')
      .order('applied_at', { ascending: false }),
    supabase
      .from('creators')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <AppShell active="my" hideSlogan>
      <AdminCreatorsClient
        initialApplications={apps || []}
        initialCreators={creators || []}
      />
    </AppShell>
  );
}
