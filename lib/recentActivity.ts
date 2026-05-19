/**
 * 최근 활동(검색어, 본 ETF) localStorage 헬퍼.
 * 검색 popup 비어있을 때 노출 + 사용자 personalization 시작점.
 */

const SEARCH_KEY = 'etfhanip:recent-searches';
const ETF_VIEW_KEY = 'etfhanip:recent-etfs';
const MAX_ITEMS = 8;

function read(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function write(key: string, list: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_ITEMS)));
    if (key === ETF_VIEW_KEY) {
      window.dispatchEvent(new CustomEvent('etfhanip:recent-etfs-changed', { detail: list.slice(0, MAX_ITEMS) }));
    }
  } catch { /* quota */ }
}

export function listRecentSearches(): string[] {
  return read(SEARCH_KEY);
}

export function pushRecentSearch(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return;
  const prev = read(SEARCH_KEY).filter(s => s !== trimmed);
  write(SEARCH_KEY, [trimmed, ...prev]);
}

export function clearRecentSearches() {
  write(SEARCH_KEY, []);
}

export function listRecentEtfSlugs(): string[] {
  return read(ETF_VIEW_KEY);
}

export function pushRecentEtfSlug(slug: string) {
  if (!slug) return;
  const prev = read(ETF_VIEW_KEY).filter(s => s !== slug);
  write(ETF_VIEW_KEY, [slug, ...prev]);
}

export function subscribeRecentEtfChanges(handler: (slugs: string[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onChange = (event: Event) => {
    const slugs = (event as CustomEvent<string[]>).detail ?? read(ETF_VIEW_KEY);
    handler(slugs);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === ETF_VIEW_KEY) handler(read(ETF_VIEW_KEY));
  };
  window.addEventListener('etfhanip:recent-etfs-changed', onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('etfhanip:recent-etfs-changed', onChange);
    window.removeEventListener('storage', onStorage);
  };
}
