'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Creator } from '@/lib/creator';
import styles from './CreatorsDirectory.module.css';

type Sort = 'popular' | 'recent' | 'posts';

const TOPIC_FILTERS = [
  'ETF', '주식', '채권', '부동산', '코인',
  '은퇴 설계', '절세', '월급쟁이 재테크', '대가 분석', '시장 인사이트',
];

export function CreatorsDirectoryClient({ creators }: { creators: Creator[] }) {
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('popular');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = creators.filter(c => {
      if (activeTopic && !(c.topics || []).includes(activeTopic)) return false;
      if (q && !c.display_name.toLowerCase().includes(q) && !(c.bio || '').toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === 'popular') {
      list = list.slice().sort((a, b) => b.follower_count - a.follower_count);
    } else if (sort === 'recent') {
      list = list.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (sort === 'posts') {
      list = list.slice().sort((a, b) => b.post_count - a.post_count);
    }
    return list;
  }, [creators, query, activeTopic, sort]);

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>핀플루언서 디렉토리</span>
        <h1>믿을 수 있는 재테크 크리에이터를 만나보세요</h1>
        <p>토픽별로 골라보고, 마음에 드는 채널을 팔로우 + 멤버십으로 가까이서.</p>
        <div className={styles.heroActions}>
          <Link href="/creator/apply" className={styles.applyBtn}>
            + 크리에이터로 신청하기
          </Link>
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon} aria-hidden>🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="크리에이터 이름 또는 소개 검색"
          />
        </div>
        <div className={styles.sortGroup}>
          {([
            { key: 'popular', label: '인기순' },
            { key: 'recent', label: '신규순' },
            { key: 'posts', label: '활발한순' },
          ] as { key: Sort; label: string }[]).map(s => (
            <button
              type="button"
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`${styles.sortChip} ${sort === s.key ? styles.sortChipOn : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.topics}>
        <button
          type="button"
          onClick={() => setActiveTopic(null)}
          className={`${styles.topicChip} ${!activeTopic ? styles.topicChipOn : ''}`}
        >
          전체
        </button>
        {TOPIC_FILTERS.map(t => (
          <button
            type="button"
            key={t}
            onClick={() => setActiveTopic(activeTopic === t ? null : t)}
            className={`${styles.topicChip} ${activeTopic === t ? styles.topicChipOn : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyEmoji}>🔭</div>
          <strong>{creators.length === 0 ? '아직 등록된 크리에이터가 없어요' : '조건에 맞는 크리에이터가 없어요'}</strong>
          <span>{creators.length === 0 ? '첫 핀플루언서가 되어 보세요.' : '다른 토픽이나 검색어를 시도해 보세요.'}</span>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(c => (
            <Link key={c.id} href={`/creator/${c.slug}`} className={styles.card}>
              {c.cover_url && (
                <div
                  className={styles.cardCover}
                  style={{ backgroundImage: `url(${c.cover_url})` }}
                  aria-hidden
                />
              )}
              <div className={styles.cardBody}>
                <div className={styles.avatar}>
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt={c.display_name} />
                  ) : (
                    <span>{c.display_name.slice(0, 1)}</span>
                  )}
                </div>
                <strong className={styles.cardName}>{c.display_name}</strong>
                {c.bio && <p className={styles.cardBio}>{c.bio}</p>}
                {c.topics?.length > 0 && (
                  <div className={styles.cardTopics}>
                    {c.topics.slice(0, 3).map(t => (
                      <span key={t} className={styles.cardTopicChip}>{t}</span>
                    ))}
                    {c.topics.length > 3 && <span className={styles.cardTopicMore}>+{c.topics.length - 3}</span>}
                  </div>
                )}
                <div className={styles.cardStats}>
                  <span><strong>{c.follower_count.toLocaleString()}</strong> 팔로워</span>
                  <span><strong>{c.post_count.toLocaleString()}</strong> 글</span>
                  {c.membership_enabled && (
                    <span className={styles.memberPill}>
                      월 {(c.membership_price_won || 0).toLocaleString()}원
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
