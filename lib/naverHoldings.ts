/**
 * KR ETF 구성종목 — 네이버 ETF분석 구성자산 표.
 *
 * 네이버가 표에 제공하는 종목명·코드·구성비중만 사용한다.
 * 비중이 없는 경우 임의 추정하지 않고 weight=0 으로 둔다.
 */

import type { HoldingItem } from '@/lib/etfHoldings';
import { isKrEtfCode, normalizeEtfCode } from '@/lib/etfCodes';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';

export async function fetchNaverHoldings(etfCode: string): Promise<HoldingItem[]> {
  const code = normalizeEtfCode(etfCode);
  if (!isKrEtfCode(code)) return [];

  const url = `https://finance.naver.com/item/main.naver?code=${encodeURIComponent(code)}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    const html = await response.text();
    return parseConstituents(html, code);
  } catch {
    return [];
  }
}

function parseConstituents(html: string, selfCode: string): HoldingItem[] {
  const seen = new Set<string>();
  const items: HoldingItem[] = [];
  const rowRe = /<tr>\s*<td class="ctg">[\s\S]*?<a[^>]*code=([0-9A-Z]{6})[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>\s*<td>[\s\S]*?([\d,]+)[\s\S]*?<\/td>\s*<td class="per">[\s\S]*?([\d.]+)\s*%[\s\S]*?<\/td>/gi;

  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(html)) !== null) {
    const code = normalizeEtfCode(match[1]);
    if (code === selfCode || seen.has(code)) continue;
    seen.add(code);
    const name = cleanText(match[2]);
    const weight = Number(match[4]) / 100;
    if (!name || name.length > 40) continue;
    items.push({ symbol: code, name, weight: Number.isFinite(weight) ? weight : 0 });
  }

  if (items.length > 0) return items;

  const anchorRe = /<a[^>]*href="[^"]*code=([0-9A-Z]{6})[^"]*"[^>]*>([^<]+)<\/a>/gi;
  while ((match = anchorRe.exec(html)) !== null) {
    const code = normalizeEtfCode(match[1]);
    if (code === selfCode || seen.has(code)) continue;
    seen.add(code);
    const name = cleanText(match[2]);
    if (!name || name.length > 40) continue;
    items.push({ symbol: code, name, weight: 0 });
    if (items.length >= 10) break;
  }

  return items;
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
