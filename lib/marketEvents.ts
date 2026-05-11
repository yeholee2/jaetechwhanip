/**
 * ETF v2 — 증시 캘린더 helpers
 * docs/etf-portfolio-spec.md §4-2, migration_etf_v2.sql 참조.
 */
import { createClient, hasSupabase } from '@/lib/supabase/client';

export type MarketEventType =
  | 'fomc'
  | 'cpi'
  | 'gdp'
  | 'pmi'
  | 'rate_decision'
  | 'dividend_ex'
  | 'earnings'
  | 'etc';

export type MarketRegion = 'kr' | 'us' | 'global';
export type EventImportance = 'low' | 'medium' | 'high';

export type MarketEvent = {
  id: string;
  date: string; // 'YYYY-MM-DD'
  event_type: MarketEventType;
  title: string;
  description?: string | null;
  related_etf_code?: string | null;
  region: MarketRegion;
  importance: EventImportance;
  created_by?: string | null;
  created_at: string;
  deleted_at?: string | null;
};

const TABLE = 'market_events';

/** 기간 내 이벤트 조회 (date 오름차순). */
export async function listEvents(opts: {
  from?: string; // 'YYYY-MM-DD'
  to?: string;
  region?: MarketRegion | 'all';
  related_etf_code?: string;
}): Promise<MarketEvent[]> {
  if (!hasSupabase()) return [];
  const supabase = createClient();
  let q = supabase
    .from(TABLE)
    .select('*')
    .is('deleted_at', null)
    .order('date', { ascending: true });
  if (opts.from) q = q.gte('date', opts.from);
  if (opts.to) q = q.lte('date', opts.to);
  if (opts.region && opts.region !== 'all') q = q.eq('region', opts.region);
  if (opts.related_etf_code) q = q.eq('related_etf_code', opts.related_etf_code);
  const { data, error } = await q;
  if (error) return [];
  return (data || []) as MarketEvent[];
}

/** 특정 월 캘린더 (1일 ~ 말일). */
export async function listEventsByMonth(
  year: number,
  month: number, // 1-12
  region: MarketRegion | 'all' = 'all',
): Promise<MarketEvent[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return listEvents({ from, to, region });
}

/** 사용자 보유 ETF 관련 이벤트만 필터 (분배락 등). */
export async function listEventsForHoldings(etfCodes: string[]): Promise<MarketEvent[]> {
  if (etfCodes.length === 0) return [];
  if (!hasSupabase()) return [];
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .is('deleted_at', null)
    .in('related_etf_code', etfCodes)
    .gte('date', today)
    .order('date', { ascending: true });
  if (error) return [];
  return (data || []) as MarketEvent[];
}

/** 한국어 라벨 (UI 표시용). */
export const EVENT_TYPE_LABEL: Record<MarketEventType, string> = {
  fomc: 'FOMC',
  cpi: 'CPI',
  gdp: 'GDP',
  pmi: 'PMI',
  rate_decision: '금리 결정',
  dividend_ex: '분배락',
  earnings: '실적 발표',
  etc: '기타',
};

export const REGION_LABEL: Record<MarketRegion, string> = {
  kr: '한국',
  us: '미국',
  global: '글로벌',
};

/** 중요도별 색상 토큰 (CSS variable로 매핑). */
export function importanceColor(imp: EventImportance): string {
  switch (imp) {
    case 'high':
      return 'var(--primary)'; // 파란 강조
    case 'medium':
      return 'var(--t2)';
    case 'low':
      return 'var(--t3)';
  }
}
