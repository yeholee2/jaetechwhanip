/**
 * 전체 ETF 메타데이터 일괄 동기화 (Tier S).
 *
 * 동작:
 * 1. 금융위원회 ETF 시세 API 호출 (pageNo 1..N 페이지네이션)
 * 2. 각 row 를 EtfInfo 형태로 정규화
 * 3. Supabase public.etfs 에 upsert (code 충돌 시 update)
 * 4. 결과 요약 JSON 반환
 *
 * 권한:
 * - GET /api/etf/sync: CRON_SECRET 인증 (Vercel Cron 또는 수동)
 *
 * 환경변수:
 * - DATA_GO_KR_SERVICE_KEY (또는 PUBLIC_DATA_SERVICE_KEY)
 * - CRON_SECRET
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FSC_ETF_PRICE_ENDPOINT =
  'https://apis.data.go.kr/1160100/service/GetSecuritiesProductInfoService/getETFPriceInfo';

type PublicRow = Record<string, string | number | null | undefined>;

function readField(row: PublicRow, key: string) {
  const v = row[key];
  if (v == null) return '';
  return String(v);
}

function parseNumber(v: string) {
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatWon(v: string) {
  const n = parseNumber(v);
  if (!n) return '';
  return `${n.toLocaleString('ko-KR')}원`;
}

function formatRate(v: number) {
  if (!Number.isFinite(v)) return '';
  if (v > 0) return `+${v.toFixed(2)}%`;
  if (v < 0) return `${v.toFixed(2)}%`;
  return '0.00%';
}

function formatVolume(v: string) {
  const n = parseNumber(v);
  if (!n) return '';
  if (n >= 10_000) return `${Math.round(n / 1000) / 10}만주`;
  return `${n.toLocaleString('ko-KR')}주`;
}

function formatLargeWon(v: string) {
  const n = parseNumber(v);
  if (!n) return '';
  const T = 1_000_000_000_000;
  const M = 100_000_000;
  if (n >= T) {
    const t = Math.floor(n / T);
    const m = Math.round((n % T) / M);
    return m > 0 ? `${t}조 ${m.toLocaleString('ko-KR')}억` : `${t}조`;
  }
  if (n >= M) return `${Math.round(n / M).toLocaleString('ko-KR')}억`;
  return `${n.toLocaleString('ko-KR')}원`;
}

function formatBaseDate(v: string) {
  const d = v.replace(/\D/g, '');
  if (d.length !== 8) return '';
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
}

function slugify(name: string, code: string): string {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `etf-${code}`;
}

function pickCategoryFromName(name: string): string {
  if (/(미국|S&P|나스닥|다우|글로벌)/i.test(name)) return '해외주식·ETF';
  if (/(채권|국채|회사채)/.test(name)) return '채권';
  if (/(금|은|원유|구리|원자재)/.test(name)) return '원자재';
  if (/(부동산|리츠|REITs)/i.test(name)) return '부동산';
  if (/(코스피|코스닥|국내)/.test(name)) return '국내주식·ETF';
  return '국내주식·ETF';
}

function pickThemeFromName(name: string): string {
  if (/반도체/.test(name)) return '반도체';
  if (/AI|인공지능/i.test(name)) return 'AI';
  if (/(2차전지|전기차|배터리)/.test(name)) return '2차전지';
  if (/(배당|월배당|고배당)/.test(name)) return '배당';
  if (/(나스닥|NASDAQ)/i.test(name)) return '나스닥100';
  if (/S&P\s*500/i.test(name)) return 'S&P500';
  if (/리츠|REIT/i.test(name)) return '리츠';
  if (/(채권|국채)/.test(name)) return '채권';
  return '시장지수';
}

function pickIssuerFromName(name: string): string {
  if (name.startsWith('KODEX')) return '삼성자산운용';
  if (name.startsWith('TIGER')) return '미래에셋자산운용';
  if (name.startsWith('ACE')) return '한국투자신탁운용';
  if (name.startsWith('PLUS')) return '한화자산운용';
  if (name.startsWith('ARIRANG')) return '한화자산운용';
  if (name.startsWith('KBSTAR') || name.startsWith('KB STAR')) return 'KB자산운용';
  if (name.startsWith('RISE')) return 'KB자산운용';
  if (name.startsWith('SOL')) return '신한자산운용';
  if (name.startsWith('HANARO')) return 'NH-Amundi자산운용';
  if (name.startsWith('TIMEFOLIO')) return '타임폴리오자산운용';
  if (name.startsWith('WOORI')) return '우리자산운용';
  return '운용사';
}

async function fetchAllPages(serviceKey: string): Promise<PublicRow[]> {
  const all: PublicRow[] = [];
  let pageNo = 1;
  const numOfRows = 200;
  const maxPages = 10; // 안전 상한

  while (pageNo <= maxPages) {
    const params = new URLSearchParams({
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
      resultType: 'json',
    });
    const encoded = serviceKey.includes('%') ? serviceKey : encodeURIComponent(serviceKey);
    const url = `${FSC_ETF_PRICE_ENDPOINT}?serviceKey=${encoded}&${params.toString()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) break;
    const json = await res.json();
    const item = json?.response?.body?.items?.item;
    if (!item) break;
    const rows = Array.isArray(item) ? item : [item];
    all.push(...rows);
    const totalCount = Number(json?.response?.body?.totalCount || 0);
    if (all.length >= totalCount || rows.length < numOfRows) break;
    pageNo += 1;
  }
  return all;
}

function rowToEtf(row: PublicRow) {
  const code = readField(row, 'srtnCd').replace(/\D/g, '').padStart(6, '0');
  const name = readField(row, 'itmsNm').trim() || readField(row, 'isinCdNm').trim();
  if (!code || !name) return null;
  const shortName = name.length > 25 ? name.slice(0, 25) : name;
  const changeRate = parseNumber(readField(row, 'fltRt'));
  const issuer = pickIssuerFromName(name);
  const category = pickCategoryFromName(name);
  const theme = pickThemeFromName(name);

  return {
    slug: slugify(shortName, code),
    code,
    name,
    short_name: shortName,
    issuer,
    category,
    theme,
    summary: `${name} (${code}) — ${issuer} 운용 ${category}`,
    one_line: null,
    price: formatWon(readField(row, 'clpr')),
    change: formatRate(changeRate),
    change_tone: changeRate > 0 ? 'up' : changeRate < 0 ? 'down' : 'flat',
    aum: formatLargeWon(readField(row, 'mrktTotAmt')),
    fee: null,
    distribution: null,
    hedge: null,
    listed_at: null,
    base_date: formatBaseDate(readField(row, 'basDt')),
    volume: formatVolume(readField(row, 'trqu')),
    nav: formatWon(readField(row, 'nav')),
    tags: [theme, category].filter(Boolean),
    holdings: [],
    related_questions: [],
    sparring_title: null,
    data_source: 'public-api',
  };
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const serviceKey =
    process.env.DATA_GO_KR_SERVICE_KEY ||
    process.env.PUBLIC_DATA_SERVICE_KEY ||
    process.env.FSC_SECURITIES_API_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'DATA_GO_KR_SERVICE_KEY env not set' }, { status: 503 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'supabase admin client unavailable' }, { status: 500 });
  }

  const startedAt = Date.now();
  const rows = await fetchAllPages(serviceKey);
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: 'no rows from FSC' }, { status: 502 });
  }

  // 정규화 + dedup (code 기준)
  type NormEtf = NonNullable<ReturnType<typeof rowToEtf>>;
  const seen = new Map<string, NormEtf>();
  for (const r of rows) {
    const norm = rowToEtf(r);
    if (norm) seen.set(norm.code, norm);
  }
  const batch: NormEtf[] = Array.from(seen.values());

  // Supabase upsert (1회 200개씩 chunk)
  const chunks: NormEtf[][] = [];
  for (let i = 0; i < batch.length; i += 200) chunks.push(batch.slice(i, i + 200));

  let upserted = 0;
  const errors: string[] = [];
  for (const chunk of chunks) {
    const { error, count } = await admin.from('etfs').upsert(chunk, { onConflict: 'code', count: 'exact' });
    if (error) {
      errors.push(error.message);
    } else {
      upserted += count || chunk.length;
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    fetched: rows.length,
    deduped: batch.length,
    upserted,
    errors: errors.slice(0, 5),
    elapsedMs: Date.now() - startedAt,
  });
}
