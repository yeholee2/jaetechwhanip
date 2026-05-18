import type { PricePoint } from '@/lib/etfPriceHistory';
import { isKrEtfCode, normalizeEtfCode } from '@/lib/etfCodes';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15';

export type NaverEtfRealtime = {
  code: string;
  price: string;
  change: string;
  changeTone: 'up' | 'down' | 'flat';
  volume: string;
  tradeValue: string;
  nav: string;
  premium?: number;
  aum: string;
  baseDate: string;
};

export type NaverEtfNavPoint = {
  date: string;
  close: number;
  nav: number;
  premium: number;
};

function parseNumber(value: unknown) {
  if (value == null) return 0;
  const n = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function stripTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readHtml(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const buffer = await response.arrayBuffer();
  if (/euc-kr|ks_c_5601|cp949/i.test(contentType)) {
    return new TextDecoder('euc-kr').decode(buffer);
  }
  return new TextDecoder('utf-8').decode(buffer);
}

function formatWon(value: number, maximumFractionDigits = 0) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits })}원`;
}

function formatShares(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value >= 10000) return `${Math.round(value / 1000) / 10}만주`;
  return `${value.toLocaleString('ko-KR')}주`;
}

function formatLargeWon(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  const trillion = 1_000_000_000_000;
  const hundredMillion = 100_000_000;
  if (value >= trillion) {
    const trillionPart = Math.floor(value / trillion);
    const hundredMillionPart = Math.round((value % trillion) / hundredMillion);
    return hundredMillionPart > 0
      ? `${trillionPart}조 ${hundredMillionPart.toLocaleString('ko-KR')}억`
      : `${trillionPart}조`;
  }
  if (value >= hundredMillion) return `${Math.round(value / hundredMillion).toLocaleString('ko-KR')}억`;
  return `${value.toLocaleString('ko-KR')}원`;
}

function formatKstMinute(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const date = new Date(ms + 9 * 60 * 60 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

export async function fetchNaverEtfRealtime(code: string): Promise<NaverEtfRealtime | null> {
  const normalized = normalizeEtfCode(code);
  if (!isKrEtfCode(normalized)) return null;

  try {
    const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:${encodeURIComponent(normalized)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const json = await response.json();
    const row = json?.result?.areas?.[0]?.datas?.[0];
    if (!row || normalizeEtfCode(row.cd) !== normalized) return null;

    const price = parseNumber(row.nv);
    const previous = parseNumber(row.pcv);
    const changeRate = parseNumber(row.cr);
    const nav = parseNumber(row.nav);
    const listedShares = parseNumber(row.countOfListedStock);
    const premium = nav > 0 && price > 0 ? ((price - nav) / nav) * 100 : undefined;
    const diff = price - previous;
    const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
    const sign = changeRate > 0 ? '+' : changeRate < 0 ? '-' : '';

    return {
      code: normalized,
      price: formatWon(price),
      change: `${sign}${Math.abs(changeRate).toFixed(2)}%`,
      changeTone: tone,
      volume: formatShares(parseNumber(row.aq)),
      tradeValue: formatLargeWon(parseNumber(row.aa)),
      nav: formatWon(nav, 2),
      premium,
      aum: nav > 0 && listedShares > 0 ? formatLargeWon(nav * listedShares) : '',
      baseDate: formatKstMinute(parseNumber(json?.result?.time)),
    };
  } catch {
    return null;
  }
}

export async function fetchNaverDailyPrices(code: string, maxPages = 20): Promise<PricePoint[]> {
  const normalized = normalizeEtfCode(code);
  if (!isKrEtfCode(normalized)) return [];

  const rows = new Map<string, PricePoint>();
  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `https://finance.naver.com/item/sise_day.naver?code=${encodeURIComponent(normalized)}&page=${page}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Referer: `https://finance.naver.com/item/main.naver?code=${encodeURIComponent(normalized)}`,
        },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(3500),
      });
      if (!response.ok) break;
      const html = await readHtml(response);
      const pageRows = Array.from(html.matchAll(/<tr[^>]*onMouseOver[\s\S]*?<\/tr>/gi));
      if (pageRows.length === 0) break;

      for (const match of pageRows) {
        const row = match[0];
        const dateMatch = row.match(/(\d{4}\.\d{2}\.\d{2})/);
        const values = Array.from(row.matchAll(/<span class="tah p11[^"]*">([\s\S]*?)<\/span>/gi))
          .map(item => stripTags(item[1]));
        const close = parseNumber(values[0]);
        if (!dateMatch || !close) continue;
        const date = dateMatch[1].replace(/\./g, '-');
        rows.set(date, { date, close });
      }
    } catch {
      break;
    }
  }

  return Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchNaverEtfNavHistory(code: string): Promise<NaverEtfNavPoint[]> {
  const normalized = normalizeEtfCode(code);
  if (!isKrEtfCode(normalized)) return [];

  try {
    const url = `https://finance.naver.com/item/main.naver?code=${encodeURIComponent(normalized)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    const html = await readHtml(response);
    const section = html.match(/<div class="section etf_nav">([\s\S]*?)<\/div>/i)?.[1] || html;
    const rows: NaverEtfNavPoint[] = [];
    for (const match of section.matchAll(/<tr>\s*<td class="date">(\d{4}\.\d{2}\.\d{2})<\/td>([\s\S]*?)<\/tr>/gi)) {
      const date = match[1].replace(/\./g, '-');
      const cells = Array.from(match[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(item => stripTags(item[1]));
      const close = parseNumber(cells[0]);
      const nav = parseNumber(cells[1]);
      const premium = parseNumber(cells[2]);
      if (!close || !nav) continue;
      rows.push({ date, close, nav, premium });
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
