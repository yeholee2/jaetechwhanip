/**
 * 글 템플릿 server-side fetch.
 * 클라이언트는 lib/creatorTemplatesTypes.ts 에서 type/labels 만 import.
 */
import { createClient } from '@/lib/supabase/server';
import type { PostTemplate } from '@/lib/creatorTemplatesTypes';

export type { TemplateKind, PostTemplate } from '@/lib/creatorTemplatesTypes';
export { KIND_LABELS } from '@/lib/creatorTemplatesTypes';

export async function fetchTemplatesForCreator(creatorId: string): Promise<PostTemplate[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('creator_post_templates')
    .select('*')
    .or(`is_system.eq.true,creator_id.eq.${creatorId}`)
    .order('is_system', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  return (data || []) as PostTemplate[];
}

