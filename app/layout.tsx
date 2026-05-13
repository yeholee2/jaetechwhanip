import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import '@fortawesome/fontawesome-free/css/all.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  category: 'finance',
  title: {
    default: '재테크한입 | 돈 고민, 여기서 해결',
    template: '%s | 재테크한입',
  },
  description: '진지하게 재테크 공부하고 싶은 20-30대를 위한 금융 특화 Q&A 커뮤니티. 주식·ETF, 절세, 보험, 대출까지 전문가가 답해드려요.',
  keywords: ['재테크', '주식', 'ETF', 'ISA', '연금저축', '실손보험', '학자금대출', 'S&P500'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '재테크한입 | 돈 고민, 여기서 해결',
    description: '금융 특화 Q&A 커뮤니티. 질문하고 답변하면 베리가 쌓여요.',
    url: SITE_URL,
    siteName: SITE_NAME,
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
  // 다크 모드 FOUC 방지: hydration 전에 <html data-theme> 세팅
  const themeScript = `
    try {
      var k = localStorage.getItem('etfhanip:theme');
      var t = k === 'dark' || k === 'light'
        ? k
        : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {}
  `;
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
