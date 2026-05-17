/**
 * KR ETF 구성종목 — 네이버 증권 cu_more 페이지 스크래이핑.
 *
 * 한계:
 *  - 비중(%) 정보는 없음 — Top 20-22개 종목명+코드만
 *  - 우리는 placeholder weight 로 저장 (1/N) — 인덱싱·역검색 용도
 *  - "비중 공개됨" 시그널이 따로 있는 게 좋음 → source='naver_top'
 *
 * 사용:
 *   const items = await fetchNaverHoldings('069500')
 *   → [{ symbol: '005930', name: '삼성전자', weight: 0.045 }, ...]
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

    return parseConstituents(html, etfCode);
  } catch {
    return [];
  }
}

/** HTML 에서 종목명 + 코드 추출 */
function parseConstituents(html: string, selfCode: string): HoldingItem[] {
  // <a ... href="...code=XXXXXX...">종목명</a> 패턴
  const re = /<a[^>]*href="[^"]*code=(\d{6})[^"]*"[^>]*>([^<]+)<\/a>/g;
  const seen = new Set<string>();
  const items: HoldingItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const code = m[1];
    if (code === selfCode) continue; // 본인 제외
    if (seen.has(code)) continue;
    seen.add(code);
    const name = m[2].trim();
    if (!name || name.length > 30) continue;
    items.push({ symbol: code, name, weight: 0 }); // weight 는 호출자가 채움
  }

  // 등장 순서대로 (Naver 가 보통 비중 큰 순으로 표시)
  // 비중은 미공개이므로 placeholder: rank 기반 가중
  // 첫번째 종목 큰 가중치 → 마지막은 작게 (조화감)
  const N = items.length;
  if (N === 0) return [];
  // weight = (N-i)/sum 로 정규화 → 합 1.0
  // 단, "정확한 비중 아님" 시그널이 필요할 수 있어 합 0.5 로 표시 (= 50% 미공개 의미)
  const totalRank = (N * (N + 1)) / 2;
  for (let i = 0; i < N; i++) {
    items[i].weight = ((N - i) / totalRank) * 0.6; // 합 0.6 — 잔여 0.4 는 "기타/미공개"
  }
  return items;
}
