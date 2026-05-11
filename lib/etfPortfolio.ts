/**
 * ETF v2 — 사용자 수동 포트폴리오 helpers
 *
 * docs/etf-portfolio-spec.md §3, migration_etf_v2.sql 참조.
 * 마이그레이션 미적용 시에도 안전하게 빈 배열 반환.
 */
import { createClient, hasSupabase } from '@/lib/supabase/client';

export type UserEtfHolding = {
  id: string;
  user_id: string;
  etf_code: string;
  etf_name: string;
  quantity: number;
  avg_price: number;
  account_label: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type HoldingInput = {
  etf_code: string;
  etf_name: string;
  quantity: number;
  avg_price: number;
  account_label?: string;
};

/** 시세를 곱해 만든 표시용 row */
export type HoldingDisplay = UserEtfHolding & {
  current_price: number | null;
  market_value: number | null;
  cost_basis: number;
  pnl: number | null;
  pnl_pct: number | null;
};

const TABLE = 'etf_holdings';

/**
 * 본인 보유 ETF 전체 조회 (deleted_at 제외)
 * 미인증 또는 supabase 미설정 시 빈 배열.
 */
export async function listMyHoldings(): Promise<UserEtfHolding[]> {
  if (!hasSupabase()) return [];
  const supabase = createClient();
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as UserEtfHolding[];
}

/** 보유 추가 */
export async function addHolding(input: HoldingInput): Promise<UserEtfHolding | null> {
  if (!hasSupabase()) return null;
  const supabase = createClient();
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      etf_code: input.etf_code,
      etf_name: input.etf_name,
      quantity: input.quantity,
      avg_price: input.avg_price,
      account_label: input.account_label || '일반',
    })
    .select()
    .single();
  if (error) return null;
  return data as UserEtfHolding;
}

/** 보유 수정 (수량·평단·계좌라벨만) */
export async function updateHolding(
  id: string,
  patch: Partial<Pick<HoldingInput, 'quantity' | 'avg_price' | 'account_label'>>,
): Promise<UserEtfHolding | null> {
  if (!hasSupabase()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) return null;
  return data as UserEtfHolding;
}

/** 보유 삭제 (soft delete) */
export async function deleteHolding(id: string): Promise<boolean> {
  if (!hasSupabase()) return false;
  const supabase = createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

/**
 * 보유 종목 × 시세 데이터를 합쳐 표시용 행 생성.
 * priceMap에 없는 종목은 current_price/market_value/pnl을 null로 둠 (UI에서 "—" 표기).
 */
export function buildHoldingDisplays(
  holdings: UserEtfHolding[],
  priceMap: Record<string, number>,
): HoldingDisplay[] {
  return holdings.map(h => {
    const current = priceMap[h.etf_code] ?? null;
    const cost = h.quantity * h.avg_price;
    if (current == null) {
      return {
        ...h,
        current_price: null,
        market_value: null,
        cost_basis: cost,
        pnl: null,
        pnl_pct: null,
      };
    }
    const mv = h.quantity * current;
    return {
      ...h,
      current_price: current,
      market_value: mv,
      cost_basis: cost,
      pnl: mv - cost,
      pnl_pct: cost > 0 ? (mv - cost) / cost : 0,
    };
  });
}

/**
 * 합계 + 비중 계산.
 * priceMap 없는 종목은 cost_basis 기준으로 비중을 잡아 0이 되지 않도록 처리.
 */
export type PortfolioSummary = {
  total_cost: number;
  total_market_value: number;
  total_pnl: number;
  total_pnl_pct: number;
  count: number;
  has_unknown_price: boolean;
};

export function summarizePortfolio(displays: HoldingDisplay[]): PortfolioSummary {
  if (displays.length === 0) {
    return {
      total_cost: 0,
      total_market_value: 0,
      total_pnl: 0,
      total_pnl_pct: 0,
      count: 0,
      has_unknown_price: false,
    };
  }
  let cost = 0;
  let mv = 0;
  let hasUnknown = false;
  displays.forEach(d => {
    cost += d.cost_basis;
    if (d.market_value == null) {
      mv += d.cost_basis;
      hasUnknown = true;
    } else {
      mv += d.market_value;
    }
  });
  return {
    total_cost: cost,
    total_market_value: mv,
    total_pnl: mv - cost,
    total_pnl_pct: cost > 0 ? (mv - cost) / cost : 0,
    count: displays.length,
    has_unknown_price: hasUnknown,
  };
}

/**
 * 비중 슬라이스 (그룹 키별).
 * by='etf' → 종목별, by='account' → 계좌별.
 */
export type AllocationSlice = {
  key: string;
  label: string;
  value: number;
  weight: number;
};

export function buildAllocation(
  displays: HoldingDisplay[],
  by: 'etf' | 'account' = 'etf',
): AllocationSlice[] {
  const summary = summarizePortfolio(displays);
  if (summary.total_market_value <= 0) return [];
  const grouped = new Map<string, { label: string; value: number }>();
  displays.forEach(d => {
    const key = by === 'etf' ? d.etf_code : d.account_label || '일반';
    const label = by === 'etf' ? d.etf_name : d.account_label || '일반';
    const value = d.market_value ?? d.cost_basis;
    const prev = grouped.get(key);
    if (prev) {
      prev.value += value;
    } else {
      grouped.set(key, { label, value });
    }
  });
  const slices: AllocationSlice[] = [];
  grouped.forEach((v, key) => {
    slices.push({
      key,
      label: v.label,
      value: v.value,
      weight: v.value / summary.total_market_value,
    });
  });
  return slices.sort((a, b) => b.value - a.value);
}
