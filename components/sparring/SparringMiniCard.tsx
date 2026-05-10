import Link from 'next/link';
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

export default function SparringMiniCard({ sparring }: { sparring?: Sparring | null }) {
  const href = sparring ? sparringPath(sparring.slug) : '/sparring';
  const title = sparring?.title || '지금 진행 중인 스파링 보러가기';
  const totalVotes = sparring?.stats.votes_total ?? 0;
  const remaining = sparring ? formatRemaining(sparring.deadline_at) : '참여하기';

  return (
    <section className={styles.card} aria-label="현재 스파링">
      <Link href={href} className={styles.hero}>
        <div className={styles.meta}>
          <span className="tf">🔥</span>
          <span>{totalVotes > 0 ? `${formatNumber(totalVotes)}명 투표 중` : '지금 투표 중'}</span>
        </div>
        <h2>{title}</h2>
        <div className={styles.foot}>
          <span><FaIcon name="clock" size={13} /> {remaining}</span>
          <strong>참여하기</strong>
        </div>
      </Link>
    </section>
  );
}
