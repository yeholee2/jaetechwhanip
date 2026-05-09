import { permanentRedirect } from 'next/navigation';

export default function LegacyArticleDetailPage({ params }: { params: { slug: string } }) {
  permanentRedirect(`/feed/${encodeURIComponent(params.slug)}`);
}

