import Link from 'next/link';
import { MessageCircle, Timer, UsersRound } from 'lucide-react';
import { getDaysLeft, getVotePercent, type Sparring } from '@/lib/sparrings';
import styles from './SparringCard.module.css';

export function SparringCard({ sparring }: { sparring: Sparring }) {
  const percent = getVotePercent(sparring.stats);
  const leadingSide = percent.a >= percent.b ? sparring.side_a_label : sparring.side_b_label;
  const leadingPercent = Math.max(percent.a, percent.b);
  const commentsTotal = sparring.stats.commentsA + sparring.stats.commentsB;
  const daysLeft = getDaysLeft(sparring.deadline_at);

  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        <span className={styles.badge}>{sparring.category}</span>
        <span>Round {sparring.round_number}</span>
      </div>
      <h2>{sparring.title}</h2>
      <p>{sparring.body}</p>

      <div className={styles.resultLine}>
        <strong>{leadingSide} 우세</strong>
        <span>{leadingPercent}%</span>
      </div>
      <div className={styles.bar} aria-label={`${sparring.side_a_label} ${percent.a}%, ${sparring.side_b_label} ${percent.b}%`}>
        <span className={styles.sideA} style={{ width: `${percent.a}%` }} />
        <span className={styles.sideB} style={{ width: `${percent.b}%` }} />
      </div>
      <div className={styles.labels}>
        <span>{sparring.side_a_label} {percent.a}%</span>
        <span>{sparring.side_b_label} {percent.b}%</span>
      </div>

      <div className={styles.footer}>
        <span><UsersRound size={15} /> 투표 {percent.total}</span>
        <span><MessageCircle size={15} /> 토론 {commentsTotal}</span>
        <span><Timer size={15} /> {daysLeft > 0 ? `${daysLeft}일 남았어요` : '마감됐어요'}</span>
      </div>

      <Link className={styles.cta} href={`/sparring/${sparring.slug}`}>
        참여하기 →
      </Link>
    </article>
  );
}
