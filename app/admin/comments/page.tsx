import { createAdminClient } from '@/lib/supabase/admin';
import AdminCommentsClient from './AdminCommentsClient';

export const dynamic = 'force-dynamic';

async function loadComments() {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from('comments')
    .select('id, body, created_at, answer_id, author_id, users:author_id(name), answers:answer_id(body, question_id, questions:question_id(title, slug))')
    .order('created_at', { ascending: false })
    .limit(200);
  return data || [];
}

export default async function AdminCommentsPage() {
  const items = await loadComments();
  return <AdminCommentsClient initialItems={items as any[]} />;
}
