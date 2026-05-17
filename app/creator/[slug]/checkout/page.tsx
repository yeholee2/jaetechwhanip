import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import type { Creator } from '@/lib/creator';
import { CheckoutClient } from './CheckoutClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '결제',
  robots: { index: false, follow: false },
};

type Props = { params: { slug: string }; searchParams?: { plan?: string } };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth?next=/creator/${params.slug}/checkout?plan=${searchParams?.plan || 'monthly'}`);
  }

  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('slug', decodeURIComponent(params.slug))
    .maybeSingle();
  const creator = data as Creator | null;
  if (!creator) notFound();
  if (!creator.membership_enabled) {
    redirect(`/creator/${params.slug}`);
  }

  const plan = (searchParams?.plan === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly';

  return (
    <AppShell active="my" hideSlogan minimalNav>
      <CheckoutClient creator={creator} userId={user.id} plan={plan} />
    </AppShell>
  );
}
