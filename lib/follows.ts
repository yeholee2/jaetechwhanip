'use client';

import { createClient, hasSupabase } from '@/lib/supabase/client';

export type FollowTargetType = 'topic' | 'user';

const STORAGE_KEY = 'hanip_follows_v1';

function readLocal(): Array<{ target_type: FollowTargetType; target_id: string; title: string; created_at: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: ReturnType<typeof readLocal>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
}

export function localFollows() {
  return readLocal();
}

export async function isFollowing(targetType: FollowTargetType, targetId: string) {
  if (!hasSupabase()) return readLocal().some(item => item.target_type === targetType && item.target_id === targetId);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  return Boolean(data);
}

export async function currentUserFollows() {
  if (!hasSupabase()) return localFollows();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('follows')
    .select('target_type,target_id,title,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function toggleFollow(targetType: FollowTargetType, targetId: string, title: string) {
  if (!hasSupabase()) {
    const items = readLocal();
    const exists = items.some(item => item.target_type === targetType && item.target_id === targetId);
    const next = exists
      ? items.filter(item => !(item.target_type === targetType && item.target_id === targetId))
      : [{ target_type: targetType, target_id: targetId, title, created_at: new Date().toISOString() }, ...items];
    writeLocal(next);
    return !exists;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return false;
  }

  const active = await isFollowing(targetType, targetId);
  if (active) {
    await supabase
      .from('follows')
      .delete()
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId);
    return false;
  }

  await supabase.from('follows').upsert({
    user_id: user.id,
    target_type: targetType,
    target_id: targetId,
    title,
  }, { onConflict: 'user_id,target_type,target_id' });

  return true;
}
