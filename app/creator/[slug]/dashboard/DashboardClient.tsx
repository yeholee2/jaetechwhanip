'use client';

/**
 * 크리에이터 대시보드 — 본인 채널 운영용.
 *
 * 4 섹션:
 *  1. 핵심 KPI 카드 (멤버·발행·좋아요·예상 매출)
 *  2. 최근 30일 멤버 변동 차트 (간단 막대 그래프)
 *  3. 글별 성과 표
 *  4. 최근 멤버 명단
 */

import { useMemo } from 'react';
import Link from 'next/link';
import type { Creator, CreatorPost } from '@/lib/creator';
import type { CreatorStats } from '@/lib/creatorStats';
import styles from './Dashboard.module.css';

type MemberRow = {
  id: string;
  created_at: string;
  status: string;
  plan: 'monthly' | 'yearly';
  price_won: number | null;
  is_beta_free: boolean;
};

export function DashboardClient({
  creator,
  stats,
  posts,
  members,
  memberDaily,
}: {
  creator: Creator;
  stats: CreatorStats;
  posts: CreatorPost[];
  members: MemberRow[];
  memberDaily: { date: string; count: number }[];
}) {
  // KPI 계산
  const activeMembers = members.filter(m => m.status === 'active').length;
  const monthlyRevenue = useMemo(() => {
    return members
      .filter(m => m.status === 'active' && !m.is_beta_free)
      .reduce((sum, m) => {
        if (m.plan === 'yearly') return sum + Math.round((m.price_won || 0) / 12);
        return sum + (m.price_won || 0);
      }, 0);
  }, [members]);

  const maxDaily = Math.max(1, ...memberDaily.map(d => d.count));

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <Link href={`/creator/${creator.slug}`} className={styles.back}>← {creator.display_name}</Link>
          <h1>채널 대시보드</h1>
        </div>
        <div className={styles.headActions}>
          <Link href={`/creator/${creator.slug}/write`} className={styles.btnPrimary}>+ 글 작성</Link>
          <Link href={`/creator/${creator.slug}/edit`} className={styles.btnSecondary}>편집</Link>
        </div>
      </header>

      {/* KPI */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>활성 멤버</span>
          <strong className={styles.kpiValue}>{activeMembers.toLocaleString()}</strong>
          <span className={styles.kpiDelta}>최근 30일 +{stats.members30d}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>팔로워</span>
          <strong className={styles.kpiValue}>{creator.follower_count.toLocaleString()}</strong>
          <span className={styles.kpiDelta}>최근 30일 +{stats.followers30d}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>최근 30일 발행</span>
          <strong className={styles.kpiValue}>{stats.posts30d}</strong>
          <span className={styles.kpiDelta}>이번주 {stats.posts7d}건</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>월 예상 매출</span>
          <strong className={styles.kpiValue}>
            {monthlyRevenue > 0
              ? `${monthlyRevenue.toLocaleString()}원`
              : '0원'}
          </strong>
          <span className={styles.kpiDelta}>
            {monthlyRevenue === 0 && activeMembers > 0
              ? '베타 무료 멤버'
              : '결제 멤버 기준'}
          </span>
        </div>
      </section>

      {/* 최근 30일 멤버 변동 */}
      <section className={styles.card}>
        <header className={styles.cardHead}>
          <h2>최근 30일 신규 멤버</h2>
          <span>{stats.members30d}명</span>
        </header>
        <div className={styles.chart}>
          {memberDaily.map(d => (
            <div key={d.date} className={styles.bar} title={`${d.date} · ${d.count}명`}>
              <div
                className={styles.barFill}
                style={{ height: `${(d.count / maxDaily) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className={styles.chartAxis}>
          <span>{memberDaily[0]?.date.slice(5)}</span>
          <span>{memberDaily[Math.floor(memberDaily.length / 2)]?.date.slice(5)}</span>
          <span>{memberDaily[memberDaily.length - 1]?.date.slice(5)}</span>
        </div>
      </section>

      {/* 글별 성과 */}
      <section className={styles.card}>
        <header className={styles.cardHead}>
          <h2>글별 성과</h2>
          <span>{posts.length}건</span>
        </header>
        {posts.length === 0 ? (
          <div className={styles.empty}>
            아직 발행한 글이 없어요.
            <Link href={`/creator/${creator.slug}/write`} className={styles.emptyCta}>첫 글 작성하기</Link>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>제목</th>
                  <th>발행일</th>
                  <th>유형</th>
                  <th>좋아요</th>
                  <th>댓글</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id}>
                    <td className={styles.tableTitle}>
                      <Link href={`/creator/${creator.slug}/posts/${p.slug}`}>
                        {p.title}
                      </Link>
                    </td>
                    <td>{p.published_at.slice(0, 10)}</td>
                    <td>
                      {p.is_member_only ? (
                        <span className={styles.tagMember}>🔒 멤버</span>
                      ) : (
                        <span className={styles.tagFree}>무료</span>
                      )}
                    </td>
                    <td>{p.like_count}</td>
                    <td>{p.comment_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 최근 멤버 */}
      <section className={styles.card}>
        <header className={styles.cardHead}>
          <h2>최근 가입 멤버</h2>
          <span>{members.length}명</span>
        </header>
        {members.length === 0 ? (
          <div className={styles.empty}>아직 멤버가 없어요.</div>
        ) : (
          <ul className={styles.memberList}>
            {members.slice(0, 10).map(m => (
              <li key={m.id}>
                <div className={styles.memberMain}>
                  <strong>익명 멤버</strong>
                  <span className={styles.memberMeta}>
                    {m.plan === 'yearly' ? '연간' : '월간'} ·{' '}
                    {m.is_beta_free ? '베타 무료' : `${(m.price_won || 0).toLocaleString()}원`}
                  </span>
                </div>
                <time className={styles.memberDate}>
                  {new Date(m.created_at).toLocaleDateString('ko-KR')}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className={styles.note}>
        ※ 멤버의 개인 정보는 표시하지 않아요. 본인 채널 운영을 위한 통계 데이터만 제공합니다.
      </p>
    </main>
  );
}
