/**
 * 수동 포트폴리오 — 서버 fetch + 시세 + 분석.
 *
 * 차별점:
 *  - 마이데이터 없이도 사용자 보유 종목 트래킹
 *  - 우리 ETF 데이터·창작자 글과 자동 연결
 */
import { createClient } from '@/lib/supabase/server';
import { fetchQuote, type Quote } from '@/lib/realtimeQuote';
import { findEtfsHoldingSymbol, normalizeSymbol } from '@/lib/holdingsCache';
import { fetchPostsBySymbol, type PostWithCreator } from '@/lib/postMentions';

export type Holding = {
  id: string;
  portfolio_id: string;
  symbol: string;
  display_symbol: string | null;
  name: string;
  quantity: number;
  avg_cost: number | null;
  currency: 'KRW' | 'USD';
  memo: string | null;
  added_at: string;
};

export type Portfolio = {
  id: string;
  user_id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type EnrichedHolding = Holding & {
  quote?: Quote;
  currentValue?: number;          // 보유 평가액 (current_price × quantity)
  costBasis?: number;             // 매입 원금
  unrealizedPnL?: number;         // 평가손익
  unrealizedPnLPct?: number;      // 평가손익률
  weight?: number;                // 포트 내 비중 (0~1)
};

export type PortfolioSummary = {
  portfolio: Portfolio;
  holdings: EnrichedHolding[];
  totalValue: number;             // KRW 환산 통합 평가액
  totalCost: number;              // KRW 환산 통합 원금
  totalPnL: number;
  totalPnLPct: number;
  currency: 'KRW';                // 통합 표시 통화
  fxRate: number;                 // USD/KRW (대략)
};

/** 사용자의 메인 포트폴리오 가져오기 (없으면 자동 생성) */
export async function getOrCreatePortfolio(userId: string): Promise<Portfolio | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .eq('name', '내 포트폴리오')
    .maybeSingle();
  if (existing) return existing as Portfolio;

  const { data, error } = await supabase
    .from('portfolios')
    .insert({ user_id: userId, name: '내 포트폴리오' })
    .select()
    .single();
  if (error || !data) return null;
  return data as Portfolio;
}

export async function fetchHoldings(portfolioId: string): Promise<Holding[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('portfolio_holdings')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('added_at', { ascending: false });
  return (data || []) as Holding[];
}

/** USD/KRW 환율 — Yahoo */
async function fetchUsdKrw(): Promise<number> {
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=5d',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 3600 } },
    );
    if (!r.ok) return 1350;
    const j = await r.json();
    const px = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return Number.isFinite(px) && px > 0 ? px : 1350;
  } catch { return 1350; }
}

export async function buildPortfolioSummary(
  portfolio: Portfolio,
  holdings: Holding[],
): Promise<PortfolioSummary> {
  if (holdings.length === 0) {
    return {
      portfolio,
      holdings: [],
      totalValue: 0,
      totalCost: 0,
      totalPnL: 0,
      totalPnLPct: 0,
      currency: 'KRW',
      fxRate: 1350,
    };
  }

  // 시세·환율 병렬
  const [quotes, fxRate] = await Promise.all([
    Promise.all(holdings.map(h => fetchQuote(h.symbol).catch(() => null))),
    fetchUsdKrw(),
  ]);

  let totalValue = 0;
  let totalCost = 0;

  const enriched: EnrichedHolding[] = holdings.map((h, i) => {
    const q = quotes[i] || undefined;
    const price = q?.price;
    const costPrice = h.avg_cost;
    const quantity = h.quantity;

    // KRW 환산
    const toKrw = (v: number | undefined, cur: 'KRW' | 'USD') => {
      if (v == null || !Number.isFinite(v)) return undefined;
      return cur === 'USD' ? v * fxRate : v;
    };

    const valueKrw = price != null ? toKrw(price * quantity, h.currency) : undefined;
    const costKrw = costPrice != null ? toKrw(costPrice * quantity, h.currency) : undefined;
    const pnl = valueKrw != null && costKrw != null ? valueKrw - costKrw : undefined;
    const pnlPct = pnl != null && costKrw && costKrw > 0 ? pnl / costKrw : undefined;

    if (valueKrw != null) totalValue += valueKrw;
    if (costKrw != null) totalCost += costKrw;

    return {
      ...h,
      quote: q || undefined,
      currentValue: valueKrw,
      costBasis: costKrw,
      unrealizedPnL: pnl,
      unrealizedPnLPct: pnlPct,
    };
  });

  // 비중 계산
  for (const eh of enriched) {
    if (eh.currentValue != null && totalValue > 0) {
      eh.weight = eh.currentValue / totalValue;
    }
  }
  // 평가액 내림차순
  enriched.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));

  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? totalPnL / totalCost : 0;

  return {
    portfolio,
    holdings: enriched,
    totalValue,
    totalCost,
    totalPnL,
    totalPnLPct,
    currency: 'KRW',
    fxRate,
  };
}

/**
 * 포트폴리오와 가장 비슷한 ETF Top N.
 *
 * Jaccard 유사도: |내 종목 ∩ ETF 종목| / |내 종목 ∪ ETF 종목|
 * 비중 가중 변형: 내 종목별 weight × ETF 내 그 종목 weight 의 곱 합산.
 *
 * 캐시(etf_holdings_cache) 통해 빠르게 계산.
 */
export type EtfMatch = {
  etfCode: string;
  etfSlug: string;
  etfName: string;
  etfShortName?: string;
  issuer?: string;
  similarity: number;        // 0~1
  sharedSymbols: number;     // 공통 종목 수
};

export async function findSimilarEtfs(
  holdings: Holding[],
  limit = 5,
): Promise<EtfMatch[]> {
  if (holdings.length === 0) return [];

  // 내 종목 정규화
  const mySymbols = new Set(holdings.map(h => normalizeSymbol(h.symbol)));

  // 내 종목을 담고 있는 ETF 후보 수집 (역방향 인덱스)
  const candidates = new Map<string, { sharedCount: number; etfRow?: any }>();
  for (const sym of mySymbols) {
    const rows = await findEtfsHoldingSymbol(sym, 30).catch(() => []);
    for (const r of rows) {
      const cur = candidates.get(r.etf_code) || { sharedCount: 0 };
      cur.sharedCount += 1;
      cur.etfRow = r;
      candidates.set(r.etf_code, cur);
    }
  }

  // 유사도 계산 (간이 Jaccard — 공통 / 내 종목 수)
  const matches: EtfMatch[] = [];
  for (const [etfCode, { sharedCount, etfRow }] of candidates) {
    if (sharedCount === 0) continue;
    const similarity = sharedCount / mySymbols.size;
    matches.push({
      etfCode,
      etfSlug: etfRow?.etfs?.slug || '',
      etfName: etfRow?.etfs?.name || etfCode,
      etfShortName: etfRow?.etfs?.short_name,
      issuer: etfRow?.etfs?.issuer,
      similarity,
      sharedSymbols: sharedCount,
    });
  }

  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/** 내 보유 종목들을 다룬 크리에이터 글 — 종목별로 모아서 중복 제거 */
export async function fetchPostsForHoldings(holdings: Holding[], limit = 10): Promise<PostWithCreator[]> {
  if (holdings.length === 0) return [];
  const seen = new Set<string>();
  const all: PostWithCreator[] = [];
  for (const h of holdings) {
    const posts = await fetchPostsBySymbol(h.symbol, 5).catch(() => []);
    for (const p of posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      all.push(p);
    }
  }
  return all
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, limit);
}
