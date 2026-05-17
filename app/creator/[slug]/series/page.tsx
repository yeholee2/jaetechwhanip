import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import type { Creator, CreatorSeries } from '@/lib/creator';
import { SeriesManagerClient } from './SeriesManagerClient';

export const metadata: Metadata = {
  title: '시리즈 관리',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export default async function CreatorSeriesPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/creator/${params.slug}/series`);

  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('slug', decodeURIComponent(params.slug))
    .maybeSingle();
  const creator = data as Creator | null;
  if (!creator) notFound();

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
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>관리 권한이 없어요</h1>
          </main>
        </AppShell>
      );
    }
  }

  const { data: seriesRows } = await supabase
    .from('creator_series')
    .select('id, creator_id, title, slug, description, cover_url, is_published, created_at, updated_at')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false });
  const initialSeries = (seriesRows || []) as CreatorSeries[];

  return (
    <AppShell active="my" hideSlogan>
      <SeriesManagerClient creator={creator} initialSeries={initialSeries} />
    </AppShell>
  );
}
