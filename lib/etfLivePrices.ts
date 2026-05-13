/**
 * 클라이언트에서 ETF 실시간 시세를 가져오는 헬퍼.
 *
 * 5분 캐시. fallback이면 호출자가 etf.price 등 시드 값을 그대로 쓰면 됨.
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
  dataSource: 'public-api' | 'fallback';
};

export type EtfLivePricesResponse = {
  items: EtfLivePrice[];
  source: 'live' | 'fallback';
  liveCount: number;
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
    map[item.code] = item;
  }
  return map;
}
