import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import type { Creator } from '@/lib/creator';
import { SubscribeClient } from './SubscribeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '멤버십 구독',
  robots: { index: false, follow: false },
};

type Props = { params: { slug: string } };

export default async function SubscribePage({ params }: Props) {
  const supabase = createClient();
  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('slug', decodeURIComponent(params.slug))
    .eq('is_published', true)
    .maybeSingle();
  const creator = data as Creator | null;
  if (!creator) notFound();
  if (!creator.membership_enabled) {
    redirect(`/creator/${params.slug}`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  // 이미 구독 중이면 채널로 돌려보냄
  if (user) {
    const { data: existing } = await supabase
      .from('creator_subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('creator_id', creator.id)
      .eq('status', 'active')
      .maybeSingle();
    if (existing) {
      redirect(`/creator/${params.slug}/welcome`);
    }
  }

  return (
    <AppShell active="my" hideSlogan minimalNav>
      <SubscribeClient creator={creator} userId={user?.id || null} />
    </AppShell>
  );
}
