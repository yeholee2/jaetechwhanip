'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Clock3, Megaphone, UsersRound } from 'lucide-react';
import Countdown from '@/components/sparring/Countdown';
import type { Sparring } from '@/lib/sparring';
import styles from './SparringCards.module.css';

const gradients: Record<string, string> = {
  재테크입문: 'linear-gradient(135deg, #1e59da 0%, #10b981 100%)',
  '국내주식·ETF': 'linear-gradient(135deg, #123b8d 0%, #1e59da 56%, #61a5ff 100%)',
  '해외주식·ETF': 'linear-gradient(135deg, #071b5f 0%, #4f46e5 52%, #14b8a6 100%)',
  절세: 'linear-gradient(135deg, #0f766e 0%, #1e59da 100%)',
  보험: 'linear-gradient(135deg, #155e75 0%, #2563eb 58%, #93c5fd 100%)',
  '대출·부채': 'linear-gradient(135deg, #7f1d1d 0%, #f04251 52%, #f59e0b 100%)',
};

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

export default function SparringActiveCard({ sparring }: { sparring: Sparring }) {
  const thumb = sparring.thumbnail_url ? `url("${sparring.thumbnail_url}")` : 'none';

  return (
    <article
      className={styles.activeCard}
      style={{
        '--thumb': thumb,
        '--thumb-opacity': sparring.thumbnail_url ? '1' : '0',
        '--fallback-bg': gradients[sparring.category] || gradients.재테크입문,
      } as CSSProperties}
    >
      <Link href={`/sparring/${sparring.slug}`} className={styles.activeLink}>
        <div>
          <div className={styles.activeMeta}>
            <span><UsersRound size={16} /> {formatNumber(sparring.stats.votes_total)}명 투표 중</span>
            <span>{sparring.round_number} 라운드</span>
          </div>
          <h2 className={styles.activeTitle}>{sparring.title}</h2>
        </div>
        <div className={styles.activeFoot}>
          <span><Clock3 size={16} /> <Countdown deadlineAt={sparring.deadline_at} compact /></span>
          <strong><Megaphone size={16} /> 참여하기</strong>
        </div>
      </Link>
    </article>
  );
}
