'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import Countdown from '@/components/sparring/Countdown';
import { FaIcon } from '@/components/FaIcon';
import { sparringPath, type Sparring } from '@/lib/sparring';
import styles from './SparringCards.module.css';

const gradients: Record<string, string> = {
  재테크: 'linear-gradient(135deg, #1e59da 0%, #10b981 100%)',
  '국내주식·ETF': 'linear-gradient(135deg, #123b8d 0%, #1e59da 56%, #61a5ff 100%)',
  '해외주식·ETF': 'linear-gradient(135deg, #071b5f 0%, #4f46e5 52%, #14b8a6 100%)',
  절세: 'linear-gradient(135deg, #0f766e 0%, #1e59da 100%)',
  보험: 'linear-gradient(135deg, #155e75 0%, #2563eb 58%, #93c5fd 100%)',
  '대출·부채': 'linear-gradient(135deg, #172554 0%, #1e59da 58%, #64748b 100%)',
};

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

export default function SparringActiveCard({ sparring }: { sparring: Sparring }) {
  const thumb = sparring.thumbnail_url ? `url("${sparring.thumbnail_url}")` : 'none';
  const total = sparring.stats.votes_total || sparring.stats.votes_a + sparring.stats.votes_b;

  return (
    <article
      className={styles.activeCard}
      style={{
        '--thumb': thumb,
        '--thumb-opacity': sparring.thumbnail_url ? '1' : '0',
        '--fallback-bg': gradients[sparring.category] || gradients.재테크,
      } as CSSProperties}
    >
      <Link href={sparringPath(sparring.slug)} className={styles.activeLink}>
        <div className={styles.activeCopy}>
          <div className={styles.activeMeta}>
            <span>{formatNumber(total)}명 투표 중</span>
          </div>
          <h2 className={styles.activeTitle}>{sparring.title}</h2>
        </div>
        <div className={styles.activeFoot}>
          <span><FaIcon name="clock" size={15} /> <Countdown deadlineAt={sparring.deadline_at} compact /></span>
          <strong><FaIcon name="bullhorn" size={15} /> 참여하기</strong>
        </div>
      </Link>
    </article>
  );
}
