import Link from 'next/link';
import type { CSSProperties } from 'react';
import { FaIcon } from '@/components/FaIcon';
import { sparringPath, type Sparring } from '@/lib/sparring';
import styles from './SparringMiniCard.module.css';

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

function formatRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return '마감됐어요';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) return `${days}일 남았어요`;
  if (hours >= 1) return `${hours}시간 남았어요`;
  return `${Math.max(1, minutes)}분 남았어요`;
}

export default function SparringMiniCard({
  sparring,
  isAdmin = false,
}: {
  sparring?: Sparring | null;
  isAdmin?: boolean;
}) {
  const href = sparring ? sparringPath(sparring.slug) : '/sparring';
  const title = sparring?.title || '지금 진행 중인 스파링 보러가기';
  const totalVotes = sparring?.stats.votes_total ?? 0;
  const remaining = sparring ? formatRemaining(sparring.deadline_at) : '참여하기';
  const thumb = sparring?.thumbnail_url ? `url("${sparring.thumbnail_url}")` : 'none';

  return (
    <section
      className={styles.card}
      aria-label="현재 스파링"
      style={{
        '--thumb': thumb,
        '--thumb-opacity': sparring?.thumbnail_url ? '1' : '0',
      } as CSSProperties}
    >
      {/* 관리자만 보이는 인라인 편집 진입 */}
      {isAdmin && sparring && (
        <Link
          href={`/admin/sparring?edit=${sparring.id}`}
          className={styles.adminEdit}
          aria-label="이 스파링 편집"
          onClick={e => e.stopPropagation()}
        >
          <FaIcon name="pen" size={11} /> 편집
        </Link>
      )}

      <Link href={href} className={styles.hero}>
        <div className={styles.copy}>
          <div className={styles.meta}>
            {totalVotes > 0 ? `${formatNumber(totalVotes)}명 투표 중` : '지금 투표 중'}
          </div>
          <h2 className={styles.title}>{title}</h2>
        </div>
        <div className={styles.foot}>
          <span><FaIcon name="clock" size={13} /> {remaining}</span>
          <strong><FaIcon name="comment-dots" size={13} /> 참여하기</strong>
        </div>
      </Link>
    </section>
  );
}
