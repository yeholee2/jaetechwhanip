/**
 * ETF 보유종목 (Top 10) — Yahoo Finance quoteSummary.
 *
 * Yahoo는 v10/quoteSummary에 crumb+cookie 인증 요구.
 * 1) 세션 쿠키 발급 (fc.yahoo.com)
 * 2) crumb 토큰 발급 (query1/v1/test/getcrumb)
 * 3) quoteSummary 호출 (modules=topHoldings)
 *
 * 서버 메모리 캐시 — 12시간 (rate limit + cost 절감).
 */

export type HoldingItem = {
  symbol: string;
  name: string;
  weight: number; // 0~1
};

export type SectorWeight = {
  sector: string;
  weight: number;
};

export type EtfHoldingsData = {
  holdings: HoldingItem[];
  sectors: SectorWeight[];
  source?: 'yahoo' | 'naver';
  /** 운용보수 (예: 0.0007 = 0.07%) */
  expenseRatio?: number;
  /** 배당수익률 (예: 0.0123 = 1.23%) */
  dividendYield?: number;
  /** AUM (총 자산, USD) */
  totalAssets?: number;
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15';

let crumbCache: { crumb: string; cookie: string; expiresAt: number } | null = null;

async function getCrumbAndCookie(): Promise<{ crumb: string; cookie: string } | null> {
  const now = Date.now();
  if (crumbCache && crumbCache.expiresAt > now) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  }
  try {
    // 1) 쿠키 받기
    const cookieRes = await fetch('https://fc.yahoo.com/', {
      headers: { 'User-Agent': UA },
      redirect: 'manual',
    });
    const setCookie = cookieRes.headers.get('set-cookie') || '';
    if (!setCookie) return null;
    // 첫 segment만 (key=value; ...)
    const cookie = setCookie.split(',').map(c => c.split(';')[0]).join('; ');

    // 2) crumb 받기
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie },
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb) return null;
    crumbCache = { crumb, cookie, expiresAt: now + 12 * 3600 * 1000 };
    return { crumb, cookie };
  } catch {
    return null;
  }
}

function toYahooSymbol(code: string): string {
  if (/^[0-9]{6}$/.test(code)) return `${code}.KS`;
  return code;
}

export async function fetchEtfHoldings(code: string): Promise<EtfHoldingsData | null> {
  const auth = await getCrumbAndCookie();
  if (!auth) return null;
  const symbol = toYahooSymbol(code);
  // 여러 모듈 한 번에 (topHoldings + fundProfile + summaryDetail + defaultKeyStatistics)
  const modules = 'topHoldings,fundProfile,summaryDetail,defaultKeyStatistics';
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Cookie: auth.cookie },
      next: { revalidate: 86400 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const result = j?.quoteSummary?.result?.[0];
    if (!result) return null;
    const th = result.topHoldings;
    const fp = result.fundProfile;
    const sd = result.summaryDetail;
    const dks = result.defaultKeyStatistics;
    if (!th && !fp && !sd) return null;
    const holdings: HoldingItem[] = (th?.holdings || [])
      .filter((h: any) => h.holdingPercent?.raw != null)
      .map((h: any) => ({
        symbol: h.symbol || '',
        name: h.holdingName || h.symbol || '',
        weight: h.holdingPercent.raw,
      }))
      .slice(0, 10);
    const sectors: SectorWeight[] = (th?.sectorWeightings || [])
      .map((s: any) => {
        const entries = Object.entries(s as Record<string, any>);
        const [name, val] = entries[0] || ['', {}];
        const weight = (val as any)?.raw;
        return { sector: prettySector(name), weight: typeof weight === 'number' ? weight : 0 };
      })
      .filter((s: SectorWeight) => s.weight > 0);

    // 운용보수 — fundProfile.feesExpensesInvestment.annualReportExpenseRatio
    const expenseRatio = fp?.feesExpensesInvestment?.annualReportExpenseRatio?.raw
      ?? sd?.netExpenseRatio?.raw
      ?? undefined;

    // 배당수익률
    const dividendYield = sd?.yield?.raw
      ?? sd?.dividendYield?.raw
      ?? undefined;

    // 총 자산
    const totalAssets = sd?.totalAssets?.raw
      ?? dks?.totalAssets?.raw
      ?? undefined;

    return { holdings, sectors, expenseRatio, dividendYield, totalAssets };
  } catch {
    return null;
  }
}

const SECTOR_KO: Record<string, string> = {
  realestate: '부동산',
  consumer_cyclical: '경기소비재',
  basic_materials: '소재',
  consumer_defensive: '필수소비재',
  technology: '기술',
  communication_services: '통신',
  financial_services: '금융',
  utilities: '유틸리티',
  industrials: '산업재',
  energy: '에너지',
  healthcare: '헬스케어',
};

function prettySector(key: string): string {
  return SECTOR_KO[key] || key;
}
