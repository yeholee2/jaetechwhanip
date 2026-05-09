import { getSideLabel, getSidePolarity, type Sparring } from '@/lib/sparring';
import styles from './SparringCards.module.css';

export default function DominantOpinionBox({ sparring }: { sparring: Sparring }) {
  const { votes_a: votesA, votes_b: votesB, votes_total: total } = sparring.stats;
  const dominantSide = votesB > votesA ? 'b' : 'a';
  const dominantVotes = dominantSide === 'a' ? votesA : votesB;
  const percent = total > 0 ? Math.round((dominantVotes / total) * 1000) / 10 : 0;
  const polarity = getSidePolarity(sparring, dominantSide);

  return (
    <div className={`${styles.dominant} ${polarity === 'positive' ? styles.blue : styles.red}`}>
      <span>우세 의견 · {getSideLabel(sparring, dominantSide)}</span>
      <em>{percent}%</em>
    </div>
  );
}
