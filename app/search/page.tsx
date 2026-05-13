import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { etfs, etfPath } from '@/lib/etfs';
import { sampleQuestions } from '@/lib/sampleData';
import { listSparrings, sparringPath } from '@/lib/sparring';
import { fetchGhostArticles, articleUrl } from '@/lib/feed';
import { fetchRecentReportsWithFallback } from '@/lib/reports';
import { SITE_NAME } from '@/lib/seo';
import { PageHero, Badge, Card } from '@/components/ui';
import { PageSidebar } from '@/components/PageSidebar';
import Link from 'next/link';
import { EtfLogo } from '../etf/EtfLogo';
import { PORTFOLIO_TEMPLATES } from '@/lib/portfolioTemplates';
import { WHALE_PORTFOLIOS } from '@/lib/portfolioWhales';
import styles from './Search.module.css';

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { q?: string };
}): Promise<Metadata> {
  const q = searchParams?.q || '';
  return {
    title: q ? `"${q}" 검색 결과` : '통합 검색',
    description: `ETF·질문·뉴스·리포트·칼럼을 한 번에 검색해 결과를 보여드려요.`,
    keywords: ['검색', q, SITE_NAME].filter(Boolean) as string[],
    robots: { index: false, follow: true },
  };
}

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, '');
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = (searchParams?.q || '').trim();
  const nq = normalize(q);

  // ETF
  const etfMatches = !nq
    ? []
    : etfs
        .filter(e => (
          normalize(e.name).includes(nq) ||
          normalize(e.shortName).includes(nq) ||
          e.code.includes(nq) ||
          normalize(e.issuer).includes(nq) ||
          normalize(e.theme || '').includes(nq) ||
          (e.tags || []).some(t => normalize(t).includes(nq))
        ))
        .slice(0, 6);

  // 질문
  const questionMatches = !nq
    ? []
    : sampleQuestions
        .filter(qn => (
          normalize(qn.title).includes(nq) ||
          normalize(qn.body || '').includes(nq) ||
          (qn.tags || []).some((t: string) => normalize(t).includes(nq))
        ))
        .slice(0, 5);

  // 스파링 + 피드/리포트
  const [sparringRes, articles, reports] = await Promise.all([
    listSparrings(),
    fetchGhostArticles(),
    fetchRecentReportsWithFallback(),
  ]);

  const sparringMatches = !nq
    ? []
    : sparringRes.sparrings
        .filter(s => (
          normalize(s.title).includes(nq) ||
          normalize(s.body || '').includes(nq)
        ))
        .slice(0, 4);

  const articleMatches = !nq
    ? []
    : articles
        .filter(a => (
          normalize(a.title).includes(nq) ||
          normalize(a.description || '').includes(nq) ||
          (a.tags || []).some(t => normalize(t).includes(nq))
        ))
        .slice(0, 4);

  const reportMatches = !nq
    ? []
    : reports
        .filter(r => (
          normalize(r.title).includes(nq) ||
          normalize(r.summary || '').includes(nq) ||
          normalize(r.source || '').includes(nq)
        ))
        .slice(0, 4);

  // 대가 포트폴리오 모델
  const templateMatches = !nq
    ? []
    : PORTFOLIO_TEMPLATES.filter(t =>
        normalize(t.name).includes(nq) ||
        normalize(t.author).includes(nq) ||
        normalize(t.tagline).includes(nq) ||
        normalize(t.description).includes(nq)
      ).slice(0, 4);

  // 실시간 13F 펀드
  const whaleMatches = !nq
    ? []
    : WHALE_PORTFOLIOS.filter(w =>
        normalize(w.manager).includes(nq) ||
        normalize(w.name).includes(nq) ||
        normalize(w.philosophy || '').includes(nq)
      ).slice(0, 4);

  const totalHits = etfMatches.length + questionMatches.length + sparringMatches.length
    + articleMatches.length + reportMatches.length + templateMatches.length + whaleMatches.length;

  return (
    <AppShell active="home" wide hideSlogan>
      <main className="pc-layout">
        <div className="pc-layout-main">
        <PageHero
          eyebrow="통합 검색"
          title={q ? `"${q}" 검색 결과` : '무엇을 찾고 있나요?'}
          lead={q ? `ETF·질문·스파링·뉴스·칼럼·리포트에서 총 ${totalHits}건 찾았어요.` : '상단 검색 아이콘으로 키워드를 입력하면 결과가 여기에 보여요.'}
          aside={q && totalHits > 0 ? <Badge tone="primary">{totalHits}건</Badge> : undefined}
        />

        {!q && (
          <Card pad="lg" className={styles.empty}>
            <p>상단 ⌕ 검색 아이콘을 누르고 단어를 입력하면 모든 영역에서 한 번에 검색돼요.</p>
          </Card>
        )}

        {q && totalHits === 0 && (
          <Card pad="lg" className={styles.empty}>
            <p>"{q}" 와(과) 관련된 결과를 찾지 못했어요. 다른 단어로 다시 검색해보세요.</p>
          </Card>
        )}

        {/* ETF */}
        {etfMatches.length > 0 && (
          <section className={styles.group}>
            <h2>ETF <span>{etfMatches.length}</span></h2>
            <ul>
              {etfMatches.map(etf => (
                <li key={etf.slug}>
                  <Link className={styles.etfItem} href={etfPath(etf.slug)}>
                    <EtfLogo name={etf.shortName} size={32} />
                    <div>
                      <strong>{etf.shortName}</strong>
                      <span>{etf.code} · {etf.issuer}</span>
                    </div>
                    <span className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 대가 모델 포트폴리오 */}
        {templateMatches.length > 0 && (
          <section className={styles.group}>
            <h2>대가 모델 <span>{templateMatches.length}</span></h2>
            <ul>
              {templateMatches.map(t => (
                <li key={t.slug}>
                  <Link className={styles.etfItem} href={`/portfolio/templates/${t.slug}`}>
                    <div>
                      <strong>{t.name}</strong>
                      <span>{t.author} · {t.tagline}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 700 }}>
                      위험 {t.risk}/5
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 실시간 13F 펀드 */}
        {whaleMatches.length > 0 && (
          <section className={styles.group}>
            <h2>실시간 13F <span>{whaleMatches.length}</span></h2>
            <ul>
              {whaleMatches.map(w => (
                <li key={w.slug}>
                  <Link className={styles.etfItem} href={`/portfolio/whales/${w.slug}`}>
                    <div>
                      <strong>{w.manager}</strong>
                      <span>{w.name} · {w.quarter}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 700 }}>
                      {w.positionCount}개 보유
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 질문 */}
        {questionMatches.length > 0 && (
          <section className={styles.group}>
            <h2>질문 <span>{questionMatches.length}</span></h2>
            <ul>
              {questionMatches.map(qn => (
                <li key={qn.slug}>
                  <Link className={styles.textItem} href={`/q/${qn.slug}`}>
                    <Badge tone="primary">🦊 질문</Badge>
                    <strong>{qn.title}</strong>
                    <span>{qn.cat}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 스파링 */}
        {sparringMatches.length > 0 && (
          <section className={styles.group}>
            <h2>스파링 <span>{sparringMatches.length}</span></h2>
            <ul>
              {sparringMatches.map(s => (
                <li key={s.id}>
                  <Link className={styles.textItem} href={sparringPath(s.slug)}>
                    <Badge tone="warning">⚔️ 스파링</Badge>
                    <strong>{s.title}</strong>
                    <span>{s.stats.votes_total}표</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 칼럼 */}
        {articleMatches.length > 0 && (
          <section className={styles.group}>
            <h2>한입 칼럼 <span>{articleMatches.length}</span></h2>
            <ul>
              {articleMatches.map(a => (
                <li key={a.slug}>
                  <Link className={styles.textItem} href={articleUrl(a.slug)}>
                    <Badge tone="success">✍️ 칼럼</Badge>
                    <strong>{a.title}</strong>
                    <span>{a.readingTime}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 리포트 */}
        {reportMatches.length > 0 && (
          <section className={styles.group}>
            <h2>리포트 <span>{reportMatches.length}</span></h2>
            <ul>
              {reportMatches.map(r => (
                <li key={r.id}>
                  <a className={styles.textItem} href={r.url} target="_blank" rel="noreferrer">
                    <Badge tone="purple">📊 리포트</Badge>
                    <strong>{r.title}</strong>
                    <span>{r.source}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        </div>
        <PageSidebar widgets={['watch', 'etf-nav', 'help']} />
      </main>
    </AppShell>
  );
}
