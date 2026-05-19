/**
 * ETF 일별가격 히스토리 (Tier S).
 *
 * GET /api/etf/history?code=360750&period=3M
 *
 * 동작:
 * 1. Supabase public.etf_daily_prices 에서 hit 시도 (캐시)
 * 2. 알파뉴메릭 KRX 코드는 네이버 일별 시세를 조회 후 캐시
 * 3. 일반 숫자 코드는 FSC ETF 시세 API 에서 fetch (beginBasDt/endBasDt 기간 지정)
 * 4. fetch 결과를 DB 에 upsert (다음 호출은 캐시 히트)
 *
 * 반환: { items: [{ date, close, ... }], source: 'cache'|'api'|'naver'|'missing' }
 */

import { NextResponse } from 'next/server';
import { isKrEtfCode, normalizeEtfCode } from '@/lib/etfCodes';
import { fetchNaverDailyPrices } from '@/lib/naverEtfData';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const FSC_ETF_PRICE_ENDPOINT =
  'https://apis.data.go.kr/1160100/service/GetSecuritiesProductInfoService/getETFPriceInfo';

const PERIOD_DAYS: Record<string, number> = {
  '1M': 30,
  '3M': 92,
  '6M': 183,
  '1Y': 365,
  '5Y': 1825,
};

type DailyPriceCacheItem = {
  date: string;
  close: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  tradeValue?: number | null;
  nav?: number | null;
  marketCap?: number | null;
};

function pad2(n: number) { return String(n).padStart(2, '0'); }
function ymd(d: Date) { return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`; }
function ymdDash(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

function parseNumber(v: string | number | null | undefined) {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function hasAlphabetCode(code: string) {
  return /[A-Z]/.test(code);
}

function historyResponse(payload: { items: unknown[]; source: string }) {
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

async function fetchFromNaver(code: string, beginDate: Date, endDate: Date): Promise<DailyPriceCacheItem[] | null> {
  const naver = await fetchNaverDailyPrices(code, 20);
  if (naver.length === 0) return null;
  const begin = ymdDash(beginDate);
  const end = ymdDash(endDate);
  const items = naver.filter(item => item.date >= begin && item.date <= end);
  return items.length > 0 ? items : null;
}

async function fetchFromCache(code: string, beginDate: Date, endDate: Date) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const begin = ymdDash(beginDate);
  const end = ymdDash(endDate);
  const res = await fetch(
    `${url}/rest/v1/etf_daily_prices?code=eq.${code}&base_date=gte.${begin}&base_date=lte.${end}&select=base_date,close,nav,volume&order=base_date.asc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data.map((row: any) => ({
    date: row.base_date,
    close: row.close,
    nav: row.nav,
    volume: row.volume,
  }));
}

async function fetchFromApi(code: string, beginDate: Date, endDate: Date): Promise<DailyPriceCacheItem[] | null> {
  const serviceKey =
    process.env.DATA_GO_KR_SERVICE_KEY ||
    process.env.PUBLIC_DATA_SERVICE_KEY ||
    process.env.FSC_SECURITIES_API_KEY;
  if (!serviceKey) return null;

  const params = new URLSearchParams({
    pageNo: '1',
    numOfRows: '2000',
    resultType: 'json',
    srtnCd: code,
    beginBasDt: ymd(beginDate),
    endBasDt: ymd(endDate),
  });
  const encoded = serviceKey.includes('%') ? serviceKey : encodeURIComponent(serviceKey);
  const url = `${FSC_ETF_PRICE_ENDPOINT}?serviceKey=${encoded}&${params.toString()}`;

  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = await res.json();
    const item = json?.response?.body?.items?.item;
    if (!item) return null;
    const rows = Array.isArray(item) ? item : [item];
    return rows
      .map((row: any) => {
        const rowCode = normalizeEtfCode(row.srtnCd || row.srtncd || '');
        if (rowCode && rowCode !== code) return null;
        const d = String(row.basDt || '').replace(/\D/g, '');
        if (d.length !== 8) return null;
        return {
          date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
          close: parseNumber(row.clpr),
          open: parseNumber(row.mkp),
          high: parseNumber(row.hipr),
          low: parseNumber(row.lopr),
          volume: parseNumber(row.trqu),
          tradeValue: parseNumber(row.trPrc),
          nav: parseNumber(row.nav),
          marketCap: parseNumber(row.mrktTotAmt),
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return null;
  }
}

async function saveToCache(code: string, items: DailyPriceCacheItem[]) {
  const admin = createAdminClient();
  if (!admin || items.length === 0) return;
  const rows = items.map(it => ({
    code,
    base_date: it.date,
    close: it.close,
    open: it.open ?? null,
    high: it.high ?? null,
    low: it.low ?? null,
    volume: it.volume ?? null,
    trade_value: it.tradeValue ?? null,
    nav: it.nav ?? null,
    market_cap: it.marketCap ?? null,
  }));
  const { error } = await admin.from('etf_daily_prices').upsert(rows, { onConflict: 'code,base_date' });
  if (error) {
    console.error('[etf-history] cache upsert failed:', error.message);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = normalizeEtfCode(searchParams.get('code') || '');
  const period = (searchParams.get('period') || '3M').toUpperCase();
  if (!isKrEtfCode(code)) {
    return NextResponse.json({ error: 'invalid code' }, { status: 400 });
  }
  const days = PERIOD_DAYS[period] || PERIOD_DAYS['3M'];
  const endDate = new Date();
  const beginDate = new Date(endDate);
  beginDate.setDate(beginDate.getDate() - days);

  // 1) cache 먼저
  const cached = await fetchFromCache(code, beginDate, endDate);
  if (cached) {
    return historyResponse({ items: cached, source: 'cache' });
  }

  // Data.go.kr ETF endpoint can ignore alphanumeric srtnCd filters such as 0177X0.
  // Keep those codes on Naver only, but cache the Naver result for future chart loads.
  if (hasAlphabetCode(code)) {
    const naver = await fetchFromNaver(code, beginDate, endDate);
    if (naver) {
      await saveToCache(code, naver);
      return historyResponse({ items: naver, source: 'naver' });
    }
    return historyResponse({ items: [], source: 'missing' });
  }

  // 2) API
  const fresh = await fetchFromApi(code, beginDate, endDate);
  if (fresh && fresh.length > 0) {
    await saveToCache(code, fresh);
    return historyResponse({
      items: fresh.map(f => ({ date: f.date, close: f.close, nav: f.nav, volume: f.volume })),
      source: 'api',
    });
  }

  const naver = await fetchFromNaver(code, beginDate, endDate);
  if (naver) {
    await saveToCache(code, naver);
    return historyResponse({ items: naver, source: 'naver' });
  }

  return historyResponse({ items: [], source: 'missing' });
}
