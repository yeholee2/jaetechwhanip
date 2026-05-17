'use client';

/**
 * 결제 페이지 — 팬딩 톤.
 *
 * - 주문 요약 (크리에이터 + 플랜)
 * - 결제 수단 (카드 간편 결제 / 일반 결제 — 베타: 무료 등록만)
 * - 결제 금액
 * - 결제하기 → creator_subscriptions 행 생성 (status=active)
 *
 * 실제 결제는 사업자 등록 후 토스페이먼츠/카카오페이 연결 예정.
 * 베타 기간: 무료 등록만 (결제 시뮬레이션) — 추후 결제 webhook 으로 전환.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Creator } from '@/lib/creator';
import styles from './Checkout.module.css';

type Method = 'card' | 'kakao' | 'free';

export function CheckoutClient({
  creator,
  userId,
  plan,
}: {
  creator: Creator;
  userId: string;
  plan: 'monthly' | 'yearly';
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('free');
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState('');

  const monthly = creator.membership_price_won || 0;
  const yearlyTotal = Math.round(monthly * 12 * 0.85);
  const total = plan === 'monthly' ? monthly : yearlyTotal;
  const periodLabel = plan === 'monthly' ? '/ 1개월' : '/ 1년';

  const submit = async () => {
    setErr('');
    setProcessing(true);
    try {
      const supabase = createClient();
      // 베타 — 모든 결제는 free trial 로 처리. 실제 결제 연결 후 webhook 으로 status 전환.
      const periodEnd = new Date();
      if (plan === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      const { error } = await supabase.from('creator_subscriptions').insert({
        user_id: userId,
        creator_id: creator.id,
        status: 'active',
        plan,
        price_won: total,
        period_started_at: new Date().toISOString(),
        period_ends_at: periodEnd.toISOString(),
        is_beta_free: method === 'free',
      });
      if (error) {
        setErr(error.message);
        return;
      }
      router.push(`/creator/${creator.slug}?subscribed=1`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <Link href={`/creator/${creator.slug}/subscribe`} className={styles.back}>← 이용권 선택</Link>
        <h1>결제</h1>
      </header>

      {/* 주문 요약 */}
      <section className={styles.card}>
        <h2>주문 요약</h2>
        <div className={styles.summary}>
          <div className={styles.summaryAvatar}>
            {creator.avatar_url && creator.avatar_url.length <= 4 ? (
              <span>{creator.avatar_url}</span>
            ) : creator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar_url} alt={creator.display_name} />
            ) : (
              <span>{creator.display_name.slice(0, 1)}</span>
            )}
          </div>
          <div>
            <strong>{creator.display_name}</strong>
            <span>재프콘 채널</span>
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.summaryItem}>
          <div className={styles.summaryItemCover}>
            <span>{plan === 'yearly' ? '🎁' : '📅'}</span>
          </div>
          <div>
            <strong>{creator.display_name} 멤버십 — {plan === 'monthly' ? '월간' : '연간'} 회원</strong>
            <div className={styles.summaryPrice}>
              <span>{total.toLocaleString()}</span> 원 {periodLabel}
            </div>
          </div>
        </div>
      </section>

      {/* 결제 수단 */}
      <section className={styles.card}>
        <h2>결제 수단</h2>
        <div className={styles.methods}>
          <MethodRow
            label="🎁 베타 무료 등록"
            value="free"
            current={method}
            onChange={setMethod}
            note="결제 시스템 연결 전까지 무료로 멤버 권한 부여"
          />
          <MethodRow
            label="💳 카드 간편 결제"
            value="card"
            current={method}
            onChange={setMethod}
            note="토스페이먼츠 연결 — 곧 오픈"
            disabled
          />
          <MethodRow
            label="🟡 카카오페이"
            value="kakao"
            current={method}
            onChange={setMethod}
            note="곧 오픈"
            disabled
          />
        </div>
      </section>

      {/* 결제 금액 */}
      <section className={styles.card}>
        <h2>결제 금액</h2>
        <div className={styles.amountRow}>
          <span>{plan === 'monthly' ? '월간 구독료' : '연간 구독료'}</span>
          <strong>{total.toLocaleString()} 원</strong>
        </div>
        {plan === 'yearly' && (
          <div className={styles.amountSaving}>
            <span>연간 할인</span>
            <strong>-{(monthly * 12 - yearlyTotal).toLocaleString()} 원</strong>
          </div>
        )}
        <div className={styles.amountTotal}>
          <span>총 결제 금액</span>
          <strong>{method === 'free' ? '0' : total.toLocaleString()} 원</strong>
        </div>
        {method === 'free' && (
          <p className={styles.betaNote}>
            ※ 베타 기간 동안 무료로 멤버 권한이 부여돼요. 추후 결제 시스템 연결 시 안내드릴게요.
          </p>
        )}
      </section>

      {err && <div className={styles.error}>{err}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={processing}
        className={styles.payBtn}
      >
        {processing ? '처리 중…' : (method === 'free' ? '베타 무료 멤버 시작하기' : `${total.toLocaleString()} 원 결제하기`)}
      </button>

      <p className={styles.disclaimer}>
        멤버십은 언제든 마이 → 구독 관리에서 해지할 수 있어요.
        결제 시스템(토스페이먼츠·카카오페이) 정식 연결은 사업자 등록 후 오픈됩니다.
      </p>
    </main>
  );
}

function MethodRow({
  label,
  value,
  current,
  onChange,
  note,
  disabled,
}: {
  label: string;
  value: Method;
  current: Method;
  onChange: (m: Method) => void;
  note?: string;
  disabled?: boolean;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(value)}
      disabled={disabled}
      className={`${styles.method} ${active ? styles.methodOn : ''} ${disabled ? styles.methodDisabled : ''}`}
    >
      <span className={styles.methodRadio}>
        <span className={styles.methodRadioDot} />
      </span>
      <div className={styles.methodInfo}>
        <strong>{label}</strong>
        {note && <span>{note}</span>}
      </div>
    </button>
  );
}
