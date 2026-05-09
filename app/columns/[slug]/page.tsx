import { permanentRedirect } from 'next/navigation';

export default function LegacyColumnDetailPage({ params }: { params: { slug: string } }) {
  permanentRedirect(`/feed/${encodeURIComponent(params.slug)}`);
}

