import { createAdminClient } from '@/lib/supabase/admin';
import AdminQuestionsClient from './AdminQuestionsClient';

export const dynamic = 'force-dynamic';

async function loadQuestions() {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from('questions')
    .select('id, title, slug, category, answer_count, like_count, view_count, is_answered, created_at, author_id, users:author_id(name,email)')
    .order('created_at', { ascending: false })
    .limit(200);
  return data || [];
}

export default async function AdminQuestionsPage() {
  const items = await loadQuestions();
  return <AdminQuestionsClient initialItems={items as any[]} />;
}
