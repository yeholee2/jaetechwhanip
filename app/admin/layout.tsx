import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminContext } from '@/lib/admin';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드', exact: true },
  { href: '/admin/analytics', label: '노출·클릭' },
  { href: '/admin/questions', label: '질문' },
  { href: '/admin/answers', label: '답변' },
  { href: '/admin/comments', label: '댓글' },
  { href: '/admin/users', label: '사용자' },
  { href: '/admin/sparring', label: '스파링' },
  { href: '/admin/reports', label: '리포트' },
  { href: '/admin/settings', label: '설정' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getAdminContext();
  if (!user) redirect('/auth?next=/admin');
  if (!isAdmin) {
    return (
      <main className={styles.gate}>
        <div className={styles.gateCard}>
          <span>관리자 권한 확인</span>
          <h1>접근 권한이 없어요</h1>
          <p>현재 계정 ({user.email})은 관리자 목록에 없습니다.</p>
          <Link href="/" className={styles.gateBtn}>홈으로</Link>
        </div>
      </main>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <Link href="/" className={styles.logo}>재테크<em>한입</em></Link>
        <div className={styles.sideLabel}>관리자</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} className={styles.navItem}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sideFoot}>
          <span className={styles.userEmail}>{user.email}</span>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
