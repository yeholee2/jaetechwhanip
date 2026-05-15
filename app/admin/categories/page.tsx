import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import { topicPath } from '@/lib/topics';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

type CategoryStat = {
  key: string;
  label: string;
  emoji: string;
  questions: number;
  answers: number;
  adoptedRate: number;
  recentQuestions: number; // 최근 7일
  totalViews: number;
};

async function loadCategoryStats(): Promise<CategoryStat[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const isoWeek = weekAgo.toISOString();

  const stats = await Promise.all(
    CATEGORY_DEFINITIONS.map(async cat => {
      const [qCount, qWeek, qViews, aTotal, aAdopted] = await Promise.all([
        admin.from('questions').select('id', { count: 'exact', head: true }).eq('category', cat.key),
        admin.from('questions').select('id', { count: 'exact', head: true }).eq('category', cat.key).gte('created_at', isoWeek),
        admin.from('questions').select('view_count').eq('category', cat.key).limit(1000),
        admin.from('answers').select('id, questions!inner(category)', { count: 'exact', head: true }).eq('questions.category', cat.key),
        admin.from('answers').select('id, questions!inner(category)', { count: 'exact', head: true }).eq('questions.category', cat.key).eq('is_adopted', true),
      ]);

      const totalViews = (qViews.data || []).reduce((s: number, r: any) => s + (r.view_count || 0), 0);
      const ansTotal = aTotal.count || 0;
      const ansAdopted = aAdopted.count || 0;
      const adoptedRate = ansTotal > 0 ? (ansAdopted / ansTotal) * 100 : 0;

      return {
        key: cat.key,
        label: cat.label,
        emoji: cat.emoji,
        questions: qCount.count || 0,
        answers: ansTotal,
        adoptedRate,
        recentQuestions: qWeek.count || 0,
        totalViews,
      };
    }),
  );

  return stats;
}

export default async function AdminCategoriesPage() {
  const stats = await loadCategoryStats();
  const totalQuestions = stats.reduce((s, c) => s + c.questions, 0);
  const maxQuestions = Math.max(1, ...stats.map(s => s.questions));

  // 핫 토픽: 최근 7일 신규 질문 많은 순
  const hot = [...stats].sort((a, b) => b.recentQuestions - a.recentQuestions);

  return (
    <>
      <div className={styles.head}>
        <h1>카테고리·토픽 통계</h1>
        <p>어떤 분야가 활발한지 한눈에. 콘텐츠 기획·운영에 활용하세요.</p>
      </div>

      {/* 핫 토픽 강조 */}
      {hot[0] && hot[0].recentQuestions > 0 && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(251,146,60,.08)',
          border: '1px solid rgba(251,146,60,.25)',
          borderRadius: 12,
          marginBottom: 20,
          fontSize: 14,
          color: 'var(--rw-text-strong, var(--t1))',
        }}>
          🔥 <strong>이번 주 핫 토픽:</strong> {hot[0].emoji} {hot[0].label} —
          최근 7일 새 질문 <strong style={{ color: '#c2410c' }}>{hot[0].recentQuestions}개</strong>
        </div>
      )}

      {/* 카테고리별 막대 비교 */}
      <section className={styles.tableWrap} style={{ marginBottom: 20, padding: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>전체 질문 분포</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.map(s => {
            const pct = (s.questions / maxQuestions) * 100;
            const sharePct = totalQuestions > 0 ? (s.questions / totalQuestions) * 100 : 0;
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 150, fontSize: 13, fontWeight: 600, color: 'var(--rw-text-strong, var(--t1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{s.emoji}</span> {s.label}
                </div>
                <div style={{ flex: 1, height: 22, background: 'var(--rw-screen, var(--bg))', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: 'var(--rw-primary, var(--blue))',
                    opacity: 0.85,
                    transition: 'width .4s',
                  }} />
                </div>
                <div style={{ width: 130, textAlign: 'right', fontSize: 12, color: 'var(--rw-text-muted, var(--t3))' }}>
                  <strong style={{ color: 'var(--rw-text-strong, var(--t1))' }}>{s.questions}</strong> 질문 ({sharePct.toFixed(1)}%)
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 상세 테이블 */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <h2>카테고리별 상세</h2>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>카테고리</th>
              <th style={{ textAlign: 'right' }}>전체 질문</th>
              <th style={{ textAlign: 'right' }}>최근 7일</th>
              <th style={{ textAlign: 'right' }}>답변</th>
              <th style={{ textAlign: 'right' }}>채택률</th>
              <th style={{ textAlign: 'right' }}>총 조회</th>
              <th>토픽 페이지</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.key}>
                <td style={{ fontWeight: 600 }}>{s.emoji} {s.label}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{s.questions.toLocaleString()}</td>
                <td style={{ textAlign: 'right', color: s.recentQuestions > 0 ? '#c2410c' : 'var(--rw-text-muted, var(--t3))', fontWeight: s.recentQuestions > 0 ? 700 : 500 }}>
                  {s.recentQuestions > 0 ? `+${s.recentQuestions}` : '0'}
                </td>
                <td style={{ textAlign: 'right' }}>{s.answers.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: s.adoptedRate >= 50 ? 'rgba(34,197,94,.12)' : 'rgba(0,0,0,.04)',
                    color: s.adoptedRate >= 50 ? '#15803d' : 'var(--rw-text-muted, var(--t3))',
                  }}>
                    {s.adoptedRate.toFixed(0)}%
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>{s.totalViews.toLocaleString()}</td>
                <td>
                  <Link
                    href={topicPath(CATEGORY_DEFINITIONS.find(c => c.key === s.key)?.slug || s.key)}
                    className={styles.actionBtn}
                    target="_blank"
                  >
                    보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
