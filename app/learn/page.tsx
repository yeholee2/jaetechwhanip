/**
 * /learn — 배우기 통합 진입.
 *
 * 4 콘텐츠를 하나의 둘러보기 페이지로:
 *  - 칼럼 (Ghost / 한입 article)
 *  - 질문 (Q&A)
 *  - 뉴스 (외부 매체)
 *  - 리포트 (증권사·운용사)
 *  + 스파링 (토론) — 별도 섹션
 *
 * /q/[slug], /feed/[slug], /sparring/[slug] 상세는 그대로 살아있음 — SEO 안전.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHero, Badge, Card } from '@/components/ui';
import { PageSidebar } from '@/components/PageSidebar';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';
import { fetchFeedItems, articleUrl } from '@/lib/feed';
import { questionPath } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import styles from './LearnPage.module.css';

export const revalidate = 300;

const TABS = [
  { key: 'all',      label: '전체',   types: ['column', 'question', 'news', 'report'] as const },
  { key: 'q',        label: 'Q&A',    types: ['question'] as const },
  { key: 'column',   label: '칼럼',   types: ['column'] as const },
  { key: 'news',     label: '뉴스',   types: ['news'] as const },
  { key: 'report',   label: '리포트', types: ['report'] as const },
] as const;
type TabKey = typeof TABS[number]['key'];

function getTab(raw?: string): TabKey {
  return (TABS.find(t => t.key === raw)?.key as TabKey) || 'all';
}

const TYPE_META: Record<string, { label: string; tone: 'primary' | 'neutral' | 'success' | 'fresh' | 'purple' | 'orange' }> = {
  column:   { label: '칼럼',   tone: 'primary' },
  question: { label: 'Q&A',    tone: 'purple' },
  news:     { label: '뉴스',   tone: 'orange' },
  report:   { label: '리포트', tone: 'success' },
};

function itemLink(item: any): string {
  if (item.type === 'question') return questionPath(item.slug);
  if (item.type === 'news' || item.type === 'report') return item.originalUrl;
  return articleUrl(item.slug);
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

export const metadata: Metadata = {
  title: '배우기 — ETF · 시장 · 칼럼 · Q&A',
  description: '재테크한입의 칼럼·뉴스·리포트·질문을 한 곳에서. ETF 입문부터 시장 분석까지 한입씩 쉽게.',
  keywords: ['ETF 배우기', '재테크 칼럼', '시장 분석', '투자 Q&A', SITE_NAME],
  alternates: { canonical: '/learn' },
  openGraph: {
    title: `배우기 | ${SITE_NAME}`,
    description: 'ETF 입문부터 시장 분석까지 한입씩 쉽게.',
    url: `${SITE_URL}/learn`,
    type: 'website',
  },
};

export default async function LearnPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const tab = getTab(searchParams?.tab);
  const activeTypes = TABS.find(t => t.key === tab)?.types || (['column', 'question', 'news', 'report'] as const);

  const [items, sparringRes] = await Promise.all([
    fetchFeedItems(),
    listSparrings(),
  ]);
  const featured = getFeaturedActiveSparring(sparringRes.sparrings);

  const filtered = items.filter(it => (activeTypes as readonly string[]).includes(it.type));

  const counts = {
    all: items.length,
    q: items.filter(i => i.type === 'question').length,
    column: items.filter(i => i.type === 'column').length,
    news: items.filter(i => i.type === 'news').length,
    report: items.filter(i => i.type === 'report').length,
  };

  return (
    <AppShell active="feed" wide hideSlogan>
      <main className="pc-layout">
        <div className="pc-layout-main">
          <PageHero
            eyebrow={<Badge tone="primary">배우기</Badge>}
            title="ETF · 시장 · 칼럼 · Q&A"
            lead="재테크한입의 모든 글을 한 곳에서. 한입씩 가볍게 읽고 깊이 들어가요."
            aside={<Badge tone="neutral">{filtered.length}개</Badge>}
          />

          {/* 탭 */}
          <div className={styles.tabs}>
            {TABS.map(t => {
              const count = counts[t.key as keyof typeof counts] ?? 0;
              const active = t.key === tab;
              return (
                <Link
                  key={t.key}
                  href={t.key === 'all' ? '/learn' : `/learn?tab=${t.key}`}
                  className={`${styles.tab} ${active ? styles.tabOn : ''}`}
                >
                  <span>{t.label}</span>
                  <small>{count}</small>
                </Link>
              );
            })}
          </div>

          {/* 콘텐츠 카드 그리드 */}
          <div className={styles.grid}>
            {filtered.length === 0 && (
              <Card pad="lg" className={styles.empty}>아직 콘텐츠가 없어요.</Card>
            )}
            {filtered.slice(0, 60).map(item => {
              const meta = TYPE_META[item.type];
              const link = itemLink(item);
              const isExternal = link.startsWith('http');
              const CardLink: any = isExternal ? 'a' : Link;
              const cardProps = isExternal
                ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
                : { href: link };
              return (
                <CardLink key={`${item.type}-${item.slug}`} {...cardProps} className={styles.card}>
                  {(item as any).thumbnailUrl && (
                    <div className={styles.thumb}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={(item as any).thumbnailUrl} alt="" loading="lazy" />
                    </div>
                  )}
                  <div className={styles.body}>
                    <div className={styles.cardHead}>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className={styles.cardDate}>{formatDate((item as any).publishedAt)}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{(item as any).title}</h3>
                    {(item as any).description && (
                      <p className={styles.cardDesc}>{(item as any).description}</p>
                    )}
                    <div className={styles.cardFoot}>
                      {(item as any).sourceName && <span>{(item as any).sourceName}</span>}
                      {(item as any).authorName && <span>{(item as any).authorName}</span>}
                      {(item as any).readingTime && <span>· {(item as any).readingTime}</span>}
                    </div>
                  </div>
                </CardLink>
              );
            })}
          </div>

          {/* 스파링 한 줄 진입 */}
          {sparringRes.sparrings.length > 0 && (
            <section className={styles.sparringStrip}>
              <div>
                <Badge tone="purple">스파링</Badge>
                <h3>찬반 토론으로 결정 단단히</h3>
                <p>매주 새 주제 · 투표 + 댓글로 시장 뷰를 모아 봐요.</p>
              </div>
              <Link href="/sparring" className={styles.sparringCta}>스파링 보러가기 →</Link>
            </section>
          )}
        </div>
        <PageSidebar widgets={['sparring', 'watch', 'etf-nav', 'help']} featuredSparring={featured} />
      </main>
    </AppShell>
  );
}
