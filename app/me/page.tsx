import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { MeClient, type MyProfile } from './MeClient';

export const metadata: Metadata = {
  title: '내 프로필',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function MePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/me');

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, provider, role')
    .eq('id', user.id)
    .maybeSingle();

  const safeProfile: MyProfile = profile
    ? (profile as MyProfile)
    : { id: user.id, email: user.email || '', name: null, avatar_url: null, provider: null, role: 'user' };

  return (
    <AppShell active="my" hideSlogan>
      <MeClient profile={safeProfile} />
    </AppShell>
  );
}
