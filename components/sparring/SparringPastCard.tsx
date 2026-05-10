import Link from 'next/link';
import { FaIcon } from '@/components/FaIcon';
import { getCategoryLabel } from '@/lib/categories';
import { getSideLabel, getSidePolarity, type Sparring } from '@/lib/sparring';
import styles from './SparringCards.module.css';

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

export default function SparringPastCard({ sparring }: { sparring: Sparring }) {
  const { votes_a: votesA, votes_b: votesB, votes_total: total } = sparring.stats;
  const dominantSide = votesB > votesA ? 'b' : 'a';
  const dominantVotes = dominantSide === 'a' ? votesA : votesB;
  const percent = total > 0 ? Math.round((dominantVotes / total) * 1000) / 10 : 0;
  const polarity = getSidePolarity(sparring, dominantSide);
  const resultTone = polarity === 'positive' ? styles.blue : styles.red;

  return (
    <Link href={`/sparring/${sparring.slug}`} className={styles.pastCard}>
      <div className={styles.pastTop}>
        <div className={styles.pastHeading}>
          <div className={styles.tagRow}>
            <span className={styles.tag}>#{getCategoryLabel(sparring.category)}</span>
          </div>
          <h2 className={styles.pastTitle}>{sparring.title}</h2>
        </div>
        <span className={styles.round}>{sparring.round_number} 라운드</span>
      </div>

      <div className={styles.pastDivider} />

      <div className={styles.pastResult}>
        <div className={`${styles.dominant} ${resultTone}`}>
          <span>{getSideLabel(sparring, dominantSide)}</span>
          <em>{percent}%</em>
        </div>
        <p className={styles.resultCopy}>
          <span>😎</span>
          다수 의견이 우세했어요
        </p>
        <div className={styles.metric}>
          <span>투표 수</span>
          <strong>{formatNumber(sparring.stats.votes_total)}표</strong>
        </div>
        <div className={styles.metric}>
          <span>토론 수</span>
          <strong>{formatNumber(sparring.stats.comment_count)}개</strong>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          <FaIcon name="chevron-right" size={18} />
        </span>
      </div>
    </Link>
  );
}
