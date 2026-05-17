import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { ApplyForm } from './ApplyForm';

export const metadata: Metadata = {
  title: '재프콘 신청 (베타)',
  description: '재테크 콘텐츠를 만들고 멤버십으로 수익화하세요. 베타 기간 초청 심사.',
  keywords: ['재프콘', '크리에이터', '멤버십', '구독', '재테크 콘텐츠', SITE_NAME],
  alternates: { canonical: '/creator/apply' },
  openGraph: {
    title: `재프콘 신청 (베타) | ${SITE_NAME}`,
    description: '재테크 콘텐츠로 수익화하세요. 신청 후 1:1 심사.',
    url: `${SITE_URL}/creator/apply`,
    type: 'website',
  },
};

export default function CreatorApplyPage() {
  return (
    <AppShell active="my" wide hideSlogan>
      <main className="pc-layout-stack">
        <ApplyForm />
      </main>
    </AppShell>
  );
}
