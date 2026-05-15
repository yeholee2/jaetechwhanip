/**
 * 관리자 권한 헬퍼 — DB users.role='admin' 기반.
 * 부트스트랩: ADMIN_EMAILS 환경변수에 있는 이메일은 첫 로그인 시 자동 승격.
 */
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BOOTSTRAP_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || 'imyeho@gmail.com,leeho@weolbu.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isBootstrapAdmin(email?: string | null): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.has(email.toLowerCase());
}

async function seedAdminIfAllowed(user: { id: string; email?: string; user_metadata?: any }): Promise<boolean> {
  const email = user.email?.toLowerCase();
  if (!email || !BOOTSTRAP_ADMIN_EMAILS.has(email)) return false;

  const admin = createAdminClient();
  if (!admin) return false;

  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    email.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  const { error } = await admin
    .from('users')
    .upsert(
      { id: user.id, email, name: displayName, avatar_url: avatarUrl, role: 'admin' },
      { onConflict: 'id' },
    );
  if (error) {
    console.error('admin bootstrap failed', error.message);
    return false;
  }
  return true;
}

/** 서버 컴포넌트에서 호출. 현재 사용자 + admin 여부 반환. */
export async function getAdminContext(): Promise<{
  user: { id: string; email?: string } | null;
  isAdmin: boolean;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { user: null, isAdmin: false };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  let isAdmin = profile?.role === 'admin';
  if (!isAdmin) isAdmin = await seedAdminIfAllowed(user as any);

  return { user: { id: user.id, email: user.email }, isAdmin };
}
