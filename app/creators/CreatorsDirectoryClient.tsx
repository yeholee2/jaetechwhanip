'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Creator } from '@/lib/creator';
import { CATEGORY_EMOJI, CATEGORY_LABELS, getCategoryLabel, getCategoryLabelFromTopic, topicMatchesCategory } from '@/lib/categories';
import { trackEvent } from '@/lib/analytics';
import { FaIcon } from '@/components/FaIcon';
import { Chip } from '@/components/ui';
import styles from './CreatorsDirectory.module.css';

type Sort = 'popular' | 'recent' | 'posts';

const CATEGORY_FILTERS = CATEGORY_LABELS;
const CAT_EMOJI = CATEGORY_EMOJI;

type DirectoryCreator = Creator & {
  badge?: string;
  coverGradient?: string;
  verified?: boolean;
  credential?: string;
};

type SpotlightSlide =
  | {
      kind: 'promo';
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      href: string;
      ctaLabel: string;
      tone: 'explore' | 'launch';
    }
  | {
      kind: 'creator';
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      href: string;
      creator: DirectoryCreator;
    };

const DISCOVERY_SECTIONS = [
  {
    key: 'etf',
    title: 'HOT ETF 재프콘',
    caption: 'ETF·연금·배당 흐름을 꾸준히 발행하는 채널',
    topics: ['국내주식·ETF', '해외주식·ETF', '배당주·ETF', '적립식·연금'],
  },
  {
    key: 'wealth',
    title: '절세·연금·자산관리',
    caption: '직장인 돈관리와 세금 이슈를 바로 적용하기 좋게',
    topics: ['절세', '적립식·연금', '자산관리', '재테크입문'],
  },
  {
    key: 'market',
    title: '테마·트렌드',
    caption: '미국장·금리·환율 흐름을 따라가기 쉽게',
    topics: ['테마·트렌드', '해외주식·ETF', '국내주식·ETF'],
  },
  {
    key: 'new',
    title: '신규 재프콘',
    caption: '새로 열린 채널을 먼저 팔로우해 보세요',
    topics: [],
  },
] as const;

function displayTopics(creator: Creator, limit: number) {
  const seen = new Set<string>();
  return creatorTopics(creator)
    .map(getCategoryLabelFromTopic)
    .filter(topic => {
      if (seen.has(topic)) return false;
      seen.add(topic);
      return true;
    })
    .slice(0, limit);
}

// 홈 카테고리 체계로 normalize하되, 기존 재프콘 토픽도 호환 매칭
function matchTopic(creator: Creator, filter: string): boolean {
  if (filter === '전체') return true;
  const topics = (creator as any).topics || [];
  return topics.some((t: string) => topicMatchesCategory(t, filter));
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
    filters.some(filter => topicMatchesCategory(t, filter))
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

function CreatorsSpotlightCarousel({ creators }: { creators: DirectoryCreator[] }) {
  const creatorSlides = sortedByPopularity(creators)
    .slice(0, 9)
    .map((creator): SpotlightSlide => ({
      kind: 'creator',
      id: creator.id,
      eyebrow: creator.membership_enabled ? '멤버십 재프콘' : '무료 재프콘',
      title: creator.display_name,
      description: creator.bio || '재테크 인사이트를 꾸준히 발행하는 채널입니다.',
      href: `/creator/${creator.slug}`,
      creator,
    }));
  const slides: SpotlightSlide[] = [
    {
      kind: 'promo',
      id: 'jaefcon-explore',
      eyebrow: '재프콘 탐색',
      title: '재테크 크리에이터 찾기',
      description: 'ETF, 절세, 연금, 테마·트렌드 채널을 발견하고 내 뉴스피드에서 새 글을 모아보세요.',
      href: '#all-creators',
      ctaLabel: '전체 보기',
      tone: 'explore',
    },
    {
      kind: 'promo',
      id: 'jaefcon-launch',
      eyebrow: '크리에이터 등록',
      title: '내 채널 자동 생성',
      description: '닉네임과 한 줄 소개만으로 공개 페이지가 열리고, 글·시리즈·멤버십으로 확장할 수 있어요.',
      href: '/creator/apply',
      ctaLabel: '재프콘 시작하기',
      tone: 'launch',
    },
    ...creatorSlides,
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = slides[activeIndex] || slides[0];

  useEffect(() => {
    trackEvent({ kind: 'impression', target: 'creators_jaefcon_carousel' });
  }, []);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  useEffect(() => {
    if (!active) return;
    trackEvent({
      kind: 'impression',
      target: 'creators_jaefcon_slide',
      meta: { id: active.id, title: active.title },
    });
  }, [active]);

  const go = (direction: -1 | 1) => {
    if (slides.length < 2) return;
    setActiveIndex(index => (index + direction + slides.length) % slides.length);
  };

  const placementFor = (index: number) => {
    if (index === activeIndex) return styles.carouselSlideActive;
    if (slides.length < 2) return styles.carouselSlideHidden;
    if (index === (activeIndex - 1 + slides.length) % slides.length) return styles.carouselSlidePrev;
    if (index === (activeIndex + 1) % slides.length) return styles.carouselSlideNext;
    return styles.carouselSlideHidden;
  };

  if (!active) return null;

  return (
    <section className={styles.spotlightCarousel} aria-label="재프콘 추천 캐러셀">
      <div className={styles.carouselStage}>
        {slides.map((slide, index) => (
          <Link
            key={slide.id}
            href={slide.href}
            className={`${styles.carouselSlide} ${placementFor(index)} ${slide.kind === 'promo' ? styles.carouselPromoSlide : styles.carouselCreatorSlide} ${slide.kind === 'promo' && slide.tone === 'launch' ? styles.carouselPromoLaunch : ''}`}
            style={slide.kind === 'creator' ? coverStyle(slide.creator) : undefined}
            tabIndex={index === activeIndex ? 0 : -1}
            aria-hidden={index === activeIndex ? undefined : true}
            onClick={() => trackEvent({ kind: 'click', target: 'creators_jaefcon_slide', meta: { id: slide.id, href: slide.href } })}
          >
            <span className={styles.carouselShade} aria-hidden />
            {slide.kind === 'promo' ? (
              <>
                <div className={styles.carouselGridPattern} aria-hidden />
                <div className={styles.carouselStickerCloud} aria-hidden>
                  <span>ETF</span>
                  <span>ISA</span>
                  <span>연금</span>
                </div>
                <div className={styles.carouselPromoMark} aria-hidden>재프콘</div>
              </>
            ) : (
              <CreatorAvatar creator={slide.creator} className={styles.carouselAvatar} />
            )}
            <div className={styles.carouselCopy}>
              <span className={styles.carouselEyebrow}>{slide.eyebrow}</span>
              <h1>{slide.title}</h1>
              <p>{slide.description}</p>
              {slide.kind === 'creator' ? (
                <div className={styles.carouselStats}>
                  <span>{slide.creator.follower_count.toLocaleString()} 팔로워</span>
                  <span>{slide.creator.member_count.toLocaleString()} 멤버</span>
                  <span>{slide.creator.post_count.toLocaleString()} 글</span>
                </div>
              ) : (
                <span className={styles.carouselCta}>{slide.ctaLabel}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
      {slides.length > 1 && (
        <div className={styles.carouselControls}>
          <span className={styles.carouselCount}>
            {activeIndex + 1} / {slides.length}
          </span>
          <button type="button" onClick={() => go(-1)} aria-label="이전 재프콘">
            <FaIcon name="chevron-left" size={18} />
          </button>
          <button
            type="button"
            onClick={() => setPaused(value => !value)}
            aria-label={paused ? '재프콘 캐러셀 재생' : '재프콘 캐러셀 일시정지'}
          >
            <FaIcon name={paused ? 'play' : 'pause'} size={16} />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="다음 재프콘">
            <FaIcon name="chevron-right" size={18} />
          </button>
        </div>
      )}
    </section>
  );
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
          {displayTopics(creator, 2).map(t => (
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

  // 인기 TOP 5 (가로 스크롤)
  const top5 = useMemo(() => {
    return sortedByPopularity(directoryCreators).slice(0, 5);
  }, [directoryCreators]);

  const discoverySections = useMemo(() => getDiscoverySections(directoryCreators), [directoryCreators]);

  return (
    <div className={styles.wrap}>
      <CreatorsSpotlightCarousel creators={directoryCreators} />

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
        {CATEGORY_FILTERS.map(t => (
          <Chip key={t} active={activeTopic === t} size="sm" onClick={() => setActiveTopic(t)}>
            {CAT_EMOJI[t] && <span className="tf">{CAT_EMOJI[t]}</span>}
            {t === '전체' ? t : getCategoryLabel(t)}
          </Chip>
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
                  {displayTopics(c, 3).length > 0 && (
                    <div className={styles.cardTopics}>
                      {displayTopics(c, 3).map(t => (
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
