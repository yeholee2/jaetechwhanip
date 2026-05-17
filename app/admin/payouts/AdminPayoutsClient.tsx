'use client';

/**
 * 어드민 정산 관리 — 월별 자동 계산 + 상태 전환.
 *
 * 흐름:
 *  1. "이번 달 정산 계산" 버튼 → run_all_payouts() 호출
 *  2. 정산 목록 (pending/approved/paid/cancelled) 탭
 *  3. 각 row: 승인 → 지급 완료 → 메모
 */

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './AdminPayouts.module.css';

type Tab = 'pending' | 'approved' | 'paid' | 'cancelled' | 'all';

type Payout = {
  id: string;
  creator_id: string;
  period_start: string;
  period_end: string;
  gross_revenue_won: number;
  subscriber_count: number;
  platform_fee_rate: number;
  platform_fee_won: number;
  refund_won: number;
  net_payout_won: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  bank_name?: string | null;
  bank_account?: string | null;
  paid_at?: string | null;
  admin_note?: string | null;
  created_at: string;
  creators?: { slug?: string; display_name?: string; avatar_url?: string | null };
};

export function AdminPayoutsClient({ initialPayouts }: { initialPayouts: Payout[] }) {
  const [payouts, setPayouts] = useState(initialPayouts);
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, paid: 0, cancelled: 0 };
    for (const p of payouts) c[p.status as keyof typeof c]++;
    return c;
  }, [payouts]);

  const filtered = useMemo(() => {
    if (tab === 'all') return payouts;
    return payouts.filter(p => p.status === tab);
  }, [payouts, tab]);

  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };

  const runCalculation = async () => {
    if (pending) return;
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10);
    if (!confirm(`${periodStart} 기준 모든 크리에이터의 정산을 계산할까요?`)) return;
    setPending('all');
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('run_all_payouts', { p_period_start: periodStart });
      if (error) { alert(error.message); return; }
      const { data } = await supabase
        .from('creator_payouts')
        .select('*, creators:creator_id(slug, display_name, avatar_url)')
        .order('period_start', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);
      setPayouts((data || []) as Payout[]);
      showT('✓ 정산 계산 완료');
    } finally {
      setPending(null);
    }
  };

  const transition = async (payout: Payout, next: Payout['status']) => {
    if (pending) return;
    setPending(payout.id);
    try {
      const supabase = createClient();
      const patch: Partial<Payout> = { status: next };
      if (next === 'paid') (patch as any).paid_at = new Date().toISOString();
      const { error } = await supabase
        .from('creator_payouts')
        .update(patch)
        .eq('id', payout.id);
      if (error) { alert(error.message); return; }
      setPayouts(list => list.map(p => p.id === payout.id ? { ...p, ...patch } as Payout : p));
      showT(`✓ ${stateLabel(next)} 처리 완료`);
    } finally {
      setPending(null);
    }
  };

  const totalNet = useMemo(
    () => filtered.reduce((s, p) => s + p.net_payout_won, 0),
    [filtered],
  );

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1>정산 관리</h1>
          <p>월별 매출 집계 + 수수료 차감 + 지급 흐름.</p>
        </div>
        <button type="button" onClick={runCalculation} disabled={pending === 'all'} className={styles.runBtn}>
          {pending === 'all' ? '계산 중…' : '🔄 이번 달 정산 계산'}
        </button>
      </header>

      <nav className={styles.tabs}>
        {([
          { key: 'pending',   label: '대기' },
          { key: 'approved',  label: '승인' },
          { key: 'paid',      label: '지급 완료' },
          { key: 'cancelled', label: '취소' },
          { key: 'all',       label: '전체' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`${styles.tab} ${tab === t.key ? styles.tabOn : ''}`}
          >
            {t.label}
            {t.key !== 'all' && (
              <span className={styles.tabCount}>{counts[t.key as keyof typeof counts]}</span>
            )}
          </button>
        ))}
      </nav>

      <div className={styles.summary}>
        <span>합계 {filtered.length}건</span>
        <strong>지급액 {totalNet.toLocaleString()}원</strong>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {tab === 'pending'
            ? '대기 중인 정산이 없어요. 상단 "이번 달 정산 계산" 을 눌러보세요.'
            : '해당 상태의 정산이 없어요.'}
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(p => (
            <article key={p.id} className={styles.item}>
              <div className={styles.itemHead}>
                <div className={styles.itemCreator}>
                  <div className={styles.itemAvatar}>
                    {p.creators?.avatar_url && p.creators.avatar_url.length <= 4 ? (
                      <span>{p.creators.avatar_url}</span>
                    ) : p.creators?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.creators.avatar_url} alt="" />
                    ) : (
                      <span>{p.creators?.display_name?.[0] || '?'}</span>
                    )}
                  </div>
                  <div>
                    <strong>{p.creators?.display_name || p.creator_id.slice(0, 8)}</strong>
                    <span>{p.period_start.slice(0, 7)} 정산</span>
                  </div>
                </div>
                <span className={`${styles.status} ${styles[`status_${p.status}`]}`}>
                  {stateLabel(p.status)}
                </span>
              </div>

              <div className={styles.metrics}>
                <div>
                  <span>총 매출</span>
                  <strong>{p.gross_revenue_won.toLocaleString()}원</strong>
                </div>
                <div>
                  <span>수수료 ({p.platform_fee_rate}%)</span>
                  <strong>-{p.platform_fee_won.toLocaleString()}원</strong>
                </div>
                <div>
                  <span>환불</span>
                  <strong>{p.refund_won > 0 ? `-${p.refund_won.toLocaleString()}` : '0'}원</strong>
                </div>
                <div className={styles.metricNet}>
                  <span>지급액</span>
                  <strong>{p.net_payout_won.toLocaleString()}원</strong>
                </div>
                <div>
                  <span>구독자</span>
                  <strong>{p.subscriber_count}명</strong>
                </div>
              </div>

              {p.paid_at && (
                <div className={styles.paidNote}>
                  지급 완료 · {new Date(p.paid_at).toLocaleDateString('ko-KR')}
                </div>
              )}

              <div className={styles.actions}>
                {p.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => transition(p, 'approved')}
                      disabled={pending === p.id}
                      className={styles.btnApprove}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      onClick={() => transition(p, 'cancelled')}
                      disabled={pending === p.id}
                      className={styles.btnReject}
                    >
                      취소
                    </button>
                  </>
                )}
                {p.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => transition(p, 'paid')}
                    disabled={pending === p.id}
                    className={styles.btnApprove}
                  >
                    지급 완료 처리
                  </button>
                )}
                {(p.status === 'paid' || p.status === 'cancelled') && (
                  <button
                    type="button"
                    onClick={() => transition(p, 'pending')}
                    disabled={pending === p.id}
                    className={styles.btnSecondary}
                  >
                    대기로 되돌리기
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}

function stateLabel(s: Payout['status']): string {
  switch (s) {
    case 'pending':   return '대기';
    case 'approved':  return '승인';
    case 'paid':      return '지급 완료';
    case 'cancelled': return '취소';
  }
}
