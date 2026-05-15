'use client';

/**
 * ETF 뉴스 페이지 — 3 섹션 통합 피드.
 * - 재테크한입 블로그 (Ghost RSS)
 * - 매크로 뉴스 (Finnhub)
 * - ETF 큐레이션
 *
 * 탭: 전체 / 한입 블로그 / 매크로 / ETF
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { timeAgo, type FeedItem } from '@/lib/newsFeed';
import styles from './News.module.css';

type Tab = 'all' | 'blog' | 'macro' | 'etf';

export function NewsClient({
  blog,
  macro,
  etf,
}: {
  blog: FeedItem[];
  macro: FeedItem[];
  etf: FeedItem[];
}) {
  const [tab, setTab] = useState<Tab>('all');

  const headline = blog[0] || macro[0] || etf[0];

  const list = useMemo(() => {
    if (tab === 'blog') return blog;
    if (tab === 'macro') return macro;
    if (tab === 'etf') return etf;
    // 전체 — 최신순 인터리브
    const merged = [...blog, ...macro, ...etf];
    return merged.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  }, [tab, blog, macro, etf]);

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>ETF 뉴스 · 인사이트</span>
        <h1>시장 흐름을 한 번에</h1>
        <p>재테크한입 블로그 · 글로벌 매크로 · ETF 큐레이션을 한 화면에서.</p>
      </header>

      {/* Headline — 가장 최근 글 */}
      {headline && (
        <Link
          href={headline.url}
          target={headline.url.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className={styles.headline}
        >
          {headline.imageUrl ? (
            <div
              className={styles.headlineImg}
              style={{ backgroundImage: `url(${headline.imageUrl})` }}
              aria-hidden
            />
          ) : (
            <div className={`${styles.headlineImg} ${styles.headlineImgFallback}`} aria-hidden>
              <span>📰</span>
            </div>
          )}
          <div className={styles.headlineBody}>
            <div className={styles.headlineMeta}>
              <span className={styles.headlineBadge}>{headline.category || headline.source}</span>
              <span className={styles.headlineSource}>{headline.source}</span>
              {headline.publishedAt && <span>{timeAgo(headline.publishedAt)}</span>}
            </div>
            <h2>{headline.title}</h2>
            {headline.summary && <p>{headline.summary}</p>}
          </div>
        </Link>
      )}

      {/* 탭 */}
      <nav className={styles.tabs}>
        {([
          { key: 'all', label: '전체', count: blog.length + macro.length + etf.length },
          { key: 'blog', label: '한입 블로그', count: blog.length },
          { key: 'macro', label: '매크로', count: macro.length },
          { key: 'etf', label: 'ETF', count: etf.length },
        ] as { key: Tab; label: string; count: number }[]).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`${styles.tab} ${tab === t.key ? styles.tabOn : ''}`}
          >
            {t.label}
            <span className={styles.tabCount}>{t.count}</span>
          </button>
        ))}
      </nav>

      {/* 리스트 */}
      {list.length === 0 ? (
        <div className={styles.empty}>
          <strong>표시할 뉴스가 없어요</strong>
          <span>잠시 후 다시 확인해 주세요.</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {list.slice(headline && tab === 'all' ? 1 : 0).map(item => (
            <li key={item.id}>
              <Link
                href={item.url}
                target={item.url.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className={styles.card}
              >
                {item.imageUrl && (
                  <div
                    className={styles.cardImg}
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                    aria-hidden
                  />
                )}
                <div className={styles.cardBody}>
                  <div className={styles.cardMeta}>
                    {item.category && <span className={styles.cardBadge}>{item.category}</span>}
                    <span className={styles.cardSource}>{item.source}</span>
                    {item.publishedAt && <span>· {timeAgo(item.publishedAt)}</span>}
                  </div>
                  <strong className={styles.cardTitle}>{item.title}</strong>
                  {item.summary && <p className={styles.cardSummary}>{item.summary}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
