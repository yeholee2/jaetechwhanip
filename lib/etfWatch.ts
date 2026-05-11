/**
 * ETF 관심 등록.
 * - 비로그인: localStorage 'etfhanip:watch' (string[])
 * - 로그인: Supabase public.etf_watches + localStorage 캐시
 *
 * 페이지 로드 시 자동으로 Supabase의 최신 데이터를 localStorage에 머지하고,
 * 변경(toggle/add/remove) 시 Supabase에 비동기로 upsert/delete.
 *
 * 변경 이벤트: window 'etfhanip:watch-changed' (CustomEvent<string[]>)
 */

const STORAGE_KEY = 'etfhanip:watch';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

function write(codes: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
    window.dispatchEvent(new CustomEvent('etfhanip:watch-changed', { detail: codes }));
  } catch {
    /* ignore quota errors */
  }
}

async function getSupabaseClient() {
  if (typeof window === 'undefined') return null;
  const { createClient, hasSupabase } = await import('@/lib/supabase/client');
  if (!hasSupabase()) return null;
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;
  return { supabase, userId: data.session.user.id };
}

export function listWatchedEtfCodes(): string[] {
  return read();
}

export function isEtfWatched(code: string): boolean {
  return read().includes(code);
}

export function toggleEtfWatch(code: string): boolean {
  const current = read();
  if (current.includes(code)) {
    write(current.filter(c => c !== code));
    void supabaseRemove(code);
    return false;
  }
  write([...current, code]);
  void supabaseAdd(code);
  return true;
}

export function addEtfWatch(code: string): void {
  const current = read();
  if (current.includes(code)) return;
  write([...current, code]);
  void supabaseAdd(code);
}

export function removeEtfWatch(code: string): void {
  const current = read();
  if (!current.includes(code)) return;
  write(current.filter(c => c !== code));
  void supabaseRemove(code);
}

/**
 * 로그인 시 호출: Supabase의 최신 watch 리스트를 가져와 localStorage에 머지.
 * 비로그인이면 no-op.
 */
export async function syncEtfWatchFromServer(): Promise<void> {
  const ctx = await getSupabaseClient();
  if (!ctx) return;

  const { data, error } = await ctx.supabase
    .from('etf_watches')
    .select('etf_code')
    .eq('user_id', ctx.userId);

  if (error || !data) return;

  const serverCodes = data.map(row => row.etf_code).filter((x): x is string => typeof x === 'string');
  const localCodes = read();
  // 머지: 양쪽 합집합 (충돌 시 양쪽 다 유지)
  const merged = Array.from(new Set([...serverCodes, ...localCodes]));
  write(merged);

  // localStorage에만 있고 서버엔 없는 코드는 서버에도 추가 (옵션, 의도일 수 있음)
  const onlyLocal = localCodes.filter(c => !serverCodes.includes(c));
  if (onlyLocal.length > 0) {
    await ctx.supabase
      .from('etf_watches')
      .upsert(
        onlyLocal.map(code => ({ user_id: ctx.userId, etf_code: code })),
        { onConflict: 'user_id,etf_code' },
      );
  }
}

async function supabaseAdd(code: string) {
  const ctx = await getSupabaseClient();
  if (!ctx) return;
  await ctx.supabase
    .from('etf_watches')
    .upsert({ user_id: ctx.userId, etf_code: code }, { onConflict: 'user_id,etf_code' });
}

async function supabaseRemove(code: string) {
  const ctx = await getSupabaseClient();
  if (!ctx) return;
  await ctx.supabase
    .from('etf_watches')
    .delete()
    .eq('user_id', ctx.userId)
    .eq('etf_code', code);
}

/**
 * 다른 탭/컴포넌트에서 변경 시 자동 갱신용 이벤트 구독 헬퍼.
 */
export function subscribeWatchChanges(handler: (codes: string[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onChange = (event: Event) => {
    const codes = (event as CustomEvent<string[]>).detail ?? read();
    handler(codes);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler(read());
  };
  window.addEventListener('etfhanip:watch-changed', onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('etfhanip:watch-changed', onChange);
    window.removeEventListener('storage', onStorage);
  };
}
