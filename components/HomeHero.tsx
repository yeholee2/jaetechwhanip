/**
 * 홈 hero — 비로그인 정체성 + 로그인 환영.
 *
 * 메시지 디자인:
 * 비로그인: "ETF로 한입씩, 한국 사람을 위한 ETF 사전 + 진단"
 *          + 핵심 시그널 (1,066 ETF · 국내 + 미국 · 진단 무료)
 *          + 둘러보기 CTA
 *
 * 로그인:   "OO님, 오늘 한입 어떠세요?" + 진단 진입
 */

'use client';

import Link from 'next/link';
import { Button, Badge } from '@/components/ui';
import styles from './HomeHero.module.css';

type Props = {
  authed: boolean;
  userName?: string;
};

export function HomeHero({ authed, userName }: Props) {
  // 로그인 사용자에게는 hero 안 보임 (피드로 바로 진입, 인지부담 ↓)
  if (authed) return null;

  return (
    <section className={styles.heroGuest}>
      <div className={styles.heroGuestMain}>
        <Badge tone="primary">ETF 정보</Badge>
        <h1>
          ETF, <em>지금</em> 사도 될까?
        </h1>
        <p>
          국내·미국 ETF <strong>1,066개</strong>를 한 화면에서.<br />
          가격·보수·환노출·위험까지 정리해드려요.
        </p>
        <div className={styles.heroFacts}>
          <div>
            <strong>1,066</strong>
            <span>국내 + 미국 ETF</span>
          </div>
          <div>
            <strong>4단</strong>
            <span>구성 → 위험 → 비용 → 진단</span>
          </div>
          <div>
            <strong>무료</strong>
            <span>포트폴리오 진단</span>
          </div>
        </div>
        <div className={styles.heroActions}>
          <Button href="/etf/all" variant="primary" size="md">ETF 둘러보기 →</Button>
          <Link href="/portfolio" className={styles.heroLink}>
            내 포트폴리오 진단 받기
          </Link>
        </div>
      </div>
    </section>
  );
}
