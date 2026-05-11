/**
 * ETF 관심 등록 — localStorage 기반 (Phase F에서 Supabase 동기화).
 *
 * Storage key: 'etfhanip:watch' → JSON.stringify(string[]) (ETF 코드 배열)
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
    return false;
  }
  write([...current, code]);
  return true;
}

export function addEtfWatch(code: string): void {
  const current = read();
  if (current.includes(code)) return;
  write([...current, code]);
}

export function removeEtfWatch(code: string): void {
  const current = read();
  if (!current.includes(code)) return;
  write(current.filter(c => c !== code));
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
