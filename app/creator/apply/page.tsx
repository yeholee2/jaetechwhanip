import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { OnboardClient } from './OnboardClient';

export const metadata: Metadata = {
  title: '재프콘 시작하기',
  description: '30초만에 내 재테크 콘텐츠 페이지를 만들고 멤버십으로 수익화하세요.',
  keywords: ['재프콘', '크리에이터', '멤버십', '구독', '재테크 콘텐츠', SITE_NAME],
  alternates: { canonical: '/creator/apply' },
  openGraph: {
    title: `재프콘 시작하기 | ${SITE_NAME}`,
    description: '30초만에 내 페이지를 만들고 콘텐츠로 수익화하세요.',
    url: `${SITE_URL}/creator/apply`,
    type: 'website',
  },
};

export default function CreatorApplyPage() {
  return (
    <AppShell active="creators" wide hideSlogan>
      <main className="pc-layout-stack">
        <OnboardClient />
      </main>
    </AppShell>
  );
}
