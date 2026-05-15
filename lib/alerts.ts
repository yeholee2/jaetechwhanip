/**
 * ETF 가격 알림 + 사용자 알림함 (in-app only, no email).
 *
 * 사용자 본인 알림만 RLS로 보호. createClient (browser).
 * Cron / server-side는 createAdminClient 별도 사용.
 */

import { createClient, hasSupabase } from '@/lib/supabase/client';

export type AlertCondition = 'price_above' | 'price_below' | 'change_above_pct' | 'change_below_pct';

export type EtfAlert = {
  id: string;
  user_id: string;
  etf_code: string;
  etf_name: string;
  condition: AlertCondition;
  threshold: number;
  active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserNotification = {
  id: string;
  user_id: string;
  kind: 'alert' | 'system';
  title: string;
  body: string | null;
  link: string | null;
  etf_code: string | null;
  alert_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type AlertInput = {
  etf_code: string;
  etf_name: string;
  condition: AlertCondition;
  threshold: number;
};

export const CONDITION_LABEL: Record<AlertCondition, string> = {
  price_above: '가격이 다음 위로',
  price_below: '가격이 다음 아래로',
  change_above_pct: '일일 등락률이 다음 % 이상',
  change_below_pct: '일일 등락률이 다음 % 이하',
};

/* ─────────────────── alerts ─────────────────── */

export async function listMyAlerts(): Promise<EtfAlert[]> {
  if (!hasSupabase()) return [];
  const supabase = createClient();
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return [];
  const { data, error } = await supabase
    .from('etf_alerts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as EtfAlert[];
}

export async function createAlert(input: AlertInput): Promise<EtfAlert | null> {
  if (!hasSupabase()) return null;
  const supabase = createClient();
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('etf_alerts')
    .insert({
      user_id: userId,
      etf_code: input.etf_code,
      etf_name: input.etf_name,
      condition: input.condition,
      threshold: input.threshold,
    })
    .select()
    .single();
  if (error) return null;
  return data as EtfAlert;
}

export async function deleteAlert(id: string): Promise<boolean> {
  if (!hasSupabase()) return false;
  const supabase = createClient();
  const { error } = await supabase.from('etf_alerts').delete().eq('id', id);
  return !error;
}

export async function toggleAlert(id: string, active: boolean): Promise<boolean> {
  if (!hasSupabase()) return false;
  const supabase = createClient();
  const { error } = await supabase.from('etf_alerts').update({ active }).eq('id', id);
  return !error;
}

/* ─────────────────── notifications ─────────────────── */

export async function listMyNotifications(limit = 20): Promise<UserNotification[]> {
  if (!hasSupabase()) return [];
  const supabase = createClient();
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return [];
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as UserNotification[];
}

export async function countUnread(): Promise<number> {
  if (!hasSupabase()) return 0;
  const supabase = createClient();
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return 0;
  const { count, error } = await supabase
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) return 0;
  return count || 0;
}

export async function markAsRead(id: string): Promise<boolean> {
  if (!hasSupabase()) return false;
  const supabase = createClient();
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function markAllRead(): Promise<boolean> {
  if (!hasSupabase()) return false;
  const supabase = createClient();
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  return !error;
}

/** 다른 사용자에게 시스템 알림 발송 (Q&A 답변/채택/멘션 등) */
export async function notifyUser(input: {
  userId: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<boolean> {
  if (!hasSupabase()) return false;
  if (!input.userId) return false;
  const supabase = createClient();
  const { error } = await supabase.from('user_notifications').insert({
    user_id: input.userId,
    kind: 'system',
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });
  return !error;
}
