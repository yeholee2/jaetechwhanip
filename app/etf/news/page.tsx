import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_URL } from '@/lib/etfs';
import { SITE_NAME } from '@/lib/seo';
import { PageHero, Button } from '@/components/ui';
import { EtfNews } from '../EtfNews';
import styles from '../EtfPage.module.css';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ETF 뉴스',
  description: 'ETF·시장·정책 관련 주요 뉴스를 모아봐요.',
  keywords: ['ETF 뉴스', 'ETF 시황', '시장 뉴스', SITE_NAME],
  alternates: { canonical: '/etf/news' },
  openGraph: {
    title: `ETF 뉴스 | ${SITE_NAME}`,
    description: 'ETF·시장·정책 뉴스',
    url: `${ETF_HOME_URL}/news`,
    type: 'website',
  },
};

export default function EtfNewsPage() {
  return (
    <AppShell active="etf" hideSlogan>
      <main className={styles.page}>
        <PageHero
          eyebrow="ETF 뉴스"
          title="ETF·시장 흐름을 따라가요"
          lead="ETF·시장·정책 관련 주요 기사. 더 깊은 글은 피드의 뉴스/리포트/칼럼 탭에서 만나보세요."
          aside={<Button href="/feed?tab=news" variant="outline" size="sm">통합 피드 →</Button>}
        />

        <EtfNews />
      </main>
    </AppShell>
  );
}
