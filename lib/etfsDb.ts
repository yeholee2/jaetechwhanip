/**
 * Supabase public.etfs 에서 ETF 목록 조회.
 * DB 비어있거나 키 미설정 시 시드(lib/etfs.ts) fallback.
 *
 * 사용 예 (server component):
 *   const etfs = await fetchEtfs();  // DB 있으면 DB, 없으면 시드
 */

import { etfs as seedEtfs, type EtfInfo } from '@/lib/etfs';

type RawRow = {
  slug: string;
  code: string;
  name: string;
  short_name: string;
  issuer: string;
  category: string | null;
  theme: string | null;
  summary: string | null;
  one_line: string | null;
  price: string | null;
  change: string | null;
  change_tone: 'up' | 'down' | 'flat' | null;
  aum: string | null;
  fee: string | null;
  distribution: string | null;
  hedge: string | null;
  listed_at: string | null;
  base_date: string | null;
  volume: string | null;
  nav: string | null;
  tags: string[] | null;
  holdings: any;
  related_questions: any;
  sparring_title: string | null;
  data_source: string;
  market: string | null;
  country: string | null;
  currency: string | null;
  underlying_country: string | null;
};

function rowToInfo(row: RawRow): EtfInfo {
  return {
    slug: row.slug,
    code: row.code,
    name: row.name,
    shortName: row.short_name,
    issuer: row.issuer,
    category: row.category || '',
    theme: row.theme || '',
    summary: row.summary || '',
    oneLine: row.one_line || '',
    price: row.price || '',
    change: row.change || '',
    changeTone: row.change_tone || 'flat',
    aum: row.aum || '',
    fee: row.fee || '',
    distribution: row.distribution || '',
    hedge: row.hedge || '',
    listedAt: row.listed_at || '',
    volume: row.volume || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    fit: '',
    holdings: Array.isArray(row.holdings) ? row.holdings : [],
    relatedQuestions: Array.isArray(row.related_questions) ? row.related_questions : [],
    sparringTitle: row.sparring_title || '',
    market: row.market || 'KRX',
    country: row.country || 'KR',
    currency: row.currency || 'KRW',
    underlyingCountry: row.underlying_country || 'KR',
  };
}

let memoryCache: { data: EtfInfo[]; expiresAt: number } | null = null;

export async function fetchEtfs(limit = 1000): Promise<EtfInfo[]> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) return memoryCache.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return seedEtfs;

  try {
    const res = await fetch(
      `${url}/rest/v1/etfs?select=*&order=updated_at.desc&limit=${limit}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 600 },
      },
    );
    if (!res.ok) return seedEtfs;
    const data: RawRow[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return seedEtfs;
    const list = data.map(rowToInfo);
    memoryCache = { data: list, expiresAt: now + 10 * 60 * 1000 };
    return list;
  } catch {
    return seedEtfs;
  }
}

export async function fetchEtfBySlug(slug: string): Promise<EtfInfo | undefined> {
  const all = await fetchEtfs();
  return all.find(e => e.slug === decodeURIComponent(slug));
}

export async function fetchEtfByCode(code: string): Promise<EtfInfo | undefined> {
  const all = await fetchEtfs();
  return all.find(e => e.code === code);
}
