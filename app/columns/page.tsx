import { permanentRedirect } from 'next/navigation';

export default function LegacyColumnsPage() {
  permanentRedirect('/articles');
}
