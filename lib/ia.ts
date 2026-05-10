import { CATEGORY_DEFINITIONS } from '@/lib/categories';

export const CATEGORY_FILTERS = [
  { key: '전체', label: '전체' },
  ...CATEGORY_DEFINITIONS.map(category => ({
    key: category.key,
    label: `${category.emoji} ${category.label}`,
  })),
];

export const HOME_TABS = [
  { key: 'popular', label: '인기' },
  { key: 'latest', label: '최신' },
  { key: 'waiting', label: '답변대기' },
];

export const TOPIC_TABS = [
  { key: 'popular', label: '인기토픽' },
  { key: 'new', label: '신규토픽' },
  { key: 'following', label: '팔로잉' },
];

export const SPARRING_TABS = [
  { key: 'ongoing', label: '진행중' },
  { key: 'ending', label: '마감임박' },
  { key: 'closed', label: '종료' },
];

export const FEED_TABS = [
  { key: 'column', label: '한입 칼럼' },
];

export const ARTICLE_TABS = FEED_TABS;
