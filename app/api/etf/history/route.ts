/**
 * ETF 일별가격 히스토리 (Tier S).
 *
 * GET /api/etf/history?code=360750&period=3M
 *
 * 동작:
 * 1. 먼저 Supabase public.etf_daily_prices 에서 hit 시도 (캐시)
 * 2. 부족하면 FSC ETF 시세 API 에서 fetch (beginBasDt/endBasDt 기간 지정)
 * 3. fetch 결과를 DB 에 upsert (다음 호출은 캐시 히트)
 *
 * 반환: { items: [{ date, close, ... }], source: 'cache'|'api'|'missing' }
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

function pad2(n: number) { return String(n).padStart(2, '0'); }
function ymd(d: Date) { return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`; }
function ymdDash(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

function parseNumber(v: string | number | null | undefined) {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
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
  if (!Array.isArray(data) || data.length < 5) return null; // 너무 적으면 무효
  return data.map((row: any) => ({
    date: row.base_date,
    close: row.close,
    nav: row.nav,
    volume: row.volume,
  }));
}

async function fetchFromApi(code: string, beginDate: Date, endDate: Date) {
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
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const item = json?.response?.body?.items?.item;
    if (!item) return null;
    const rows = Array.isArray(item) ? item : [item];
    return rows
      .map((row: any) => {
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

async function saveToCache(code: string, items: Array<NonNullable<Awaited<ReturnType<typeof fetchFromApi>>>[number]>) {
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
  await admin.from('etf_daily_prices').upsert(rows, { onConflict: 'code,base_date' });
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
    return NextResponse.json({ items: cached, source: 'cache' });
  }

  // 2) API
  const fresh = await fetchFromApi(code, beginDate, endDate);
  if (fresh && fresh.length > 0) {
    // 캐시 적재는 fire-and-forget 비동기
    void saveToCache(code, fresh);
    return NextResponse.json({
      items: fresh.map(f => ({ date: f.date, close: f.close, nav: f.nav, volume: f.volume })),
      source: 'api',
    });
  }

  const naver = await fetchNaverDailyPrices(code, 20);
  if (naver.length > 0) {
    const begin = ymdDash(beginDate);
    const end = ymdDash(endDate);
    return NextResponse.json({
      items: naver.filter(item => item.date >= begin && item.date <= end),
      source: 'naver',
    });
  }

  return NextResponse.json({ items: [], source: 'missing' });
}
