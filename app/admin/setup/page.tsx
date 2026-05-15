import { readFile } from 'fs/promises';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminSetupClient from './AdminSetupClient';

export const dynamic = 'force-dynamic';

const MIGRATIONS = [
  {
    name: 'analytics_events',
    file: 'docs/migration_analytics_v1.sql',
    description: '노출/클릭 트래킹 테이블 (페이지뷰·배너·검색 이벤트)',
    requiredFor: '/admin/analytics, 트래킹',
  },
  {
    name: 'site_settings',
    file: 'docs/migration_site_settings.sql',
    description: '사이트 설정 (인기 키워드·공지 배너·스팸 필터)',
    requiredFor: '/admin/settings, 홈 배너',
  },
];

async function checkTableExists(table: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  try {
    const { error } = await admin.from(table).select('*', { head: true, count: 'exact' }).limit(1);
    if (!error) return true;
    // 42P01 = undefined_table
    if ((error as any).code === '42P01' || /not.*exist/i.test(error.message)) return false;
    // 다른 에러는 테이블 존재한다고 판단
    return true;
  } catch {
    return false;
  }
}

async function loadMigrations() {
  const cwd = process.cwd();
  const results = [];
  for (const m of MIGRATIONS) {
    let sql = '';
    try {
      sql = await readFile(path.join(cwd, m.file), 'utf-8');
    } catch {
      sql = `-- ${m.file} 파일을 찾을 수 없어요`;
    }
    const exists = await checkTableExists(m.name);
    results.push({ ...m, sql, exists });
  }
  return results;
}

export default async function AdminSetupPage() {
  const migrations = await loadMigrations();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // Supabase Dashboard SQL Editor 직링크
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
  const sqlEditorUrl = projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : '';

  return <AdminSetupClient migrations={migrations} sqlEditorUrl={sqlEditorUrl} />;
}
