import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import type { Creator } from '@/lib/creator';
import { fetchTemplatesForCreator } from '@/lib/creatorTemplates';
import { TemplatesClient } from './TemplatesClient';

export const metadata: Metadata = {
  title: '템플릿 관리',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export default async function TemplatesPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/creator/${params.slug}/templates`);

  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('slug', decodeURIComponent(params.slug))
    .maybeSingle();
  const creator = data as Creator | null;
  if (!creator) notFound();
  if (creator.user_id !== user.id) {
    return (
      <AppShell active="my" hideSlogan>
        <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>접근 권한이 없어요</h1>
        </main>
      </AppShell>
    );
  }

  const templates = await fetchTemplatesForCreator(creator.id);

  return (
    <AppShell active="my" hideSlogan>
      <TemplatesClient creator={creator} initialTemplates={templates} />
    </AppShell>
  );
}
