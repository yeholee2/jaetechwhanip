/**
 * GET /api/alerts/check — Vercel Cron (every 10분).
 *
 * 동작:
 * 1. 활성 알림 모두 조회
 * 2. 대상 ETF의 최신 가격을 etfs 테이블에서 조회
 * 3. 조건 평가 → 통과한 alert에 대해 user_notifications 생성
 * 4. alert.last_triggered_at 갱신
 *
 * 인증: Authorization: Bearer {CRON_SECRET}
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type Alert = {
  id: string;
  user_id: string;
  etf_code: string;
  etf_name: string;
  condition: 'price_above' | 'price_below' | 'change_above_pct' | 'change_below_pct';
  threshold: number;
  active: boolean;
  last_triggered_at: string | null;
};

function parsePriceNum(price: string | null): number {
  if (!price) return 0;
  const m = price.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function parseChangePct(change: string | null, tone: string | null): number {
  if (!change) return 0;
  const m = change.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  const v = m ? parseFloat(m[0]) : 0;
  return tone === 'down' ? -Math.abs(v) : Math.abs(v);
}

function evaluate(alert: Alert, price: number, changePct: number): boolean {
  switch (alert.condition) {
    case 'price_above':       return price > alert.threshold;
    case 'price_below':       return price < alert.threshold;
    case 'change_above_pct':  return changePct > alert.threshold;
    case 'change_below_pct':  return changePct < alert.threshold;
  }
}

function buildNotification(alert: Alert, price: number, changePct: number) {
  const cond = alert.condition;
  let title = '';
  let body = '';
  const priceStr = price.toLocaleString('ko-KR');
  if (cond === 'price_above') {
    title = `${alert.etf_name} 가격 상승 알림`;
    body = `현재가 ${priceStr}원이 알림가 ${alert.threshold.toLocaleString('ko-KR')}원을 넘었어요.`;
  } else if (cond === 'price_below') {
    title = `${alert.etf_name} 가격 하락 알림`;
    body = `현재가 ${priceStr}원이 알림가 ${alert.threshold.toLocaleString('ko-KR')}원 아래로 내려왔어요.`;
  } else if (cond === 'change_above_pct') {
    title = `${alert.etf_name} 급등 알림`;
    body = `당일 등락률 ${changePct.toFixed(2)}% — 알림 기준 ${alert.threshold}% 이상이에요.`;
  } else {
    title = `${alert.etf_name} 급락 알림`;
    body = `당일 등락률 ${changePct.toFixed(2)}% — 알림 기준 ${alert.threshold}% 이하예요.`;
  }
  return { title, body };
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'supabase admin unavailable' }, { status: 500 });
  }

  // 1) 활성 알림 전부 조회
  const { data: alerts, error: alertErr } = await admin
    .from('etf_alerts')
    .select('*')
    .eq('active', true);
  if (alertErr) {
    return NextResponse.json({ error: 'alerts fetch failed', detail: alertErr.message }, { status: 500 });
  }
  const alertList = (alerts || []) as Alert[];
  if (alertList.length === 0) {
    return NextResponse.json({ checked: 0, triggered: 0 });
  }

  // 2) 대상 ETF 코드 unique 추출 + 시세 batch fetch
  const uniqueCodes = Array.from(new Set(alertList.map(a => a.etf_code)));
  const { data: etfs } = await admin
    .from('etfs')
    .select('code, price, change, change_tone')
    .in('code', uniqueCodes);
  const priceMap = new Map<string, { price: number; changePct: number }>();
  for (const e of etfs || []) {
    priceMap.set(e.code, {
      price: parsePriceNum(e.price),
      changePct: parseChangePct(e.change, e.change_tone),
    });
  }

  // 3) 평가 + 알림 생성
  const COOLDOWN_MS = 60 * 60 * 1000; // 같은 alert 1시간 내 중복 발사 X
  const now = Date.now();
  const newNotifications: any[] = [];
  const alertsToUpdate: string[] = [];

  for (const a of alertList) {
    const q = priceMap.get(a.etf_code);
    if (!q || !q.price) continue;
    // cooldown
    if (a.last_triggered_at) {
      const last = new Date(a.last_triggered_at).getTime();
      if (now - last < COOLDOWN_MS) continue;
    }
    if (!evaluate(a, q.price, q.changePct)) continue;
    const { title, body } = buildNotification(a, q.price, q.changePct);
    newNotifications.push({
      user_id: a.user_id,
      kind: 'alert',
      title,
      body,
      link: `/etf/${encodeURIComponent(a.etf_code)}`,
      etf_code: a.etf_code,
      alert_id: a.id,
    });
    alertsToUpdate.push(a.id);
  }

  if (newNotifications.length > 0) {
    const { error: insErr } = await admin.from('user_notifications').insert(newNotifications);
    if (insErr) {
      return NextResponse.json({ error: 'insert failed', detail: insErr.message }, { status: 500 });
    }
    // last_triggered_at 갱신
    await admin
      .from('etf_alerts')
      .update({ last_triggered_at: new Date().toISOString() })
      .in('id', alertsToUpdate);
  }

  return NextResponse.json({
    checked: alertList.length,
    triggered: newNotifications.length,
  });
}
