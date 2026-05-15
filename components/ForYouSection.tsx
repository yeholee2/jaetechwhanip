/**
 * 홈 상단 "당신을 위한" — 로그인한 사용자에게만 노출.
 *
 * 3 sub-section:
 *  - 팔로우한 크리에이터 새 글
 *  - 관심 ETF 큰 변동
 *  - 최근 알림 (안 읽은 것)
 *
 * 데이터가 하나도 없는 사용자는 섹션 전체 비노출 (CTA 카드는 별도 표시 가능).
 */

import Link from 'next/link';
import type { ForYouBundle } from '@/lib/forYou';
import styles from './ForYouSection.module.css';

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const dt = new Date(iso);
  return `${dt.getMonth() + 1}.${dt.getDate()}`;
}

const KIND_EMOJI: Record<string, string> = {
  alert: '🔔',
  system: 'ℹ️',
  creator_post_published: '✨',
  creator_post_liked: '♥',
  creator_post_commented: '💬',
  qa_answered: '💡',
};

export function ForYouSection({ data }: { data: ForYouBundle }) {
  if (!data.hasUser) return null;
  const hasAny = data.posts.length > 0 || data.watch.length > 0 || data.notifications.length > 0;
  if (!hasAny) return null;

  return (
    <section className={styles.wrap} aria-label="당신을 위한">
      <header className={styles.head}>
        <span className={styles.eyebrow}>당신을 위한</span>
        <h2>오늘 챙겨야 할 것</h2>
      </header>

      <div className={styles.grid}>
        {data.posts.length > 0 && (
          <div className={styles.col}>
            <h3 className={styles.colTitle}>
              <span aria-hidden>✨</span>
              팔로우 크리에이터 새 글
            </h3>
            <ul className={styles.postList}>
              {data.posts.map(p => (
                <li key={p.id}>
                  <Link href={`/creator/${p.creator_slug}/posts/${p.slug}`} className={styles.postItem}>
                    {p.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover_url} alt="" className={styles.postCover} />
                    ) : (
                      <div className={`${styles.postCover} ${styles.postCoverFallback}`} aria-hidden>📝</div>
                    )}
                    <div className={styles.postBody}>
                      <div className={styles.postMeta}>
                        <span>{p.creator_name}</span>
                        {p.is_member_only && <span className={styles.postLock}>🔒 멤버</span>}
                        <span>· {timeAgo(p.published_at)}</span>
                      </div>
                      <strong>{p.title}</strong>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/creators" className={styles.colMore}>모든 핀플루언서 →</Link>
          </div>
        )}

        {data.watch.length > 0 && (
          <div className={styles.col}>
            <h3 className={styles.colTitle}>
              <span aria-hidden>📈</span>
              관심 ETF 큰 움직임
            </h3>
            <ul className={styles.watchList}>
              {data.watch.map(e => (
                <li key={e.code}>
                  <Link href={`/etf/${encodeURIComponent(e.slug)}`} className={styles.watchItem}>
                    <div className={styles.watchInfo}>
                      <strong>{e.shortName}</strong>
                      <span>{e.code}</span>
                    </div>
                    <span className={`${styles.watchChg} ${e.changeTone === 'up' ? styles.up : e.changeTone === 'down' ? styles.down : ''}`}>
                      {e.change || '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/etf" className={styles.colMore}>관심 ETF 모두 →</Link>
          </div>
        )}

        {data.notifications.length > 0 && (
          <div className={styles.col}>
            <h3 className={styles.colTitle}>
              <span aria-hidden>🔔</span>
              안 읽은 알림
            </h3>
            <ul className={styles.notiList}>
              {data.notifications.map(n => (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={n.link} className={styles.notiItem}>
                      <span className={styles.notiEmoji}>{KIND_EMOJI[n.kind] || '🔔'}</span>
                      <div className={styles.notiBody}>
                        <strong>{n.title}</strong>
                        {n.body && <span>{n.body}</span>}
                      </div>
                      <time>{timeAgo(n.created_at)}</time>
                    </Link>
                  ) : (
                    <div className={styles.notiItem}>
                      <span className={styles.notiEmoji}>{KIND_EMOJI[n.kind] || '🔔'}</span>
                      <div className={styles.notiBody}>
                        <strong>{n.title}</strong>
                        {n.body && <span>{n.body}</span>}
                      </div>
                      <time>{timeAgo(n.created_at)}</time>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
