'use client';

/**
 * 템플릿 따라하기 — 미국 상장 / 국내 상장 토글 + 일괄 매수.
 *
 * 흐름:
 * 1) "이 포트폴리오로 시작" 버튼 클릭
 * 2) 비로그인 → /auth (next 리턴)
 * 3) 모달:
 *    - 시장 선택 (🇺🇸 미국 상장 / 🇰🇷 국내 상장 — 일부 대체 종목 없으면 자동 disable)
 *    - 투자 금액 입력 (USD 또는 KRW)
 *    - 미리보기: 종목별 수량 환산
 *    - "내 포트폴리오에 추가" → 일괄 등록
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui';
import { addHolding } from '@/lib/etfPortfolio';
import { fetchEtfByCode } from '@/lib/etfsDb';
import { type PortfolioTemplate } from '@/lib/portfolioTemplates';

type Props = { template: PortfolioTemplate };
type Market = 'us' | 'kr';

function parseNumeric(price?: string): number {
  if (!price) return 0;
  const m = price.replace(/[,$₩원]/g, '').match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

export function ApplyTemplateButton({ template }: Props) {
  const [open, setOpen] = useState(false);
  const [market, setMarket] = useState<Market>('us');
  const [amount, setAmount] = useState('1000');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [previews, setPreviews] = useState<Array<{ code: string; name: string; price: number; weight: number; qty: number }>>([]);
  const router = useRouter();

  // 국내 상장 가능 여부 — 모든 allocations가 krAlternative를 갖고 있어야 함
  const krAvailable = useMemo(
    () => template.allocations.every(a => !!a.krAlternative),
    [template.allocations],
  );

  // 시장 변경 시 amount 단위도 자동 변경
  useEffect(() => {
    setAmount(market === 'us' ? '1000' : '1000000');
  }, [market]);

  // 미리보기 — 시장·금액 기반 종목별 수량 환산
  useEffect(() => {
    if (!open) return;
    const total = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(total) || total <= 0) {
      setPreviews([]);
      return;
    }
    (async () => {
      const list = [] as typeof previews;
      for (const a of template.allocations) {
        const code = market === 'us' ? a.ticker : a.krAlternative!.code;
        const name = market === 'us' ? a.label : a.krAlternative!.name;
        const etf = await fetchEtfByCode(code);
        const price = parseNumeric(etf?.price);
        const allocAmount = total * a.weight;
        const qty = price > 0 ? +(allocAmount / price).toFixed(market === 'us' ? 4 : 2) : 0;
        list.push({ code, name, price, weight: a.weight, qty });
      }
      setPreviews(list);
    })();
  }, [open, market, amount, template.allocations]);

  const handleClick = async () => {
    if (!hasSupabase()) { setOpen(true); return; }
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
    if (previews.length === 0) {
      setError('금액을 다시 입력해주세요.');
      return;
    }
    setSubmitting(true);
    let added = 0;
    for (const p of previews) {
      if (p.qty < 0.001 || p.price <= 0) continue;
      const row = await addHolding({
        etf_code: p.code,
        etf_name: p.name,
        quantity: p.qty,
        avg_price: p.price,
        account_label: `${template.name} (${market === 'us' ? '미국' : '국내'})`,
      });
      if (row) added++;
    }
    setSubmitting(false);
    if (added === 0) {
      setError('등록에 실패했어요. 로그인 상태와 종목 시세를 확인해주세요.');
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/portfolio'), 900);
  };

  const currencySymbol = market === 'us' ? '$' : '₩';
  const totalPreview = previews.reduce((s, p) => s + p.qty * p.price, 0);

  return (
    <>
      <Button variant="primary" size="md" onClick={handleClick}>
        이 포트폴리오로 시작하기
      </Button>
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            style={{
              maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto',
              background: 'var(--rw-card)',
              borderRadius: 'var(--rw-radius-lg)',
              padding: 'var(--space-5)',
              display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              {template.name} · 따라하기
            </h3>

            {/* 시장 토글 */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rw-text-strong)', marginBottom: 6 }}>
                어느 시장에서 매수할까요?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setMarket('us')}
                  disabled={submitting}
                  style={{
                    padding: '10px 12px',
                    border: `1.5px solid ${market === 'us' ? 'var(--rw-primary)' : 'transparent'}`,
                    background: market === 'us' ? 'var(--rw-card)' : 'var(--rw-card-muted)',
                    borderRadius: 'var(--rw-radius-sm)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left',
                    color: 'var(--rw-text-strong)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900 }}>🇺🇸 미국 상장</div>
                  <div style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 600, marginTop: 2 }}>
                    원본 티커, USD 결제
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => krAvailable && setMarket('kr')}
                  disabled={!krAvailable || submitting}
                  style={{
                    padding: '10px 12px',
                    border: `1.5px solid ${market === 'kr' ? 'var(--rw-primary)' : 'transparent'}`,
                    background: market === 'kr' ? 'var(--rw-card)' : 'var(--rw-card-muted)',
                    borderRadius: 'var(--rw-radius-sm)',
                    cursor: krAvailable ? 'pointer' : 'not-allowed',
                    opacity: krAvailable ? 1 : 0.5,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    color: 'var(--rw-text-strong)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900 }}>🇰🇷 국내 상장</div>
                  <div style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 600, marginTop: 2 }}>
                    {krAvailable ? '환전 없음, 원화 결제' : '대체 ETF가 부족해요'}
                  </div>
                </button>
              </div>
            </div>

            {/* 금액 입력 */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rw-text-strong)' }}>
                투자 금액 ({market === 'us' ? 'USD' : 'KRW'})
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={submitting || done}
                placeholder={market === 'us' ? '예: 1000' : '예: 1,000,000'}
                style={{
                  padding: 12, fontSize: 16, fontWeight: 700,
                  border: '1px solid var(--rw-border)',
                  borderRadius: 'var(--rw-radius-sm)',
                  background: 'var(--rw-card)', color: 'var(--rw-text-strong)',
                }}
              />
            </label>

            {/* 미리보기 */}
            {previews.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rw-text-muted)', marginBottom: 4 }}>
                  매수 미리보기
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {previews.map(p => (
                    <li key={p.code} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 8,
                      padding: '8px 12px',
                      background: 'var(--rw-card-muted)',
                      borderRadius: 'var(--rw-radius-sm)',
                      fontSize: 12,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ color: 'var(--rw-text-strong)', fontWeight: 900, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </strong>
                        <span style={{ color: 'var(--rw-text-muted)', fontSize: 11, fontWeight: 600 }}>
                          {p.code} · 비중 {(p.weight * 100).toFixed(0)}% · 단가 {currencySymbol}{p.price.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontWeight: 900, color: 'var(--rw-text-strong)', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                        {p.qty.toLocaleString()}주
                      </div>
                    </li>
                  ))}
                </ul>
                <div style={{
                  marginTop: 6, padding: '8px 12px',
                  fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 600,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>합계 (현재가 기준)</span>
                  <strong style={{ color: 'var(--rw-text-strong)', fontWeight: 900 }}>
                    {currencySymbol}{Math.round(totalPreview).toLocaleString()}
                  </strong>
                </div>
              </div>
            )}

            {error && <p style={{ color: 'var(--rw-red60)', fontSize: 12, margin: 0 }}>{error}</p>}
            {done && <p style={{ color: 'var(--rw-green50)', fontSize: 13, margin: 0, fontWeight: 700 }}>
              ✓ 추가 완료! MY포트폴리오로 이동합니다.
            </p>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
                취소
              </Button>
              <Button variant="primary" size="sm" onClick={apply} disabled={submitting || done || previews.length === 0}>
                {submitting ? '추가 중…' : done ? '완료' : `${previews.length}개 종목 추가`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
