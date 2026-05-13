/**
 * CUSIP → Ticker 해결 (OpenFIGI 무료 API).
 *
 * 무료 한도 (no API key): 25 req/min, 100 mapping/req.
 * 13F 한 펀드 = ~20 CUSIP → 한 번에 전송 가능.
 *
 * 응답에 ticker가 여러 거래소에 매핑될 수 있어 primary US 거래소 우선.
 */

const OPENFIGI_URL = 'https://api.openfigi.com/v3/mapping';

type FigiMapping = {
  figi?: string;
  ticker?: string;
  name?: string;
  exchCode?: string;
  securityType?: string;
  securityType2?: string;
  marketSector?: string;
};

type FigiResponse = {
  data?: FigiMapping[];
  error?: string;
};

const US_PRIMARY_EXCHANGES = new Set(['UN', 'UW', 'UQ', 'UA', 'UR', 'UV']); // NYSE, NASDAQ, AMEX, ARCA

/** primary US 거래소 매핑 우선 선택. 없으면 첫 매핑. */
function pickBestMapping(items: FigiMapping[] = []): FigiMapping | null {
  if (items.length === 0) return null;
  // Common Stock + US primary 우선
  const usPrimary = items.find(
    i => i.exchCode && US_PRIMARY_EXCHANGES.has(i.exchCode) && i.securityType === 'Common Stock'
  );
  if (usPrimary) return usPrimary;
  // ETF 등 다른 type도 허용
  const usAny = items.find(i => i.exchCode && US_PRIMARY_EXCHANGES.has(i.exchCode));
  if (usAny) return usAny;
  return items[0];
}

/**
 * CUSIP 배열 → Map<cusip, {ticker, name, kind}>.
 * 실패한 CUSIP는 Map에 없음 (호출 측에서 fallback).
 */
export async function resolveCusips(
  cusips: string[],
): Promise<Map<string, { ticker: string; name?: string; kind?: 'stock' | 'etf' }>> {
  const out = new Map<string, { ticker: string; name?: string; kind?: 'stock' | 'etf' }>();
  if (cusips.length === 0) return out;

  // OpenFIGI는 최대 100 jobs/request
  const chunks: string[][] = [];
  for (let i = 0; i < cusips.length; i += 100) chunks.push(cusips.slice(i, i + 100));

  for (const chunk of chunks) {
    const body = chunk.map(c => ({ idType: 'ID_CUSIP', idValue: c }));
    try {
      const r = await fetch(OPENFIGI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        // rate limit — 짧게 대기
        if (r.status === 429) await new Promise(res => setTimeout(res, 6000));
        continue;
      }
      const json: FigiResponse[] = await r.json();
      json.forEach((res, idx) => {
        const cusip = chunk[idx];
        const best = pickBestMapping(res.data);
        if (best?.ticker) {
          const kind: 'stock' | 'etf' =
            best.securityType === 'ETP' || best.securityType2 === 'Exchange Traded Fund'
              ? 'etf'
              : 'stock';
          out.set(cusip, { ticker: best.ticker, name: best.name, kind });
        }
      });
    } catch {
      // 한 청크 실패해도 계속
    }
    // 한도 보호: 청크 간 짧은 backoff
    await new Promise(r => setTimeout(r, 200));
  }

  return out;
}
