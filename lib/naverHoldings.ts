/**
 * KR ETF 구성종목 — 네이버 cu_more + Yahoo 시총 배치 → 시총 가중 추정.
 *
 * 흐름:
 *  1. 네이버 cu_more 페이지에서 Top 20-22 종목명+코드 추출
 *  2. Yahoo /v7/quote 배치로 각 종목 marketCap 한 번에
 *  3. 비중 = 종목 시총 / Top N 시총 합 × 0.85 (잔여 0.15 는 "기타 미공개" 의미)
 *  4. 시총 못 받으면 rank 기반 placeholder 로 fallback
 *
 * 한계:
 *  - 시가총액 가중 ETF (KODEX 200, S&P500 ETF 등) 에는 정확
 *  - Equal Weight·Smart Beta·Theme 액티브 ETF 에는 부정확 (라벨 "추정" 명시)
 */

import type { HoldingItem } from '@/lib/etfHoldings';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';

/**
 * cu_more HTML 파싱. 응답은 cp949/euc-kr 인코딩이라 디코딩 필요.
 */
export async function fetchNaverHoldings(etfCode: string): Promise<HoldingItem[]> {
  if (!/^[0-9]{6}$/.test(etfCode)) return [];

  const url = `https://finance.naver.com/item/coinfo.naver?code=${etfCode}&target=cu_more`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      next: { revalidate: 21600 }, // 6h
    });
    if (!r.ok) return [];

    // 인코딩 변환: euc-kr → utf-8
    const buf = await r.arrayBuffer();
    let html: string;
    try {
      // TextDecoder 가 euc-kr 지원 (Node 18+)
      html = new TextDecoder('euc-kr').decode(buf);
    } catch {
      html = new TextDecoder('utf-8').decode(buf);
    }

    const items = parseConstituents(html, etfCode);
    if (items.length === 0) return [];
    // 시총 가중치 추정
    return await assignMarketCapWeights(items);
  } catch {
    return [];
  }
}

/** HTML 에서 종목명 + 코드 추출 */
function parseConstituents(html: string, selfCode: string): HoldingItem[] {
  const re = /<a[^>]*href="[^"]*code=(\d{6})[^"]*"[^>]*>([^<]+)<\/a>/g;
  const seen = new Set<string>();
  const items: HoldingItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const code = m[1];
    if (code === selfCode) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    const name = m[2].trim();
    if (!name || name.length > 30) continue;
    items.push({ symbol: code, name, weight: 0 });
  }
  return items;
}

/**
 * Yahoo /v7/quote 배치 호출로 marketCap 받아서 시총 가중 분배.
 * Yahoo 가 실패한 종목은 rank 기반 추정.
 */
async function assignMarketCapWeights(items: HoldingItem[]): Promise<HoldingItem[]> {
  const N = items.length;
  if (N === 0) return [];

  const symbols = items.map(it => `${it.symbol}.KS`).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
  const mcaps = new Map<string, number>();

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 86400 },
    });
    if (r.ok) {
      const j = await r.json();
      for (const q of j?.quoteResponse?.result || []) {
        const code = (q.symbol || '').replace('.KS', '');
        const mc = q.marketCap;
        if (code && Number.isFinite(mc) && mc > 0) {
          mcaps.set(code, mc);
        }
      }
    }
  } catch { /* fallback to rank */ }

  // KOSDAQ 은 .KQ — 못 받았으면 한 번 더
  const missing = items.filter(it => !mcaps.has(it.symbol));
  if (missing.length > 0) {
    const ksqSymbols = missing.map(it => `${it.symbol}.KQ`).join(',');
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ksqSymbols)}`,
        { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } },
      );
      if (r.ok) {
        const j = await r.json();
        for (const q of j?.quoteResponse?.result || []) {
          const code = (q.symbol || '').replace('.KQ', '');
          const mc = q.marketCap;
          if (code && Number.isFinite(mc) && mc > 0) {
            mcaps.set(code, mc);
          }
        }
      }
    } catch { /* swallow */ }
  }

  // 시총 합산
  const totalMcap = Array.from(mcaps.values()).reduce((s, v) => s + v, 0);

  // 시총 정보 있는 종목 비율 (커버리지)
  const coverage = mcaps.size / N;

  // 잔여 비중 (Top N 밖 + 기타) — 시총 가중 ETF 라면 Top 20이 보통 50-80%
  const allocated = 0.85; // 합 0.85, 잔여 0.15 = "기타"

  if (totalMcap > 0 && coverage >= 0.5) {
    // 시총 가중 적용
    for (const it of items) {
      const mc = mcaps.get(it.symbol);
      if (mc != null) {
        it.weight = (mc / totalMcap) * allocated;
      } else {
        // 시총 못 받은 종목은 평균값
        it.weight = (allocated / N) * 0.5; // 절반 가중
      }
    }
    // weight 내림차순 정렬 (시총 큰 거 위로)
    items.sort((a, b) => b.weight - a.weight);
  } else {
    // 시총 다 못 받음 → rank 기반 fallback
    const totalRank = (N * (N + 1)) / 2;
    for (let i = 0; i < N; i++) {
      items[i].weight = ((N - i) / totalRank) * 0.6;
    }
  }

  return items;
}
