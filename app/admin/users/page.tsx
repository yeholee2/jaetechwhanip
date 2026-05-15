import { createAdminClient } from '@/lib/supabase/admin';
import AdminUsersClient from './AdminUsersClient';

export const dynamic = 'force-dynamic';

async function loadUsers() {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from('users')
    .select('id, email, name, avatar_url, role, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  return data || [];
}

export default async function AdminUsersPage() {
  const items = await loadUsers();
  return <AdminUsersClient initialItems={items as any[]} />;
}
