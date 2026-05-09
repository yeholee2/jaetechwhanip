'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Hash, MessageCircle, Newspaper, Search, Swords } from 'lucide-react';
import BookmarkButton from '@/components/bookmark/BookmarkButton';
import FollowButton from '@/components/follow/FollowButton';
import type { BookmarkTargetType } from '@/lib/bookmarks';
import styles from './SearchPage.module.css';

export type SearchTab = 'questions' | 'sparrings' | 'feed' | 'topics';

export type SearchResultItem = {
  id: string;
  type: 'question' | 'sparring' | 'feed' | 'topic';
  title: string;
  body: string;
  href: string;
  category: string;
  meta: string;
  external?: boolean;
  bookmark?: {
    targetType: BookmarkTargetType;
    targetId: string;
  };
  follow?: {
    targetId: string;
    title: string;
  };
};

export type SearchBuckets = {
  questions: SearchResultItem[];
  sparrings: SearchResultItem[];
  feed: SearchResultItem[];
  topics: SearchResultItem[];
};

const TAB_LABELS: Array<{ key: SearchTab; label: string }> = [
  { key: 'questions', label: '질문' },
  { key: 'sparrings', label: '스파링' },
  { key: 'feed', label: '피드' },
  { key: 'topics', label: '토픽' },
];

export default function SearchClient({ query, results }: { query: string; results: SearchBuckets }) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [tab, setTab] = useState<SearchTab>('questions');
  const totalCount = Object.values(results).reduce((sum, items) => sum + items.length, 0);
  const activeResults = results[tab];

  const topCategory = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(results).flat().forEach(item => counts.set(item.category, (counts.get(item.category) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '전체';
  }, [results]);

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>통합 검색</p>
          <h1>{query ? `"${query}" 검색 결과` : '찾고 싶은 돈 고민을 검색해 보세요'}</h1>
          <p>{query ? `${topCategory}에서 가장 많이 걸렸어요. 총 ${totalCount}개 결과를 찾았습니다.` : '질문, 스파링, 피드, 토픽을 한 번에 훑어볼 수 있어요.'}</p>
        </div>
        <form
          className={styles.searchBox}
          onSubmit={event => {
            event.preventDefault();
            const next = value.trim();
            if (next) router.push(`/search?q=${encodeURIComponent(next)}`);
          }}
        >
          <Search size={18} />
          <input value={value} onChange={event => setValue(event.target.value)} placeholder="ETF, ISA, 대출..." />
          <button type="submit">검색</button>
        </form>
      </section>

      <nav className={styles.tabs} aria-label="검색 결과 탭">
        {TAB_LABELS.map(item => (
          <button key={item.key} type="button" className={tab === item.key ? styles.on : ''} onClick={() => setTab(item.key)}>
            {item.label}<span>{results[item.key].length}</span>
          </button>
        ))}
      </nav>

      <section className={styles.results} aria-label={`${TAB_LABELS.find(item => item.key === tab)?.label} 검색 결과`}>
        {!query && <Empty title="검색어를 입력해 주세요" body="예: ETF, ISA, 실손보험, 학자금대출" />}
        {query && activeResults.length === 0 && <Empty title="결과가 없어요" body="띄어쓰기나 다른 표현으로 다시 검색해 보세요." />}
        {activeResults.map(item => <ResultRow key={`${item.type}:${item.id}`} item={item} query={query} />)}
      </section>
    </main>
  );
}

function ResultRow({ item, query }: { item: SearchResultItem; query: string }) {
  const icon = item.type === 'question' ? <MessageCircle size={15} />
    : item.type === 'sparring' ? <Swords size={15} />
      : item.type === 'feed' ? <Newspaper size={15} />
        : <Hash size={15} />;
  return (
    <article className={styles.rowWrap}>
      {item.external ? (
        <a className={styles.row} href={item.href} target="_blank" rel="noreferrer">
          <span className={styles.kind}>{icon}{labelFor(item.type)}</span>
          <h2>{highlight(item.title, query)}</h2>
          <p>{highlight(item.body, query)}</p>
          <em>{item.category} · {item.meta}</em>
        </a>
      ) : (
        <Link className={styles.row} href={item.href}>
          <span className={styles.kind}>{icon}{labelFor(item.type)}</span>
          <h2>{highlight(item.title, query)}</h2>
          <p>{highlight(item.body, query)}</p>
          <em>{item.category} · {item.meta}</em>
        </Link>
      )}
      {item.bookmark && (
        <div className={styles.actionSlot}>
          <BookmarkButton
            targetType={item.bookmark.targetType}
            targetId={item.bookmark.targetId}
            title={item.title}
            href={item.href}
            category={item.category}
          />
        </div>
      )}
      {item.follow && (
        <div className={styles.actionSlot}>
          <FollowButton targetType="topic" targetId={item.follow.targetId} title={item.follow.title} />
        </div>
      )}
    </article>
  );
}

function highlight(text: string, query: string) {
  const clean = query.trim();
  if (!clean) return text;
  const index = text.toLowerCase().indexOf(clean.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + clean.length)}</mark>
      {text.slice(index + clean.length)}
    </>
  );
}

function labelFor(type: SearchResultItem['type']) {
  if (type === 'question') return '질문';
  if (type === 'sparring') return '스파링';
  if (type === 'topic') return '토픽';
  return '피드';
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.empty}>
      <Bookmark size={22} />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
