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

type DirectoryCreator = Creator & {
  badge?: string;
  coverGradient?: string;
  verified?: boolean;
  credential?: string;
};

const DISCOVERY_SECTIONS = [
  {
    key: 'etf',
    title: 'HOT ETF 재프콘',
    caption: 'ETF·연금·배당 흐름을 꾸준히 발행하는 채널',
    topics: ['ETF', '국내주식·ETF', '해외주식·ETF', '배당주·ETF', '적립식·연금'],
  },
  {
    key: 'wealth',
    title: '절세·연금·자산관리',
    caption: '직장인 돈관리와 세금 이슈를 바로 적용하기 좋게',
    topics: ['절세', '은퇴 설계', '자산관리', '월급쟁이 재테크'],
  },
  {
    key: 'market',
    title: '시장 인사이트',
    caption: '미국장·금리·환율·대가 분석을 따라가기 쉽게',
    topics: ['시장 인사이트', '해외주식·ETF', '대가 분석', '테마·트렌드'],
  },
  {
    key: 'new',
    title: '신규 재프콘',
    caption: '새로 열린 채널을 먼저 팔로우해 보세요',
    topics: [],
  },
] as const;

// 카테고리 → 화이트리스트로 normalize (creator.topics 와 부분 매칭)
function matchTopic(creator: Creator, filter: string): boolean {
  if (filter === '전체') return true;
  const topics = (creator as any).topics || [];
  return topics.some((t: string) => t === filter || t.includes(filter));
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

function creatorTopics(creator: Creator): string[] {
  return Array.isArray((creator as any).topics) ? (creator as any).topics : [];
}

function hasAnyTopic(creator: Creator, filters: readonly string[]): boolean {
  if (filters.length === 0) return true;
  return creatorTopics(creator).some(t =>
    filters.some(filter => t === filter || t.includes(filter))
  );
}

function sortedByPopularity(creators: DirectoryCreator[]) {
  return creators.slice().sort((a, b) => b.follower_count - a.follower_count);
}

function getDiscoverySections(creators: DirectoryCreator[]) {
  const popular = sortedByPopularity(creators);
  return DISCOVERY_SECTIONS.map(section => {
    let items = section.key === 'new'
      ? creators.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4)
      : popular.filter(c => hasAnyTopic(c, section.topics)).slice(0, 4);

    if (items.length < 3) {
      const exists = new Set(items.map(c => c.id));
      items = [
        ...items,
        ...popular.filter(c => !exists.has(c.id)).slice(0, 4 - items.length),
      ];
    }

    return { ...section, items };
  }).filter(section => section.items.length > 0);
}

function CreatorAvatar({ creator, className }: { creator: Creator; className: string }) {
  if (creator.avatar_url && creator.avatar_url.length <= 4) {
    return <div className={className}><span>{creator.avatar_url}</span></div>;
  }
  if (creator.avatar_url) {
    return (
      <div className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={creator.avatar_url} alt={creator.display_name} />
      </div>
    );
  }
  return <div className={className}><span>{creator.display_name.slice(0, 1)}</span></div>;
}

function DiscoveryCard({ creator }: { creator: DirectoryCreator }) {
  return (
    <Link href={`/creator/${creator.slug}`} className={styles.shelfCard}>
      <div className={styles.shelfCover} style={coverStyle(creator)} aria-hidden />
      <div className={styles.shelfBody}>
        <CreatorAvatar creator={creator} className={styles.shelfAvatar} />
        <div className={styles.shelfTitleRow}>
          <strong>{creator.display_name}</strong>
          {creator.verified && <span className={styles.shelfVerified}>검증</span>}
        </div>
        {creator.bio && <p>{creator.bio}</p>}
        <div className={styles.shelfMeta}>
          <span>{creator.follower_count.toLocaleString()} 팔로워</span>
          <span>{creator.post_count.toLocaleString()}개 글</span>
        </div>
        <div className={styles.trustLine}>
          {creator.membership_enabled ? (
            <span className={styles.trustPill}>멤버십 운영</span>
          ) : (
            <span className={styles.trustPill}>무료 채널</span>
          )}
          {creator.topics?.slice(0, 2).map(t => (
            <span key={t} className={styles.trustPill}>#{t}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function CreatorsDirectoryClient({ creators }: { creators: Creator[] }) {
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string>('전체');
  const [sort, setSort] = useState<Sort>('popular');
  const directoryCreators = creators as DirectoryCreator[];

  // 검색·토픽 필터
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = directoryCreators.filter(c => {
      if (!matchTopic(c, activeTopic)) return false;
      if (!q) return true;
      return c.display_name.toLowerCase().includes(q) || (c.bio || '').toLowerCase().includes(q);
    });
    if (sort === 'popular') list = list.slice().sort((a, b) => b.follower_count - a.follower_count);
    else if (sort === 'recent') list = list.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sort === 'posts') list = list.slice().sort((a, b) => b.post_count - a.post_count);
    return list;
  }, [directoryCreators, query, activeTopic, sort]);

  // Hero — 최상위 인기 1명
  const hero = useMemo(() => {
    return sortedByPopularity(directoryCreators)[0] || null;
  }, [directoryCreators]);

  // 인기 TOP 5 (가로 스크롤)
  const top5 = useMemo(() => {
    return sortedByPopularity(directoryCreators).slice(0, 5);
  }, [directoryCreators]);

  const discoverySections = useMemo(() => getDiscoverySections(directoryCreators), [directoryCreators]);

  return (
    <div className={styles.wrap}>
      <section className={styles.intro}>
        <div className={styles.introMain}>
          <span className={styles.introKicker}>재프콘 탐색</span>
          <h1>재테크 크리에이터를 발견하고 내 뉴스피드에서 따라보세요</h1>
          <p>
            ETF, 절세, 연금, 시장 인사이트까지. 팔로우하면 최신 글은 뉴스피드에 모이고,
            멤버십은 상품 단위 혜택과 후기로 판단할 수 있게 구성합니다.
          </p>
          <div className={styles.introActions}>
            <a href="#all-creators" className={styles.introPrimary}>전체 보기</a>
            <Link href="/creator/apply" className={styles.introSecondary}>재프콘 시작하기</Link>
          </div>
        </div>
        <div className={styles.launchBox}>
          <div className={styles.launchBoxTop}>
            <span>크리에이터 등록</span>
            <strong>공개 페이지 자동 생성</strong>
          </div>
          <div className={styles.launchUrl}>/creator/my-channel</div>
          <ol className={styles.launchSteps}>
            <li>로그인 후 크리에이터 모드 시작</li>
            <li>닉네임·소개·카테고리 입력</li>
            <li>재프콘 페이지 생성 후 멤버십 준비</li>
          </ol>
          <span className={styles.launchFoot}>등록 즉시 채널 홈이 열리고, 멤버십·정산·첫 글을 이어서 설정합니다.</span>
        </div>
      </section>

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

      {activeTopic === '전체' && !query && discoverySections.length > 0 && (
        <>
          {discoverySections.map(section => (
            <section key={section.key} className={styles.shelfSection}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>{section.title}</h2>
                  <span>{section.caption}</span>
                </div>
                <span>{section.items.length}개 채널</span>
              </div>
              <div className={styles.shelfGrid}>
                {section.items.map(c => (
                  <DiscoveryCard key={`${section.key}-${c.id}`} creator={c} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

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
      <section className={styles.gridSection} id="all-creators">
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
