'use client';

/**
 * 멤버십 선택 페이지 — 네프콘 톤.
 *
 * 단일 가격 (월간) — 추가로 연간 할인 옵션 선택 가능.
 * 선택 시 결제 페이지(/checkout) 로 이동.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Creator } from '@/lib/creator';
import styles from './Subscribe.module.css';

type Plan = 'monthly' | 'yearly';

export function SubscribeClient({ creator, userId }: { creator: Creator; userId: string | null }) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>('monthly');

  const monthly = creator.membership_price_won || 0;
  const yearlyTotal = Math.round(monthly * 12 * 0.85);  // 15% 연간 할인
  const yearlyMonthly = Math.round(yearlyTotal / 12);
  const perks = (creator.membership_perks || '').split('\n').map(p => p.trim()).filter(Boolean);

  const proceed = () => {
    if (!userId) {
      router.push(`/auth?next=/creator/${creator.slug}/subscribe`);
      return;
    }
    router.push(`/creator/${creator.slug}/checkout?plan=${plan}`);
  };

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <Link href={`/creator/${creator.slug}`} className={styles.back}>← {creator.display_name}</Link>
        <h1>이용권 선택</h1>
      </header>

      <div className={styles.layout}>
        {/* 좌측: 채널 소개 */}
        <aside className={styles.side}>
          <div className={styles.sideAvatar}>
            {creator.avatar_url && creator.avatar_url.length <= 4 ? (
              <span>{creator.avatar_url}</span>
            ) : creator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar_url} alt={creator.display_name} />
            ) : (
              <span>{creator.display_name.slice(0, 1)}</span>
            )}
          </div>
          <h2 className={styles.sideName}>{creator.display_name}</h2>
          <div className={styles.divider} />
          <div className={styles.sideSection}>
            <h3>채널 소개</h3>
            <p>{creator.bio || '재테크 콘텐츠 채널입니다.'}</p>
            <p className={styles.sidePremium}>재프콘 채널입니다.</p>
          </div>
          {perks.length > 0 && (
            <div className={styles.sideSection}>
              <h3>멤버 혜택</h3>
              <ul>
                {perks.map((p, i) => <li key={i}>· {p}</li>)}
              </ul>
            </div>
          )}
        </aside>

        {/* 우측: 플랜 선택 */}
        <section className={styles.plans}>
          <button
            type="button"
            onClick={() => setPlan('monthly')}
            className={`${styles.planCard} ${plan === 'monthly' ? styles.planCardOn : ''}`}
          >
            <span className={styles.planLabel}>📅 월간</span>
            <strong className={styles.planTitle}>월간 구독권</strong>
            <div className={styles.planPriceRow}>
              <span className={styles.planPrice}>{monthly.toLocaleString()}</span>
              <span className={styles.planUnit}>원/월</span>
            </div>
            <div className={styles.planBenefits}>
              <span className={styles.planBenefitLabel}>혜택</span>
              <span>구독 상품 콘텐츠 무제한 열람</span>
            </div>
            <span className={styles.planBadge}>월간 구독권</span>
          </button>

          <button
            type="button"
            onClick={() => setPlan('yearly')}
            className={`${styles.planCard} ${styles.planCardYearly} ${plan === 'yearly' ? styles.planCardOn : ''}`}
          >
            <span className={styles.planLabel}>🎁 연간 (15% 할인)</span>
            <strong className={styles.planTitle}>연간 구독권</strong>
            <div className={styles.planPriceRow}>
              <span className={styles.planPrice}>{yearlyTotal.toLocaleString()}</span>
              <span className={styles.planUnit}>원/년</span>
            </div>
            <div className={styles.planSaving}>
              월 {yearlyMonthly.toLocaleString()}원 꼴 · 1년 {(monthly * 12 - yearlyTotal).toLocaleString()}원 절약
            </div>
            <div className={styles.planBenefits}>
              <span className={styles.planBenefitLabel}>혜택</span>
              <span>구독 상품 콘텐츠 무제한 열람</span>
            </div>
            <span className={`${styles.planBadge} ${styles.planBadgeYearly}`}>연간 구독권</span>
          </button>

          <button type="button" onClick={proceed} className={styles.proceedBtn}>
            선택하기
          </button>
        </section>
      </div>

      <footer className={styles.legalFooter}>
        <span>판매자 상호명 (주)재테크한입 · 대표자 이예호 · 사업자번호 준비중</span>
      </footer>
    </main>
  );
}
