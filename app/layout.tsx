import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import '@fortawesome/fontawesome-free/css/all.css';
import './globals.css';
import { PageViewTracker } from '@/components/PageViewTracker';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { Suspense } from 'react';

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
  // Search Console 검증 토큰 — 환경변수로 주입
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || '',
    },
  },
};

// Organization 구조화 데이터 — 브랜드 검색·지식 그래프 노출
const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  alternateName: '재테크한입',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  description: '금융 특화 Q&A 커뮤니티. 주식·ETF, 절세, 보험, 대출까지 전문가가 답해드려요.',
  sameAs: [
    // 'https://twitter.com/jaetechwhanip',
    // 'https://www.instagram.com/jaetechwhanip',
  ],
};

const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'ko-KR',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
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
        {/* TossFace CDN — preconnect 로 폰트 round-trip 단축 (LCP 개선) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Organization + WebSite 구조화 데이터 — Google 지식 그래프 노출 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSONLD).replace(/</g, '\\u003c') }}
        />
      </head>
      <body>
        <PageViewTracker />
        <Suspense fallback={null}>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  );
}
