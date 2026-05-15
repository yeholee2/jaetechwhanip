import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

type DailyBucket = { date: string; views: number; clicks: number };
type TopPage = { path: string; views: number };
type TopTarget = { target: string; clicks: number };

async function loadAnalytics(): Promise<{
  daily: DailyBucket[];
  topPages: TopPage[];
  topTargets: TopTarget[];
  totals: { views: number; clicks: number; uniqueSessions: number; uniqueUsers: number };
} | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const now = new Date();
  const start14 = new Date(now);
  start14.setDate(start14.getDate() - 13);
  start14.setHours(0, 0, 0, 0);
  const iso14 = start14.toISOString();

  const { data: events } = await admin
    .from('analytics_events')
    .select('kind, path, target, session_id, user_id, created_at')
    .gte('created_at', iso14)
    .limit(20000);

  const rows = events || [];

  // Daily buckets (14일)
  const dailyMap = new Map<string, DailyBucket>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(start14);
    d.setDate(d.getDate() + i);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyMap.set(key, { date: key, views: 0, clicks: 0 });
  }

  const pageCount = new Map<string, number>();
  const targetCount = new Map<string, number>();
  const sessions = new Set<string>();
  const users = new Set<string>();
  let totalViews = 0;
  let totalClicks = 0;

  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    const bucket = dailyMap.get(key);
    if (r.kind === 'page_view') {
      totalViews++;
      if (bucket) bucket.views++;
      if (r.path) pageCount.set(r.path, (pageCount.get(r.path) || 0) + 1);
    } else if (r.kind === 'click') {
      totalClicks++;
      if (bucket) bucket.clicks++;
      if (r.target) targetCount.set(r.target, (targetCount.get(r.target) || 0) + 1);
    }
    if (r.session_id) sessions.add(r.session_id);
    if (r.user_id) users.add(r.user_id);
  }

  const daily = Array.from(dailyMap.values());
  const topPages = Array.from(pageCount.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const topTargets = Array.from(targetCount.entries())
    .map(([target, clicks]) => ({ target, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return {
    daily,
    topPages,
    topTargets,
    totals: {
      views: totalViews,
      clicks: totalClicks,
      uniqueSessions: sessions.size,
      uniqueUsers: users.size,
    },
  };
}

function BarChart({ data }: { data: DailyBucket[] }) {
  const max = Math.max(1, ...data.map(d => Math.max(d.views, d.clicks)));
  const W = 760;
  const H = 200;
  const PAD = 32;
  const innerW = W - PAD * 2;
  const innerH = H - PAD;
  const barW = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="일별 노출·클릭 차트">
      {/* y-axis ticks */}
      {[0.25, 0.5, 0.75, 1].map(p => {
        const y = PAD + innerH * (1 - p);
        return (
          <g key={p}>
            <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="var(--line)" strokeDasharray="2 3" />
            <text x={6} y={y + 3} fontSize={10} fill="var(--t3)">{Math.round(max * p)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = PAD + i * barW;
        const vh = (d.views / max) * innerH;
        const ch = (d.clicks / max) * innerH;
        const cx = x + barW * 0.15;
        const vw = barW * 0.35;
        const cw = barW * 0.35;
        return (
          <g key={d.date}>
            <rect x={cx} y={PAD + innerH - vh} width={vw} height={vh} fill="var(--blue)" rx={2} opacity={0.85} />
            <rect x={cx + vw + 2} y={PAD + innerH - ch} width={cw} height={ch} fill="#fb923c" rx={2} opacity={0.85} />
            <text x={x + barW / 2} y={H - 8} fontSize={10} fill="var(--t3)" textAnchor="middle">{d.date}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function AdminAnalyticsPage() {
  const data = await loadAnalytics();

  if (!data) {
    return (
      <>
        <div className={styles.head}>
          <h1>노출·클릭 통계</h1>
        </div>
        <div className={styles.empty}>
          서비스 키가 설정되지 않았거나 마이그레이션이 실행되지 않았어요.<br />
          <code>docs/migration_analytics_v1.sql</code>을 실행해주세요.
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.head}>
        <h1>노출·클릭 통계</h1>
        <p>최근 14일. 페이지뷰는 자동 트래킹되며, 배너·검색·답변 클릭 등은 이벤트로 별도 기록돼요.</p>
      </div>

      {/* 총계 */}
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>총 페이지뷰</div>
          <div className={styles.statValue}>{data.totals.views.toLocaleString()}</div>
          <div className={styles.statDelta}>14일 누적</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>총 클릭</div>
          <div className={styles.statValue}>{data.totals.clicks.toLocaleString()}</div>
          <div className={styles.statDelta}>이벤트 기반</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>고유 세션</div>
          <div className={styles.statValue}>{data.totals.uniqueSessions.toLocaleString()}</div>
          <div className={styles.statDelta}>브라우저 단위</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>로그인 사용자</div>
          <div className={styles.statValue}>{data.totals.uniqueUsers.toLocaleString()}</div>
          <div className={styles.statDelta}>14일 활성</div>
        </div>
      </div>

      {/* 일별 차트 */}
      <section className={styles.tableWrap} style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>일별 노출 vs 클릭</h2>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--t3)' }}>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--blue)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />페이지뷰</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, background: '#fb923c', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />클릭</span>
          </div>
        </div>
        <BarChart data={data.daily} />
      </section>

      {/* 인기 페이지 + 인기 클릭 대상 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <h2>인기 페이지 TOP 10</h2>
          </div>
          {data.topPages.length === 0 ? (
            <div className={styles.empty}>아직 페이지뷰가 없어요.</div>
          ) : (
            <table className={styles.table}>
              <thead><tr><th>경로</th><th style={{ textAlign: 'right' }}>뷰</th></tr></thead>
              <tbody>
                {data.topPages.map(p => (
                  <tr key={p.path}>
                    <td>
                      <Link href={p.path} className={styles.cellTitle} target="_blank">{p.path}</Link>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <h2>인기 클릭 대상 TOP 10</h2>
          </div>
          {data.topTargets.length === 0 ? (
            <div className={styles.empty}>
              아직 클릭 이벤트가 없어요.<br />
              <span style={{ fontSize: 11 }}>(배너·검색·답변 등에서 trackEvent 호출 시 기록)</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead><tr><th>대상</th><th style={{ textAlign: 'right' }}>클릭</th></tr></thead>
              <tbody>
                {data.topTargets.map(t => (
                  <tr key={t.target}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.target}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{t.clicks.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
