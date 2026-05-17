import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import type { Creator, CreatorPost } from '@/lib/creator';
import { fetchCreatorStats } from '@/lib/creatorStats';
import { CreatorPageClient } from './CreatorPageClient';

export const revalidate = 60;

type Props = { params: { slug: string } };

async function fetchCreator(slug: string): Promise<Creator | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('slug', decodeURIComponent(slug))
    .eq('is_published', true)
    .maybeSingle();
  return data as Creator | null;
}

async function fetchPosts(creatorId: string): Promise<CreatorPost[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('creator_posts')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(30);
  return (data || []) as CreatorPost[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const creator = await fetchCreator(params.slug);
  if (!creator) {
    return { title: '크리에이터를 찾을 수 없어요', robots: { index: false } };
  }
  return {
    title: `${creator.display_name} | 재프콘`,
    description: creator.bio || `${creator.display_name} 의 재테크 콘텐츠 멤버십.`,
    keywords: [creator.display_name, '재프콘', ...(creator.topics || []), SITE_NAME],
    alternates: { canonical: `/creator/${creator.slug}` },
    openGraph: {
      title: `${creator.display_name} | ${SITE_NAME}`,
      description: creator.bio || '',
      url: `${SITE_URL}/creator/${creator.slug}`,
      images: creator.avatar_url ? [creator.avatar_url] : undefined,
      type: 'profile',
    },
  };
}

export default async function CreatorPage({ params }: Props) {
  const creator = await fetchCreator(params.slug);
  if (!creator) notFound();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === creator.user_id;

  const [posts, stats] = await Promise.all([
    fetchPosts(creator.id),
    fetchCreatorStats(creator.id),
  ]);

  return (
    <AppShell active="my" wide hideSlogan minimalNav>
      <CreatorPageClient creator={creator} posts={posts} stats={stats} isOwner={isOwner} />
    </AppShell>
  );
}
