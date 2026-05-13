'use client';

/**
 * 템플릿 따라하기 — 비로그인이면 /auth, 로그인이면 보유 추가 모달 진입.
 * 비중만 정의된 템플릿이라 사용자가 투자할 금액을 입력하면 ETF별 수량 환산해서 일괄 추가.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui';
import { addHolding } from '@/lib/etfPortfolio';
import { fetchEtfByCode } from '@/lib/etfsDb';
import { type PortfolioTemplate } from '@/lib/portfolioTemplates';

type Props = { template: PortfolioTemplate };

function parsePriceUSD(price?: string): number {
  if (!price) return 0;
  const m = price.replace(/[,$]/g, '').match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

export function ApplyTemplateButton({ template }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('1000');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    if (!hasSupabase()) {
      setOpen(true);
      return;
    }
    const supabase = createClient();
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.push(`/auth?next=/portfolio/templates/${template.slug}`);
      return;
    }
    setOpen(true);
  };

  const apply = async () => {
    setError('');
    const total = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(total) || total <= 0) {
      setError('금액을 입력해주세요 (단위: USD).');
      return;
    }
    setSubmitting(true);
    let added = 0;
    for (const a of template.allocations) {
      const dollarsForThis = total * a.weight;
      const etf = await fetchEtfByCode(a.ticker);
      const price = parsePriceUSD(etf?.price);
      if (!price) continue;
      const qty = +(dollarsForThis / price).toFixed(4);
      if (qty < 0.001) continue;
      const row = await addHolding({
        etf_code: a.ticker,
        etf_name: etf?.name || a.label,
        quantity: qty,
        avg_price: price,
        account_label: template.name,
      });
      if (row) added++;
    }
    setSubmitting(false);
    if (added === 0) {
      setError('등록에 실패했어요. 로그인 상태를 확인해주세요.');
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/portfolio'), 800);
  };

  return (
    <>
      <Button variant="primary" size="md" onClick={handleClick}>
        이 포트폴리오로 시작하기
      </Button>
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            style={{
              maxWidth: 440, width: '100%', background: 'var(--rw-card)',
              borderRadius: 'var(--rw-radius-lg)', padding: 'var(--space-5)',
              display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              {template.name} · 따라하기
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--rw-text-muted)', lineHeight: 1.55 }}>
              투자할 금액을 입력하면 비중대로 {template.allocations.length}개 ETF를 한 번에 추가해요.
              <br />
              (가격·환율 변동으로 실제 매수 시 약간의 오차 가능)
            </p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rw-text-strong)' }}>
                투자 금액 (USD)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={submitting || done}
                placeholder="예: 1000"
                style={{
                  padding: 12, fontSize: 16, fontWeight: 700,
                  border: '1px solid var(--rw-border)',
                  borderRadius: 'var(--rw-radius-sm)',
                  background: 'var(--rw-card)', color: 'var(--rw-text-strong)',
                }}
              />
            </label>
            {error && <p style={{ color: 'var(--rw-red60)', fontSize: 12, margin: 0 }}>{error}</p>}
            {done && <p style={{ color: 'var(--rw-green50)', fontSize: 13, margin: 0, fontWeight: 700 }}>
              ✓ 추가 완료! MY포트폴리오로 이동합니다.
            </p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
                취소
              </Button>
              <Button variant="primary" size="sm" onClick={apply} disabled={submitting || done}>
                {submitting ? '추가 중…' : done ? '완료' : '내 포트폴리오에 추가'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
