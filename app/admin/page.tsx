import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import styles from './admin.module.css';

async function checkMissingTables(): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const checks = ['analytics_events', 'site_settings'];
  const missing: string[] = [];
  for (const t of checks) {
    try {
      const { error } = await admin.from(t).select('*', { head: true, count: 'exact' }).limit(1);
      if (error && ((error as any).code === '42P01' || /not.*exist/i.test(error.message))) {
        missing.push(t);
      }
    } catch {
      missing.push(t);
    }
  }
  return missing;
}

export const dynamic = 'force-dynamic';

type Stats = {
  questions: { total: number; today: number };
  answers: { total: number; today: number };
  comments: { total: number; today: number };
  users: { total: number; today: number };
  unanswered: number;
};

async function loadStats(): Promise<Stats | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isoToday = todayStart.toISOString();

  const [qAll, qToday, aAll, aToday, cAll, cToday, uAll, uToday, unanswered] = await Promise.all([
    admin.from('questions').select('id', { count: 'exact', head: true }),
    admin.from('questions').select('id', { count: 'exact', head: true }).gte('created_at', isoToday),
    admin.from('answers').select('id', { count: 'exact', head: true }),
    admin.from('answers').select('id', { count: 'exact', head: true }).gte('created_at', isoToday),
    admin.from('comments').select('id', { count: 'exact', head: true }),
    admin.from('comments').select('id', { count: 'exact', head: true }).gte('created_at', isoToday),
    admin.from('users').select('id', { count: 'exact', head: true }),
    admin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', isoToday),
    admin.from('questions').select('id', { count: 'exact', head: true }).eq('answer_count', 0),
  ]);

  return {
    questions: { total: qAll.count || 0, today: qToday.count || 0 },
    answers: { total: aAll.count || 0, today: aToday.count || 0 },
    comments: { total: cAll.count || 0, today: cToday.count || 0 },
    users: { total: uAll.count || 0, today: uToday.count || 0 },
    unanswered: unanswered.count || 0,
  };
}

async function loadRecentQuestions() {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from('questions')
    .select('id, title, slug, category, answer_count, created_at, users:author_id(name)')
    .order('created_at', { ascending: false })
    .limit(8);
  return data || [];
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default async function AdminDashboardPage() {
  const [stats, recent, missing] = await Promise.all([loadStats(), loadRecentQuestions(), checkMissingTables()]);

  return (
    <>
      <div className={styles.head}>
        <h1>대시보드</h1>
        <p>전체 활동 통계와 최근 게시물을 모아봐요.</p>
      </div>

      {missing.length > 0 && (
        <Link
          href="/admin/setup"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 18px',
            background: 'rgba(251,146,60,.1)',
            border: '1px solid rgba(251,146,60,.35)',
            borderRadius: 12,
            marginBottom: 20,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#c2410c' }}>
              ⚠️ {missing.length}개 테이블이 누락됐어요 — 초기 설정 필요
            </div>
            <div style={{ fontSize: 12, color: 'var(--rw-text-muted, var(--t3))', marginTop: 2 }}>
              누락: {missing.join(', ')} · 클릭해서 설정 페이지로 이동
            </div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#c2410c' }}>설정하기 →</span>
        </Link>
      )}

      {stats ? (
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>전체 질문</div>
            <div className={styles.statValue}>{stats.questions.total.toLocaleString()}</div>
            <div className={styles.statDelta}>오늘 +{stats.questions.today}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>전체 답변</div>
            <div className={styles.statValue}>{stats.answers.total.toLocaleString()}</div>
            <div className={styles.statDelta}>오늘 +{stats.answers.today}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>전체 댓글</div>
            <div className={styles.statValue}>{stats.comments.total.toLocaleString()}</div>
            <div className={styles.statDelta}>오늘 +{stats.comments.today}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>가입자</div>
            <div className={styles.statValue}>{stats.users.total.toLocaleString()}</div>
            <div className={styles.statDelta}>오늘 +{stats.users.today}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>답변 대기</div>
            <div className={styles.statValue}>{stats.unanswered.toLocaleString()}</div>
            <div className={styles.statDelta}>답변 0개인 질문</div>
          </div>
        </div>
      ) : (
        <div className={styles.empty}>통계를 불러올 수 없어요 (SUPABASE_SERVICE_ROLE_KEY 미설정).</div>
      )}

      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <h2>최근 질문</h2>
          <Link href="/admin/questions" className={styles.actionBtn}>전체 보기</Link>
        </div>
        {recent.length === 0 ? (
          <div className={styles.empty}>질문이 없어요.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>제목</th>
                <th>카테고리</th>
                <th>작성자</th>
                <th>답변</th>
                <th>등록</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(q => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/q/${q.slug || q.id}`} className={styles.cellTitle}>{q.title}</Link>
                  </td>
                  <td>{q.category}</td>
                  <td>{(q.users as any)?.name || '익명'}</td>
                  <td>{q.answer_count || 0}</td>
                  <td>{fmtTime(q.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
