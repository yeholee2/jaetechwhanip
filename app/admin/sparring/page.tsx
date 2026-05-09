import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listSparrings } from '@/lib/sparring';
import AdminSparringClient from './AdminSparringClient';

export const dynamic = 'force-dynamic';

export default async function AdminSparringPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/');
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') redirect('/');

  const { sparrings } = await listSparrings();

  return <AdminSparringClient initialSparrings={sparrings} />;
}
