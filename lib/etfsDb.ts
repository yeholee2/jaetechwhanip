/**
 * Supabase public.etfs 에서 ETF 목록 조회.
 * DB 비어있거나 키 미설정 시 시드(lib/etfs.ts)의 메타데이터만 fallback.
 * 시드 가격/거래량/순자산은 실제 시세처럼 보이지 않도록 제거한다.
 *
 * 사용 예 (server component):
 *   const etfs = await fetchEtfs();  // DB 있으면 DB, 없으면 시드
 */

import { getStaticEtfMetadata, type EtfInfo } from '@/lib/etfs';

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
  tracking_index: string | null;
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
    trackingIndex: row.tracking_index || '',
    baseDate: row.base_date || '',
    nav: row.nav || '',
    dataSource: row.data_source || 'database',
    dataNotice: row.base_date ? `DB 저장 시세 · ${row.base_date} 기준` : 'DB 저장 ETF 정보',
  };
}

let memoryCache: { data: EtfInfo[]; expiresAt: number } | null = null;

function staticFallback(limit: number): EtfInfo[] {
  return getStaticEtfMetadata().slice(0, limit);
}

async function fetchEtfByColumn(column: 'slug' | 'code', value: string): Promise<EtfInfo | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;

  const params = new URLSearchParams({
    select: '*',
    limit: '1',
  });
  params.set(column, `eq.${value}`);

  try {
    const res = await fetch(`${url}/rest/v1/etfs?${params.toString()}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) return undefined;
    const data: RawRow[] = await res.json();
    return data[0] ? rowToInfo(data[0]) : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchEtfs(limit = 1000): Promise<EtfInfo[]> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) return memoryCache.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return staticFallback(limit);

  try {
    const res = await fetch(
      `${url}/rest/v1/etfs?select=*&order=updated_at.desc&limit=${limit}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(2500),
      },
    );
    if (!res.ok) return staticFallback(limit);
    const data: RawRow[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return staticFallback(limit);
    const list = data.map(rowToInfo);
    memoryCache = { data: list, expiresAt: now + 10 * 60 * 1000 };
    return list;
  } catch {
    return staticFallback(limit);
  }
}

export async function fetchEtfBySlug(slug: string): Promise<EtfInfo | undefined> {
  const decoded = decodeURIComponent(slug);
  const fromCache = memoryCache?.data.find(e => e.slug === decoded);
  if (fromCache) return fromCache;

  // 1) 정확 매칭
  let hit = await fetchEtfByColumn('slug', decoded);
  if (hit) return hit;

  hit = getStaticEtfMetadata().find(e => e.slug === decoded);
  if (hit) return hit;

  // 2) slug 첫 토큰이 ticker — '/etf/voo' 같은 입력 허용
  const lower = decoded.toLowerCase();
  hit = memoryCache?.data.find(e => e.slug.split('-')[0] === lower);
  if (hit) return hit;

  hit = await fetchEtfByColumn('code', lower.toUpperCase());
  if (hit) return hit;

  hit = getStaticEtfMetadata().find(e => e.slug.split('-')[0] === lower);
  if (hit) return hit;

  return undefined;
}

export async function fetchEtfByCode(code: string): Promise<EtfInfo | undefined> {
  const norm = code.trim();
  const fromCache = memoryCache?.data.find(e => e.code === norm);
  if (fromCache) return fromCache;

  // 정확 매칭 우선 (KRX 6자리)
  let hit = await fetchEtfByColumn('code', norm);
  if (hit) return hit;

  hit = getStaticEtfMetadata().find(e => e.code === norm);
  if (hit) return hit;

  // 미국 티커는 보통 대문자로 저장됨 → 소문자 입력도 매칭
  const upper = norm.toUpperCase();
  hit = memoryCache?.data.find(e => e.code === upper);
  if (hit) return hit;

  hit = upper !== norm ? await fetchEtfByColumn('code', upper) : undefined;
  if (hit) return hit;

  hit = getStaticEtfMetadata().find(e => e.code === upper);
  if (hit) return hit;

  return undefined;
}
