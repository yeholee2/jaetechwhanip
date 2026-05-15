import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import type { Creator } from '@/lib/creator';
import { CreatorEditClient } from './CreatorEditClient';

export const metadata: Metadata = {
  title: '크리에이터 페이지 편집',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export default async function CreatorEditPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/creator/${params.slug}/edit`);

  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('slug', decodeURIComponent(params.slug))
    .maybeSingle();
  const creator = data as Creator | null;
  if (!creator) notFound();

  // 본인 또는 admin만 편집 가능
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
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>편집 권한이 없어요</h1>
            <p style={{ color: '#666', marginTop: 12 }}>본인의 크리에이터 페이지만 수정할 수 있어요.</p>
          </main>
        </AppShell>
      );
    }
  }

  return (
    <AppShell active="my" hideSlogan>
      <CreatorEditClient creator={creator} />
    </AppShell>
  );
}
