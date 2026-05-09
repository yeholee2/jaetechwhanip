import Link from 'next/link';
import DominantOpinionBox from '@/components/sparring/DominantOpinionBox';
import type { Sparring } from '@/lib/sparring';
import styles from './SparringCards.module.css';

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

export default function SparringPastCard({ sparring }: { sparring: Sparring }) {
  return (
    <Link href={`/sparring/${sparring.slug}`} className={styles.pastCard}>
      <div>
        <div className={styles.tagRow}>
          <span className={styles.tag}>#{sparring.category}</span>
          <span className={styles.tag}>#{sparring.round_number}라운드</span>
        </div>
        <h2 className={styles.pastTitle}>{sparring.title}</h2>
        <div className={styles.pastDivider} />
        <DominantOpinionBox sparring={sparring} />
      </div>
      <div className={styles.pastStats}>
        <span>투표 수</span>
        <strong>{formatNumber(sparring.stats.votes_total)}표</strong>
        <span>토론 {formatNumber(sparring.stats.comment_count)}개</span>
      </div>
    </Link>
  );
}
