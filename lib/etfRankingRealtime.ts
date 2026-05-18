import type { EtfInfo } from '@/lib/etfs';
import { isKrEtfCode, normalizeEtfCode } from '@/lib/etfCodes';
import { fetchNaverEtfRealtime } from '@/lib/naverEtfData';

const MAX_NAVER_CANDIDATES = 80;
const NAVER_CONCURRENCY = 10;

type MaybePremiumEtf = EtfInfo & { premium?: number };

function num(value: string | undefined): number {
  if (!value) return 0;
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function signedChange(etf: EtfInfo): number {
  return etf.changeTone === 'down' ? -Math.abs(num(etf.change)) : Math.abs(num(etf.change));
}

function parseVolume(value: string | undefined): number {
  if (!value) return 0;
  const normalized = value.replace(/,/g, '');
  const man = normalized.match(/(\d+(?:\.\d+)?)\s*만주/);
  if (man) return Number(man[1]) * 10_000;
  return num(normalized);
}

function parseAum(value: string | undefined): number {
  if (!value) return 0;
  const normalized = value.replace(/,/g, '');
  let total = 0;
  const trillion = normalized.match(/(\d+(?:\.\d+)?)\s*조/);
  if (trillion) total += Number(trillion[1]) * 1_000_000_000_000;
  const hundredMillion = normalized.match(/(\d+(?:\.\d+)?)\s*억/);
  if (hundredMillion) total += Number(hundredMillion[1]) * 100_000_000;
  return total || num(normalized);
}

function isNaverCandidate(etf: EtfInfo): boolean {
  const source = etf.dataSource || 'database';
  const country = (etf.country || 'KR').toUpperCase();
  return country === 'KR' && source !== 'static' && source !== 'missing' && isKrEtfCode(etf.code);
}

function addUnique<T extends EtfInfo>(target: Map<string, T>, items: T[]) {
  for (const etf of items) {
    if (target.size >= MAX_NAVER_CANDIDATES) break;
    const code = normalizeEtfCode(etf.code);
    if (code && !target.has(code)) target.set(code, etf);
  }
}

function selectRankingCandidates<T extends EtfInfo>(etfs: T[]): T[] {
  const candidates = etfs.filter(isNaverCandidate);
  const selected = new Map<string, T>();

  addUnique(
    selected,
    [...candidates].sort((a, b) => signedChange(b) - signedChange(a)).slice(0, 50),
  );
  addUnique(
    selected,
    [...candidates].sort((a, b) => parseVolume(b.volume) - parseVolume(a.volume)).slice(0, 15),
  );
  addUnique(
    selected,
    [...candidates].sort((a, b) => parseAum(b.aum) - parseAum(a.aum)).slice(0, 15),
  );

  return Array.from(selected.values());
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function enrichEtfRankingCandidatesWithNaver<T extends MaybePremiumEtf>(etfs: T[]): Promise<T[]> {
  const candidates = selectRankingCandidates(etfs);
  if (candidates.length === 0) return etfs;

  const rows = await mapWithConcurrency(candidates, NAVER_CONCURRENCY, async etf => {
    const realtime = await fetchNaverEtfRealtime(etf.code);
    return realtime?.price ? realtime : null;
  });

  const realtimeByCode = new Map(
    rows
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map(row => [normalizeEtfCode(row.code), row]),
  );

  if (realtimeByCode.size === 0) return etfs;

  return etfs.map(etf => {
    const realtime = realtimeByCode.get(normalizeEtfCode(etf.code));
    if (!realtime) return etf;

    return {
      ...etf,
      code: realtime.code || etf.code,
      price: realtime.price || etf.price,
      change: realtime.change || etf.change,
      changeTone: realtime.changeTone || etf.changeTone,
      volume: realtime.volume || etf.volume,
      tradeValue: realtime.tradeValue || etf.tradeValue,
      nav: realtime.nav || etf.nav,
      premium: realtime.premium ?? etf.premium,
      aum: realtime.aum || etf.aum,
      baseDate: realtime.baseDate || etf.baseDate,
      dataSource: 'naver',
      dataNotice: '네이버증권 실시간 시세 기준',
    } as T;
  });
}
