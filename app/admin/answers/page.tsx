import { createAdminClient } from '@/lib/supabase/admin';
import AdminAnswersClient from './AdminAnswersClient';

export const dynamic = 'force-dynamic';

async function loadAnswers() {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from('answers')
    .select('id, body, is_adopted, like_count, created_at, question_id, author_id, users:author_id(name), questions:question_id(title,slug)')
    .order('created_at', { ascending: false })
    .limit(200);
  return data || [];
}

export default async function AdminAnswersPage() {
  const items = await loadAnswers();
  return <AdminAnswersClient initialItems={items as any[]} />;
}
