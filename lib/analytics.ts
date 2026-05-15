/**
 * 클라이언트 사이드 트래킹.
 *
 * - track(): fire-and-forget insert into analytics_events
 * - 세션 ID는 localStorage 1회 생성
 * - Supabase 미설정 시 no-op
 */
import { createClient, hasSupabase } from '@/lib/supabase/client';

const SESSION_KEY = 'rw_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export type TrackInput = {
  kind: 'page_view' | 'click' | 'impression' | 'search';
  path?: string;
  target?: string;
  meta?: Record<string, any>;
};

export async function track(input: TrackInput): Promise<void> {
  if (!hasSupabase() || typeof window === 'undefined') return;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('analytics_events').insert({
      kind: input.kind,
      path: input.path ?? null,
      target: input.target ?? null,
      meta: input.meta ?? null,
      user_id: user?.id ?? null,
      session_id: getSessionId(),
    });
  } catch {
    // 트래킹 실패는 무시 (UX 방해 없음)
  }
}

/** 동기적으로 호출 가능한 fire-and-forget 버전 */
export function trackEvent(input: TrackInput): void {
  void track(input);
}
