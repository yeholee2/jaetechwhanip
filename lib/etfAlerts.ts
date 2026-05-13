/**
 * ETF v2 — 가격 알림 helpers
 * docs/etf-portfolio-spec.md §4, migration_etf_v2.sql 참조.
 */
import { createClient, hasSupabase } from '@/lib/supabase/client';

export type AlertType = 'target_price' | 'change_pct';
export type AlertDirection = 'above' | 'below';

export type EtfPriceAlert = {
  id: string;
  user_id: string;
  etf_code: string;
  etf_name: string;
  alert_type: AlertType;
  threshold: number;
  direction: AlertDirection | null;
  is_active: boolean;
  triggered_at?: string | null;
  triggered_price?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type AlertInput = {
  etf_code: string;
  etf_name: string;
  alert_type: AlertType;
  threshold: number;
  direction?: AlertDirection;
};

const TABLE = 'etf_price_alerts';

export async function listMyAlerts(): Promise<EtfPriceAlert[]> {
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
  return (data || []) as EtfPriceAlert[];
}

export async function addAlert(input: AlertInput): Promise<EtfPriceAlert | null> {
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
      alert_type: input.alert_type,
      threshold: input.threshold,
      direction: input.alert_type === 'target_price' ? input.direction || 'above' : null,
      is_active: true,
    })
    .select()
    .single();
  if (error) return null;
  return data as EtfPriceAlert;
}

export async function toggleAlert(id: string, is_active: boolean): Promise<boolean> {
  if (!hasSupabase()) return false;
  const supabase = createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ is_active })
    .eq('id', id);
  return !error;
}

export async function deleteAlert(id: string): Promise<boolean> {
  if (!hasSupabase()) return false;
  const supabase = createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

/**
 * 알림이 발동되어야 하는지 판정.
 * - target_price/above: 현재가 ≥ threshold 시 발동
 * - target_price/below: 현재가 ≤ threshold 시 발동
 * - change_pct: |일간변동률| ≥ threshold 시 발동 (threshold는 0.05 = 5%)
 */
export function shouldTrigger(
  alert: EtfPriceAlert,
  current_price: number,
  change_pct?: number,
): boolean {
  if (!alert.is_active || alert.triggered_at) return false;
  if (alert.alert_type === 'target_price') {
    if (alert.direction === 'above') return current_price >= alert.threshold;
    if (alert.direction === 'below') return current_price <= alert.threshold;
  }
  if (alert.alert_type === 'change_pct' && change_pct != null) {
    return Math.abs(change_pct) >= alert.threshold;
  }
  return false;
}

/** 알림 사람이 보기 좋게 한 줄로 */
export function describeAlert(alert: EtfPriceAlert): string {
  if (alert.alert_type === 'target_price') {
    const arrow = alert.direction === 'above' ? '↑' : '↓';
    return `목표가 ${arrow} ${alert.threshold.toLocaleString()}원`;
  }
  return `급등락 ±${(alert.threshold * 100).toFixed(1)}%`;
}
