import Link from 'next/link';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import { sparringPath, type Sparring } from '@/lib/sparring';
import { articleUrl, type HanipArticle } from '@/lib/feed';
import styles from './RelatedContent.module.css';

type RelatedQuestionItem = {
  slug: string;
  title: string;
  ans?: number;
};

type Props = {
  /** 헤더 라벨 (예: "관련 콘텐츠", "이 ETF와 관련된 글") */
  heading?: string;
  /** 언급된 ETF */
  etfs?: EtfInfo[];
  /** 관련 질문 */
  questions?: RelatedQuestionItem[];
  /** 관련 스파링 */
  sparrings?: Sparring[];
  /** 관련 한입 칼럼 */
  articles?: HanipArticle[];
};

export function RelatedContent({
  heading = '관련 콘텐츠',
  etfs,
  questions,
  sparrings,
  articles,
}: Props) {
  const hasAny =
    (etfs && etfs.length > 0) ||
    (questions && questions.length > 0) ||
    (sparrings && sparrings.length > 0) ||
    (articles && articles.length > 0);

  if (!hasAny) return null;

  return (
    <section className={styles.related} aria-label={heading}>
      <h3>{heading}</h3>

      {etfs && etfs.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupHead}>언급된 ETF</div>
          <div className={styles.etfRow}>
            {etfs.map(e => (
              <Link key={e.slug} href={etfPath(e.slug)} className={styles.etfChip}>
                {e.shortName}
              </Link>
            ))}
          </div>
        </div>
      )}

      {questions && questions.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupHead}>관련 질문</div>
          <ul className={styles.list}>
            {questions.map(q => (
              <li key={q.slug}>
                <Link href={`/q/${encodeURIComponent(q.slug)}`} className={styles.item}>
                  <span className={styles.title}>{q.title}</span>
                  {typeof q.ans === 'number' && <span className={styles.meta}>답변 {q.ans}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sparrings && sparrings.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupHead}>관련 스파링</div>
          <ul className={styles.list}>
            {sparrings.map(s => (
              <li key={s.id}>
                <Link href={sparringPath(s.slug)} className={styles.item}>
                  <span className={styles.title}>{s.title}</span>
                  <span className={styles.meta}>{s.stats.votes_total}표</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {articles && articles.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupHead}>한입 칼럼</div>
          <ul className={styles.list}>
            {articles.map(a => (
              <li key={a.slug}>
                <Link href={articleUrl(a.slug)} className={styles.item}>
                  <span className={styles.title}>{a.title}</span>
                  <span className={styles.meta}>{a.readingTime}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
