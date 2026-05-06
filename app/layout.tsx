import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://jaetechwhanip.vercel.app'),
  title: {
    default: '재테크한입 | 돈 고민, 여기서 해결',
    template: '%s | 재테크한입',
  },
  description: '진지하게 재테크 공부하고 싶은 20-30대를 위한 금융 특화 Q&A 커뮤니티. 주식·ETF, 절세, 보험, 대출까지 전문가가 답해드려요.',
  keywords: ['재테크', '주식', 'ETF', 'ISA', '연금저축', '실손보험', '학자금대출', 'S&P500', '재테크입문'],
  openGraph: {
    title: '재테크한입 | 돈 고민, 여기서 해결',
    description: '금융 특화 Q&A 커뮤니티. 질문하고 답변하면 베리가 쌓여요.',
    url: 'https://jaetechwhanip.vercel.app',
    siteName: '재테크한입',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '재테크한입 | 돈 고민, 여기서 해결',
    description: '금융 특화 Q&A 커뮤니티',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
