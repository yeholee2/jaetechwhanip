import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_URL } from '@/lib/etfs';
import { SITE_NAME } from '@/lib/seo';
import { PageSidebar } from '@/components/PageSidebar';
import { MarketTicker } from '../MarketTicker';
import { EtfPageTabs } from '../EtfPageTabs';
import { fetchTrendingEtfs } from '@/lib/ai/trendingEtfs';
import styles from './Trending.module.css';

export const revalidate = 21600; // 6시간

export const metadata: Metadata = {
  title: '지금 핫한 ETF — 한입 AI',
  description: '오늘 큰 흐름을 만드는 ETF 테마를 한입 AI가 정리해드려요.',
  keywords: ['핫한 ETF', 'ETF 트렌드', 'AI ETF 분석', SITE_NAME],
  alternates: { canonical: '/etf/trending' },
  openGraph: {
    title: `지금 핫한 ETF | ${SITE_NAME}`,
    description: '한입 AI 가 정리한 오늘의 ETF 흐름',
    url: `${ETF_HOME_URL}/trending`,
    type: 'website',
  },
};

export default async function EtfTrendingPage() {
  const data = await fetchTrendingEtfs();
  const generatedTime = new Date(data.generatedAt).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <AppShell active="etf" wide hideSlogan>
      <main className="pc-layout-stack">
        <MarketTicker />
        <div className="pc-layout">
          <div className="pc-layout-main">
            <EtfPageTabs active="discover" />

            <section className={styles.aiHero}>
              <div className={styles.aiHeroHead}>
                <span className={styles.aiBadge}>
                  <span className={styles.sparkle}>✨</span>
                  한입 AI 가 정리한 오늘의 흐름
                </span>
                <span className={styles.timestamp}>{generatedTime} 기준</span>
              </div>
              <p className={styles.aiSummary}>{data.aiSummary}</p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>가장 크게 움직인 ETF</h2>
              <div className={styles.moversGrid}>
                {data.topMovers.map(m => (
                  <Link key={m.code} href={`/etf/${encodeURIComponent(m.slug)}`} className={styles.moverCard}>
                    <div className={styles.moverHead}>
                      <strong>{m.shortName}</strong>
                      <span className={styles.moverCode}>{m.code}</span>
                    </div>
                    <span className={`${styles.moverChange} ${m.tone === 'up' ? styles.up : m.tone === 'down' ? styles.down : ''}`}>
                      {m.change}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>테마별 흐름</h2>
              {data.buckets.length === 0 ? (
                <div className={styles.empty}>오늘은 큰 흐름이 만들어지지 않았어요. 잠시 후 다시 확인해 보세요.</div>
              ) : (
                <div className={styles.bucketList}>
                  {data.buckets.map(b => (
                    <article key={b.theme} className={styles.bucket}>
                      <div className={styles.bucketHead}>
                        <span className={`${styles.dirChip} ${b.direction === 'up' ? styles.dirUp : b.direction === 'down' ? styles.dirDown : styles.dirMixed}`}>
                          {b.direction === 'up' ? '↑ 상승' : b.direction === 'down' ? '↓ 하락' : '⇄ 혼조'}
                        </span>
                        <h3>{b.theme}</h3>
                      </div>
                      <ul className={styles.bucketEtfs}>
                        {b.etfs.map(e => (
                          <li key={e.code}>
                            <Link href={`/etf/${encodeURIComponent(e.slug)}`} className={styles.bucketLink}>
                              <span>{e.shortName}</span>
                              <strong>{e.change}</strong>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <footer className={styles.disclaimer}>
              한입 AI 가 시장 데이터를 토대로 작성해요. 투자 권유가 아닌 정보 참고용이에요.
            </footer>
          </div>
          <PageSidebar widgets={['watch']} />
        </div>
      </main>
    </AppShell>
  );
}
