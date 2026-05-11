import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { getFeaturedActiveSparring, listSparrings, sparringPath } from '@/lib/sparring';
import { fetchGhostArticles, fetchRecentNewsItems, fetchRecentQuestions, articleUrl } from '@/lib/feed';
import { etfs, etfPath, ETF_HOME_PATH } from '@/lib/etfs';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import styles from './HomePage.module.css';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'ETF한입',
  description: 'ETF 자산을 한입에 관리해요. 시장 흐름·내 포트폴리오·토론·뉴스까지 한 곳에서.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `ETF한입 | ${SITE_NAME}`,
    description: 'ETF 자산을 한입에 관리해요.',
    url: SITE_URL,
    type: 'website',
  },
};

function fmtTime(value: string) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default async function HomePage() {
  const [{ sparrings }, ghostArticles, newsItems, questions] = await Promise.all([
    listSparrings(),
    fetchGhostArticles(),
    fetchRecentNewsItems(5),
    fetchRecentQuestions(5),
  ]);
  const featuredSparring = getFeaturedActiveSparring(sparrings);
  const featuredEtf = etfs[0];
  const topArticles = ghostArticles.slice(0, 3);
  const indices = [
    { name: '코스피', val: '7,822', chg: '+4.32%', up: true },
    { name: 'S&P500', val: '7,398', chg: '+0.84%', up: true },
    { name: '나스닥', val: '26,247', chg: '+1.71%', up: true },
    { name: '원달러', val: '1,474', chg: '+0.86%', up: true },
  ];

  return (
    <AppShell active="home" hideSlogan>
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>오늘의 한입</h1>
          <p>시장·포트폴리오·토론까지 한 화면에서 한입에.</p>
        </header>

        {/* Hero — 오늘의 ETF */}
        {featuredEtf && (
          <section className={styles.heroEtf}>
            <Link className={styles.heroLink} href={etfPath(featuredEtf.slug)}>
              <div className={styles.heroLabel}>오늘의 ETF</div>
              <h2 className={styles.heroTitle}>{featuredEtf.shortName}</h2>
              <div className={styles.heroMeta}>{featuredEtf.code} · {featuredEtf.theme}</div>
              <div className={styles.heroPriceRow}>
                <strong className={styles.heroPrice}>{featuredEtf.price}</strong>
                <span className={featuredEtf.changeTone === 'down' ? styles.down : styles.up}>
                  {featuredEtf.change}
                </span>
              </div>
              <p className={styles.heroOneLine}>{featuredEtf.oneLine}</p>
              <span className={styles.heroArrow}>전체 ETF 보기 →</span>
            </Link>
          </section>
        )}

        {/* 핫 스파링 */}
        {featuredSparring && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3>🔥 지금 뜨거운 스파링</h3>
              <Link className={styles.more} href="/sparring">더 보기 →</Link>
            </div>
            <Link className={styles.sparringCard} href={sparringPath(featuredSparring.slug)}>
              <span className={styles.sparringLabel}>
                {featuredSparring.stats.votes_total.toLocaleString()}명 투표 중 · {featuredSparring.round_number} 라운드
              </span>
              <strong className={styles.sparringTitle}>{featuredSparring.title}</strong>
              <div className={styles.sparringSides}>
                <span className={styles.sparringSideA}>{featuredSparring.side_a_label}</span>
                <span className={styles.vs}>vs</span>
                <span className={styles.sparringSideB}>{featuredSparring.side_b_label}</span>
              </div>
              <span className={styles.sparringCta}>참여하기 →</span>
            </Link>
          </section>
        )}

        {/* 시장 지수 미니 */}
        <section className={styles.indices}>
          {indices.map(i => (
            <div key={i.name} className={styles.indexItem}>
              <span className={styles.indexName}>{i.name}</span>
              <span className={styles.indexVal}>{i.val}</span>
              <span className={i.up ? styles.up : styles.down}>{i.chg}</span>
            </div>
          ))}
        </section>

        {/* 인기 질문 */}
        {questions.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3>💬 인기 질문</h3>
              <Link className={styles.more} href="/feed?tab=q">더 보기 →</Link>
            </div>
            <ul className={styles.listCard}>
              {questions.slice(0, 5).map(q => (
                <li key={q.slug}>
                  <Link className={styles.listItem} href={`/q/${q.slug}`}>
                    <span className={styles.itemBadge} data-type="question">🦊</span>
                    <div className={styles.itemInfo}>
                      <strong>{q.title}</strong>
                      <span>{q.category} · 답변 {q.answerCount}</span>
                    </div>
                    <span className={styles.itemArrow}>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 최신 뉴스 */}
        {newsItems.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3>📰 최신 뉴스</h3>
              <Link className={styles.more} href="/feed?tab=news">더 보기 →</Link>
            </div>
            <ul className={styles.listCard}>
              {newsItems.slice(0, 5).map(n => (
                <li key={n.slug}>
                  <a
                    className={styles.listItem}
                    href={n.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.itemBadge} data-type="news">📰</span>
                    <div className={styles.itemInfo}>
                      <strong>{n.title}</strong>
                      <span>{n.sourceName} · {fmtTime(n.publishedAt)}</span>
                    </div>
                    <span className={styles.itemArrow}>↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 한입 칼럼 추천 */}
        {topArticles.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3>✍️ 한입 칼럼</h3>
              <Link className={styles.more} href="/feed">더 보기 →</Link>
            </div>
            <div className={styles.articleGrid}>
              {topArticles.map(a => (
                <Link key={a.slug} className={styles.articleCard} href={articleUrl(a.slug)}>
                  {a.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.articleThumb} src={a.thumbnailUrl} alt="" />
                  ) : (
                    <div className={`${styles.articleThumb} ${styles.articleThumbFallback}`}>
                      <FaIcon name="newspaper" size={28} />
                    </div>
                  )}
                  <span className={styles.articleCategory}>{a.category}</span>
                  <strong className={styles.articleTitle}>{a.title}</strong>
                  <span className={styles.articleMeta}>{a.readingTime} · {fmtTime(a.publishedAt)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 마지막 CTA */}
        <Link className={styles.bigCta} href={ETF_HOME_PATH}>
          <div>
            <strong>내 ETF 포트폴리오 시작하기</strong>
            <span>수량·평단 입력하면 자산·비중·예상 배당 자동 계산</span>
          </div>
          <span className={styles.bigCtaArrow}>›</span>
        </Link>
      </main>
    </AppShell>
  );
}
