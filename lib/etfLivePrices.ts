/**
 * 클라이언트에서 ETF 실시간 시세를 가져오는 헬퍼.
 *
 * 5분 캐시. static/missing 출처는 시세 계산에 쓰지 않는다.
 */

export type EtfLivePrice = {
  code: string;
  price: string;
  change: string;
  changeTone: 'up' | 'down' | 'flat';
  volume?: string;
  aum?: string;
  nav?: string;
  baseDate?: string;
  dataSource: 'public-api' | 'naver' | 'database' | 'static' | 'missing' | 'us-market';
};

export type EtfLivePricesResponse = {
  items: EtfLivePrice[];
  source: 'live' | 'database' | 'static' | 'missing';
  liveCount: number;
  databaseCount?: number;
  staticCount?: number;
  missingCount?: number;
  totalCount: number;
  fetchedAt: string;
};

let cached: { data: EtfLivePricesResponse; expiresAt: number } | null = null;

export async function fetchEtfLivePrices(): Promise<EtfLivePricesResponse | null> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.data;

  try {
    const res = await fetch('/api/etf/prices', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as EtfLivePricesResponse;
    cached = { data, expiresAt: now + 5 * 60 * 1000 };
    return data;
  } catch {
    return null;
  }
}

/**
 * ETF 코드 → live 시세 map 빌더.
 */
export function buildLivePriceMap(items: EtfLivePrice[]): Record<string, EtfLivePrice> {
  const map: Record<string, EtfLivePrice> = {};
  for (const item of items) {
    if (!item.price || item.dataSource === 'static' || item.dataSource === 'missing') continue;
    map[item.code] = item;
  }
  return map;
}
