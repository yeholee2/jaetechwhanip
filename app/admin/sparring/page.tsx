import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listSparrings } from '@/lib/sparring';
import AdminSparringClient from './AdminSparringClient';
import styles from './AdminSparring.module.css';

export const dynamic = 'force-dynamic';

const BOOTSTRAP_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || 'imyeho@gmail.com')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean),
);

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    picture?: string;
  };
};

async function seedAdminIfAllowed(user: SupabaseUser) {
  const email = user.email?.toLowerCase();
  if (!email || !BOOTSTRAP_ADMIN_EMAILS.has(email)) return false;

  const admin = createAdminClient();
  if (!admin) return false;

  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    email.split('@')[0];

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  const { error } = await admin
    .from('users')
    .upsert({
      id: user.id,
      email,
      name: displayName,
      avatar_url: avatarUrl,
      role: 'admin',
    }, { onConflict: 'id' });

  if (error) {
    console.error('admin bootstrap failed', error.message);
    return false;
  }

  return true;
}

function AdminGateMessage({ email }: { email?: string }) {
  return (
    <main className={styles.page}>
      <section className={styles.gate}>
        <span>관리자 권한 확인</span>
        <h1>스파링 어드민 권한이 아직 없어요</h1>
        <p>
          현재 로그인 계정{email ? `(${email})` : ''}이 관리자 목록에 없어서 작성 화면을 열 수 없어요.
          예호님 기본 계정으로 다시 들어오면 자동으로 권한을 확인해요.
        </p>
      </section>
    </main>
  );
}

export default async function AdminSparringPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/');
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth?next=/admin/sparring');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin' || await seedAdminIfAllowed(user);

  if (!isAdmin) return <AdminGateMessage email={user.email} />;

  const { sparrings } = await listSparrings();

  return <AdminSparringClient initialSparrings={sparrings} />;
}
