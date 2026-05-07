import { permanentRedirect } from 'next/navigation';

type Props = { params: { slug: string } };

export default function LegacyQuestionPage({ params }: Props) {
  permanentRedirect(`/q/${params.slug}`);
}
