import type { Metadata } from 'next';
import MyPageClient from './MyPageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '마이페이지',
  description: '내 질문·답변·북마크·포트폴리오를 한 곳에서.',
  robots: { index: false, follow: false },
};

export default function MyPage() {
  return <MyPageClient />;
}
