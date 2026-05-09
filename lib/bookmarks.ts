'use client';

import { createClient, hasSupabase } from '@/lib/supabase/client';

export type BookmarkTargetType = 'question' | 'sparring' | 'column';

export type BookmarkItem = {
  target_type: BookmarkTargetType;
  target_id: string;
  title: string;
  href: string;
  category?: string | null;
  created_at: string;
};

const STORAGE_KEY = 'hanip_bookmarks_v1';

function readLocal(): BookmarkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: BookmarkItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
  window.dispatchEvent(new CustomEvent('hanip:bookmarks'));
}

export function localBookmarks() {
  return readLocal();
}

export function isLocalBookmarked(type: BookmarkTargetType, id: string) {
  return readLocal().some(item => item.target_type === type && item.target_id === id);
}

export function toggleLocalBookmark(item: Omit<BookmarkItem, 'created_at'>) {
  const current = readLocal();
  const exists = current.some(entry => entry.target_type === item.target_type && entry.target_id === item.target_id);
  const next = exists
    ? current.filter(entry => !(entry.target_type === item.target_type && entry.target_id === item.target_id))
    : [{ ...item, created_at: new Date().toISOString() }, ...current];
  writeLocal(next);
  return !exists;
}

export async function currentUserBookmarks(): Promise<BookmarkItem[]> {
  if (!hasSupabase()) return localBookmarks();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('bookmarks')
    .select('target_type,target_id,title,href,category,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as BookmarkItem[];
}

export async function isBookmarked(type: BookmarkTargetType, id: string) {
  if (!hasSupabase()) return isLocalBookmarked(type, id);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', type)
    .eq('target_id', id)
    .maybeSingle();

  return Boolean(data);
}

export async function toggleBookmark(item: Omit<BookmarkItem, 'created_at'>) {
  if (!hasSupabase()) return toggleLocalBookmark(item);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const next = `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = next;
    return false;
  }

  const active = await isBookmarked(item.target_type, item.target_id);
  if (active) {
    await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('target_type', item.target_type)
      .eq('target_id', item.target_id);
    return false;
  }

  await supabase.from('bookmarks').upsert({
    user_id: user.id,
    target_type: item.target_type,
    target_id: item.target_id,
    title: item.title,
    href: item.href,
    category: item.category || null,
  }, { onConflict: 'user_id,target_type,target_id' });

  return true;
}
