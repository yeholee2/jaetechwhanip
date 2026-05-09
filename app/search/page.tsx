import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { TOPICS, topicPath } from '@/lib/topics';
import { fetchFeedItems, articleUrl, newsClickUrl } from '@/lib/feed';
import { listSparrings } from '@/lib/sparring';
import { sampleQuestions } from '@/lib/sampleData';
import type { BookmarkTargetType } from '@/lib/bookmarks';
import SearchClient, { type SearchBuckets, type SearchResultItem } from './SearchClient';

export const metadata: Metadata = {
  title: '통합 검색 | 재테크한입',
  description: '재테크한입의 질문, 스파링, 피드, 토픽을 한 번에 검색합니다.',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const query = (searchParams?.q || '').trim();
  const results = query ? await buildSearchResults(query) : emptyResults();

  return (
    <AppShell active="home">
      <SearchClient query={query} results={results} />
    </AppShell>
  );
}

async function buildSearchResults(query: string): Promise<SearchBuckets> {
  const [questions, sparringList, feedItems] = await Promise.all([
    searchQuestions(query),
    listSparrings(),
    fetchFeedItems(),
  ]);

  const sparrings: SearchResultItem[] = sparringList.sparrings
    .filter(item => matches(query, item.title, item.body || '', item.category, item.side_a_label, item.side_b_label))
    .map(item => ({
      id: item.id,
      type: 'sparring',
      title: item.title,
      body: `${item.side_a_label} vs ${item.side_b_label}`,
      href: `/sparring/${encodeURIComponent(item.slug)}`,
      category: item.category,
      meta: `${item.round_number} 라운드 · 투표 ${item.stats.votes_total.toLocaleString('ko-KR')}명`,
      bookmark: {
        targetType: 'sparring',
        targetId: item.slug,
      },
    }));

  const feed: SearchResultItem[] = feedItems
    .filter(item => matches(
      query,
      item.title,
      item.type === 'column' ? item.description : item.summary,
      item.category,
      item.type === 'column' ? item.tags.join(' ') : item.source,
    ))
    .map(item => {
      const isColumn = item.type === 'column';
      const href = isColumn ? articleUrl(item.slug) : newsClickUrl(item.url);
      return {
        id: isColumn ? item.slug : item.url,
        type: 'feed' as const,
        title: item.title,
        body: isColumn ? item.description : item.summary,
        href,
        category: item.category,
        meta: isColumn ? `한입 칼럼 · ${item.readingTime}` : `뉴스 · ${item.source}`,
        external: !isColumn,
        bookmark: {
          targetType: 'column' as BookmarkTargetType,
          targetId: isColumn ? item.slug : item.url,
        },
      };
    });

  const topics: SearchResultItem[] = TOPICS
    .filter(topic => matches(query, topic.label, topic.title, topic.description, topic.keywords.join(' '), topic.aliases?.join(' ') || ''))
    .map(topic => ({
      id: topic.slug,
      type: 'topic',
      title: `${topic.emoji} ${topic.label}`,
      body: topic.description,
      href: topicPath(topic.slug),
      category: '토픽',
      meta: '팔로우하고 새 글을 모아보세요',
      follow: {
        targetId: topic.category,
        title: topic.label,
      },
    }));

  return { questions, sparrings, feed, topics };
}

function emptyResults(): SearchBuckets {
  return { questions: [], sparrings: [], feed: [], topics: [] };
}

async function searchQuestions(query: string): Promise<SearchResultItem[]> {
  const fromSupabase = await searchQuestionsFromSupabase(query);
  const source = fromSupabase.length > 0
    ? fromSupabase
    : sampleQuestions.filter(item => matches(query, item.title, item.body, item.cat, item.topic, item.tags?.join(' ') || ''));

  return source.map(item => ({
    id: String(item.id),
    type: 'question',
    title: item.title,
    body: item.body || '',
    href: `/q/${encodeURIComponent(item.slug || String(item.id))}`,
    category: item.category || item.cat || '질문',
    meta: `답변 ${item.answer_count ?? item.ans ?? 0}개`,
    bookmark: {
      targetType: 'question' as BookmarkTargetType,
      targetId: item.slug || String(item.id),
    },
  }));
}

async function searchQuestionsFromSupabase(query: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  const pattern = encodeURIComponent(`*${query.replace(/[(),]/g, ' ').trim()}*`);
  const url = `${supabaseUrl}/rest/v1/questions?select=id,slug,title,body,category,answer_count&or=(title.ilike.${pattern},body.ilike.${pattern},category.ilike.${pattern})&order=created_at.desc&limit=40`;

  try {
    const response = await fetch(url, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function matches(query: string, ...parts: Array<string | null | undefined>) {
  const needle = normalize(query);
  if (!needle) return false;
  return parts.some(part => normalize(part || '').includes(needle));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '');
}
