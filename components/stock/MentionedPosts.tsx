import Link from 'next/link';
import type { PostWithCreator } from '@/lib/postMentions';
import styles from './MentionedPosts.module.css';

export function MentionedPosts({
  posts,
  title,
  emptyText,
}: {
  posts: PostWithCreator[];
  title: string;
  emptyText?: string;
}) {
  if (posts.length === 0) {
    if (!emptyText) return null;
    return (
      <section className={styles.wrap}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.empty}>{emptyText}</div>
      </section>
    );
  }
  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.count}>{posts.length}건</span>
      </div>
      <div className={styles.list}>
        {posts.map(p => (
          <Link
            key={p.id}
            href={`/creator/${p.creator.slug}/posts/${p.slug}`}
            className={styles.card}
          >
            {p.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_url} alt="" className={styles.cover} />
            )}
            <div className={styles.body}>
              <strong className={styles.cardTitle}>{p.title}</strong>
              {p.preview && <p className={styles.preview}>{p.preview}</p>}
              <div className={styles.meta}>
                <span className={styles.creator}>
                  {p.creator.avatar_url && p.creator.avatar_url.length > 4 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.creator.avatar_url} alt="" className={styles.avatar} />
                  ) : (
                    <span className={styles.avatarFallback}>{p.creator.display_name?.[0] || '?'}</span>
                  )}
                  {p.creator.display_name}
                </span>
                {p.is_member_only && <span className={styles.lock}>🔒 멤버</span>}
                {p.view_count > 0 && <span>· 👁 {p.view_count.toLocaleString()}</span>}
                {p.like_count > 0 && <span>· ❤ {p.like_count.toLocaleString()}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
