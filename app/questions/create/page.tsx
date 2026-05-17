import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { SITE_NAME } from '@/lib/seo';
import { CreateQuestionClient } from './CreateQuestionClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '질문하기',
  description: '재테크 궁금증을 한입에 물어보세요. ETF·종목·세금·연금 무엇이든.',
  alternates: { canonical: '/questions/create' },
  openGraph: {
    title: `질문하기 | ${SITE_NAME}`,
    description: '재테크 한입 — 한 줄로 시작하는 질문',
    url: '/questions/create',
    type: 'website',
  },
  robots: { index: false, follow: false },
};

export default async function CreateQuestionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth?next=/questions/create');
  }

  return (
    <AppShell active="home" hideSlogan>
      <CreateQuestionClient userId={user.id} />
    </AppShell>
  );
}
