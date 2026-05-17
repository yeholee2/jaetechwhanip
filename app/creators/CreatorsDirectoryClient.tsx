'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Creator } from '@/lib/creator';
import styles from './CreatorsDirectory.module.css';

type Sort = 'popular' | 'recent' | 'posts';

const TOPIC_FILTERS = [
  '전체', 'ETF', '주식', '해외주식·ETF', '국내주식·ETF',
  '배당주·ETF', '적립식·연금', '테마·트렌드',
  '채권', '자산관리', '코인',
  '은퇴 설계', '절세', '월급쟁이 재테크', '대가 분석', '시장 인사이트',
];

// 카테고리 → 화이트리스트로 normalize (creator.topics 와 부분 매칭)
function matchTopic(creator: Creator, filter: string): boolean {
  if (filter === '전체') return true;
  const topics = (creator as any).topics || [];
  return topics.some((t: string) => t === filter || t.includes(filter) || filter.includes(t));
}

// gradient (mock 데이터 또는 fallback)
function coverStyle(c: any): React.CSSProperties {
  if (c.cover_url) {
    return { backgroundImage: `url(${c.cover_url})` };
  }
  if (c.coverGradient) {
    return { background: c.coverGradient };
  }
  // hash-based default
  const palette = [
    'linear-gradient(135deg, #1B64DA, #3182F6)',
    'linear-gradient(135deg, #7C4DFF, #B383FF)',
    'linear-gradient(135deg, #2E9C5C, #44C781)',
    'linear-gradient(135deg, #FF9F1C, #FFC36B)',
    'linear-gradient(135deg, #E94986, #FF8FB7)',
    'linear-gradient(135deg, #00BFA5, #4DD8C5)',
  ];
  const hash = (c.slug || c.id || '').split('').reduce((a: number, ch: string) => a + ch.charCodeAt(0), 0);
  return { background: palette[hash % palette.length] };
}

export function CreatorsDirectoryClient({ creators }: { creators: Creator[] }) {
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string>('전체');
  const [sort, setSort] = useState<Sort>('popular');

  // 검색·토픽 필터
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = creators.filter(c => {
      if (!matchTopic(c, activeTopic)) return false;
      if (!q) return true;
      return c.display_name.toLowerCase().includes(q) || (c.bio || '').toLowerCase().includes(q);
    });
    if (sort === 'popular') list = list.slice().sort((a, b) => b.follower_count - a.follower_count);
    else if (sort === 'recent') list = list.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sort === 'posts') list = list.slice().sort((a, b) => b.post_count - a.post_count);
    return list;
  }, [creators, query, activeTopic, sort]);

  // Hero — 최상위 인기 1명
  const hero = useMemo(() => {
    return creators.slice().sort((a, b) => b.follower_count - a.follower_count)[0] || null;
  }, [creators]);

  // 인기 TOP 5 (가로 스크롤)
  const top5 = useMemo(() => {
    return creators.slice().sort((a, b) => b.follower_count - a.follower_count).slice(0, 5);
  }, [creators]);

  return (
    <div className={styles.wrap}>
      {/* Hero — 이 주의 추천 재프콘 */}
      {hero && (
        <section className={styles.hero}>
          <div className={styles.heroCover} style={coverStyle(hero)} aria-hidden />
          <div className={styles.heroOverlay}>
            <span className={styles.heroEyebrow}>✨ 이 주의 추천 재프콘</span>
            <div className={styles.heroInfo}>
              <div className={styles.heroAvatar}>
                {hero.avatar_url && hero.avatar_url.length <= 4 ? (
                  <span>{hero.avatar_url}</span>
                ) : hero.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hero.avatar_url} alt={hero.display_name} />
                ) : (
                  <span>{hero.display_name.slice(0, 1)}</span>
                )}
              </div>
              <div className={styles.heroBody}>
                <strong>{hero.display_name}</strong>
                {hero.bio && <p>{hero.bio}</p>}
                <div className={styles.heroStats}>
                  <span><strong>{hero.follower_count.toLocaleString()}</strong> 팔로워</span>
                  <span><strong>{hero.member_count.toLocaleString()}</strong> 멤버</span>
                  <span><strong>{hero.post_count.toLocaleString()}</strong> 글</span>
                  {(hero as any).verified && (
                    <span className={styles.heroAccuracy}>✓ {(hero as any).credential || '전문가 인증'}</span>
                  )}
                </div>
              </div>
              <Link href={`/creator/${hero.slug}`} className={styles.heroCta}>
                채널 들어가기 →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 검색 + 정렬 */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon} aria-hidden>🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="크리에이터 이름·소개 검색"
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

      {/* 카테고리 탭 */}
      <div className={styles.topics}>
        {TOPIC_FILTERS.map(t => (
          <button
            type="button"
            key={t}
            onClick={() => setActiveTopic(t)}
            className={`${styles.topicChip} ${activeTopic === t ? styles.topicChipOn : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 인기 TOP 5 — 가로 스크롤 */}
      {activeTopic === '전체' && !query && top5.length >= 3 && (
        <section className={styles.topSection}>
          <div className={styles.sectionHead}>
            <h2>🔥 인기 재프콘 TOP 5</h2>
            <span>지난 7일 가장 많이 팔로우</span>
          </div>
          <div className={styles.topScroll}>
            {top5.map((c, i) => (
              <Link key={c.id} href={`/creator/${c.slug}`} className={styles.topCard}>
                <span className={styles.topRank}>{i + 1}</span>
                <div className={styles.topCover} style={coverStyle(c)} aria-hidden />
                <div className={styles.topBody}>
                  <div className={styles.topAvatar}>
                    {c.avatar_url && c.avatar_url.length <= 4 ? (
                      <span>{c.avatar_url}</span>
                    ) : c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatar_url} alt="" />
                    ) : (
                      <span>{c.display_name.slice(0, 1)}</span>
                    )}
                  </div>
                  <strong>{c.display_name}</strong>
                  {c.bio && <p>{c.bio}</p>}
                  <div className={styles.topStats}>
                    <span>{c.follower_count.toLocaleString()} 팔로워</span>
                    {(c as any).verified && <span className={styles.verifiedTag}>✓ 전문가</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 전체 그리드 */}
      <section className={styles.gridSection}>
        <div className={styles.sectionHead}>
          <h2>전체 재프콘</h2>
          <span>{filtered.length}명</span>
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyEmoji}>🔭</div>
            <strong>조건에 맞는 크리에이터가 없어요</strong>
            <span>다른 토픽이나 검색어를 시도해 보세요.</span>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(c => (
              <Link key={c.id} href={`/creator/${c.slug}`} className={styles.card}>
                <div className={styles.cardCover} style={coverStyle(c)} aria-hidden />
                {(c as any).badge && (
                  <span className={styles.cardBadge}>{(c as any).badge}</span>
                )}
                <div className={styles.cardBody}>
                  <div className={styles.avatar}>
                    {c.avatar_url && c.avatar_url.length <= 4 ? (
                      <span>{c.avatar_url}</span>
                    ) : c.avatar_url ? (
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
                    </div>
                  )}
                  <div className={styles.cardStats}>
                    <span><strong>{c.follower_count.toLocaleString()}</strong> 팔로워</span>
                    <span><strong>{c.member_count.toLocaleString()}</strong> 멤버</span>
                    {(c as any).verified && (
                      <span className={styles.cardAccuracy}>✓ 전문가</span>
                    )}
                  </div>
                  {c.membership_enabled && (
                    <div className={styles.cardPrice}>
                      월 {(c.membership_price_won || 0).toLocaleString()}원
                      <span>{c.membership_tier_name}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 신청 CTA + 수수료 비교 */}
      <section className={styles.applyBanner}>
        <div className={styles.applyMain}>
          <div>
            <strong>나도 재프콘이 되고 싶다면?</strong>
            <p>재테크 경험·인사이트를 멤버에게 직접 전달하고 수익도 만들어보세요.</p>
          </div>
          <Link href="/creator/apply" className={styles.applyBtn}>
            + 재프콘 신청하기
          </Link>
        </div>
        <div className={styles.feeCompare}>
          <span className={styles.feeLabel}>플랫폼 수수료 비교</span>
          <div className={styles.feeRow}>
            <div className={styles.feeItem}>
              <span>팬딩</span><strong>15%</strong>
            </div>
            <div className={styles.feeItem}>
              <span>네프콘</span><strong>10%</strong>
            </div>
            <div className={`${styles.feeItem} ${styles.feeItemUs}`}>
              <span>재프콘 (베타)</span><strong>0%</strong>
              <em>크리에이터 100% 수익</em>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
