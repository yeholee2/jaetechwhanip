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
  if (/레버리지|2X|3X|인버스|곱버스/i.test(name)) return '레버리지·인버스';
  if (/커버드콜/.test(name)) return '커버드콜';
  if (/리츠|REIT|부동산/i.test(name)) return '부동산';
  if (/원유|천연가스|구리|니켈|코코아|원자재|금|은\b/.test(name)) return '원자재';
  if (/(국고채|국채|회사채|단기채|중기채|장기채|크레딧|MMF|머니마켓|채권)/.test(name)) return '채권';
  if (/(미국|S&P|나스닥|다우|글로벌|선진국|이머징|신흥국|중국|차이나|일본|인도|베트남|유럽|독일|영국)/i.test(name)) return '해외주식·ETF';
  if (/(반도체|2차전지|전기차|바이오|AI|인공지능|로봇|메타버스|블록체인|클라우드)/i.test(name)) return '테마형';
  if (/(배당|월배당|고배당)/.test(name)) return '배당형';
  if (/(코스피|코스닥|국내|K-|한국)/.test(name)) return '국내주식·ETF';
  return '국내주식·ETF';
}

function pickThemeFromName(name: string): string {
  if (/반도체/.test(name)) return '반도체';
  if (/AI|인공지능/i.test(name)) return 'AI';
  if (/(2차전지|전기차|배터리)/.test(name)) return '2차전지';
  if (/바이오/.test(name)) return '바이오';
  if (/(월배당|고배당|배당)/.test(name)) return '배당';
  if (/나스닥|NASDAQ/i.test(name)) return '나스닥100';
  if (/S&P\s*500/i.test(name)) return 'S&P500';
  if (/리츠|REIT/i.test(name)) return '리츠';
  if (/(국고채|국채|회사채|채권)/.test(name)) return '채권';
  if (/원자재|금|은|원유|구리/.test(name)) return '원자재';
  if (/커버드콜/.test(name)) return '커버드콜';
  if (/레버리지|2X|3X/i.test(name)) return '레버리지';
  if (/인버스|곱버스/.test(name)) return '인버스';
  if (/코스피|KOSPI/i.test(name)) return '코스피';
  if (/코스닥|KOSDAQ/i.test(name)) return '코스닥';
  return '시장지수';
}

const ISSUER_RULES: [RegExp, string][] = [
  [/^KODEX\b/, '삼성자산운용'],
  [/^TIGER\b/, '미래에셋자산운용'],
  [/^ACE\b/, '한국투자신탁운용'],
  [/^1Q\b/, '한국투자신탁운용'],
  [/^ITF\b/, '한국투자신탁운용'],
  [/^PLUS\b/, '한화자산운용'],
  [/^ARIRANG\b/, '한화자산운용'],
  [/^KBSTAR\b|^KB STAR\b/, 'KB자산운용'],
  [/^RISE\b/, 'KB자산운용'],
  [/^SOL\b/, '신한자산운용'],
  [/^HANARO\b/, 'NH-Amundi자산운용'],
  [/^KIWOOM\b/, '키움투자자산운용'],
  [/^TIMEFOLIO\b|^TIME\b/, '타임폴리오자산운용'],
  [/^WOORI\b|^WON\b/, '우리자산운용'],
  [/^BNK\b/, 'BNK자산운용'],
  [/^HK\b/, '흥국자산운용'],
  [/^MIDAS\b/, '마이다스에셋자산운용'],
  [/^KoAct\b|^코액트\b/, '삼성액티브자산운용'],
  [/^에셋플러스\b/, '에셋플러스자산운용'],
  [/^마이티\b/, 'DB자산운용'],
  [/^아이엠에셋\b/, '아이엠에셋자산운용'],
  [/^더제이\b/, '더제이자산운용'],
  [/^FOCUS\b/, '마이다스에셋자산운용'],
  [/^파워\b/, '교보악사자산운용'],
];

function pickIssuerFromName(name: string): string {
  for (const [re, v] of ISSUER_RULES) if (re.test(name)) return v;
  return '기타';
}

/** 종목명 + 기초지수명으로 추종 자산 국가 자동 분류 */
function pickUnderlyingCountry(name: string, bssIdx: string): string {
  const t = `${name} ${bssIdx}`;
  if (/미국|S&P\s*500|나스닥|NASDAQ|다우|러셀|필라델피아|S&P|미국채|미국주|뉴욕|US\b/i.test(t)) return 'US';
  if (/(중국|차이나|상해|항셍|홍콩|H지수|CSI|선전)/i.test(t)) return 'CN';
  if (/(일본|JP|TOPIX|닛케이|Nikkei)/i.test(t)) return 'JP';
  if (/(인도|니프티|Nifty|India)/i.test(t)) return 'IN';
  if (/(유럽|독일|영국|프랑스|EU|Eurostoxx|DAX|FTSE)/i.test(t)) return 'EU';
  if (/(베트남|호치민)/i.test(t)) return 'VN';
  if (/(대만|TAIEX)/i.test(t)) return 'TW';
  if (/(이머징|신흥국|EM|Emerging)/i.test(t)) return 'EM';
  if (/(글로벌|선진국|World|Developed|MSCI)/i.test(t)) return 'GLOBAL';
  return 'KR';
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
  const underlyingCountry = pickUnderlyingCountry(name, readField(row, 'bssIdxIdxNm'));

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
    tags: [theme, category, underlyingCountry].filter(Boolean),
    holdings: [],
    related_questions: [],
    sparring_title: null,
    data_source: 'public-api',
    market: 'KRX',
    country: 'KR',
    currency: 'KRW',
    underlying_country: underlyingCountry,
    tracking_index: readField(row, 'bssIdxIdxNm').trim() || null,
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
