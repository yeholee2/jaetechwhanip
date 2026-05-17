import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import type { Creator } from '@/lib/creator';
import styles from './Welcome.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '멤버십 시작',
  robots: { index: false, follow: false },
};

type Props = { params: { slug: string } };

export default async function WelcomePage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/creator/${params.slug}`);

  const { data: creatorRow } = await supabase
    .from('creators')
    .select('*')
    .eq('slug', decodeURIComponent(params.slug))
    .maybeSingle();
  const creator = creatorRow as Creator | null;
  if (!creator) notFound();

  // 활성 구독 확인
  const { data: sub } = await supabase
    .from('creator_subscriptions')
    .select('*')
    .eq('creator_id', creator.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    redirect(`/creator/${params.slug}/subscribe`);
  }

  const periodEnd = sub.period_ends_at ? new Date(sub.period_ends_at) : null;
  const periodEndStr = periodEnd
    ? `${periodEnd.getFullYear()}.${String(periodEnd.getMonth() + 1).padStart(2, '0')}.${String(periodEnd.getDate()).padStart(2, '0')}`
    : '';
  const planLabel = sub.plan === 'yearly' ? '연간' : '월간';

  return (
    <AppShell active="my" hideSlogan minimalNav>
      <main className={styles.page}>
        <div className={styles.confetti}>🎉</div>
        <h1>{creator.display_name} 멤버 시작 완료!</h1>
        <p className={styles.lead}>
          이제 모든 멤버 전용 콘텐츠를 무제한으로 볼 수 있어요.
        </p>

        <div className={styles.receipt}>
          <h2>결제 영수증</h2>
          <div className={styles.row}>
            <span>채널</span><strong>{creator.display_name}</strong>
          </div>
          <div className={styles.row}>
            <span>플랜</span><strong>{planLabel} 구독권</strong>
          </div>
          <div className={styles.row}>
            <span>결제 금액</span>
            <strong>
              {sub.is_beta_free
                ? <span className={styles.free}>0원 (베타 무료)</span>
                : `${(sub.price_won || 0).toLocaleString()}원`}
            </strong>
          </div>
          {periodEndStr && (
            <div className={styles.row}>
              <span>다음 갱신</span><strong>{periodEndStr}</strong>
            </div>
          )}
          <div className={styles.divider} />
          <div className={styles.note}>
            ✨ 베타 기간 동안은 자동 갱신되지 않아요. 정식 결제 시스템 연결 시 안내드릴게요.
          </div>
        </div>

        <div className={styles.nextSteps}>
          <h3>이제 뭘 해볼까요?</h3>
          <ul>
            <li>
              <Link href={`/creator/${creator.slug}`}>
                <span className={styles.stepEmoji}>📖</span>
                <div>
                  <strong>{creator.display_name} 의 새 글 보러 가기</strong>
                  <span>멤버 전용 글이 모두 잠금 해제됐어요</span>
                </div>
              </Link>
            </li>
            <li>
              <Link href={`/creator/${creator.slug}#tab-membership`}>
                <span className={styles.stepEmoji}>🌟</span>
                <div>
                  <strong>멤버 혜택 다시 보기</strong>
                  <span>받게 될 콘텐츠 미리 확인</span>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/creators">
                <span className={styles.stepEmoji}>✨</span>
                <div>
                  <strong>다른 재프콘 발견하기</strong>
                  <span>비슷한 토픽의 다른 채널도 살펴봐요</span>
                </div>
              </Link>
            </li>
          </ul>
        </div>

        <div className={styles.actions}>
          <Link href={`/creator/${creator.slug}`} className={styles.ctaPrimary}>
            채널로 이동
          </Link>
        </div>

        <p className={styles.help}>
          궁금한 점이 있으면 <Link href="/questions/create">질문 남기기</Link> 또는 마이페이지 → 구독 관리에서 멤버십을 관리할 수 있어요.
        </p>
      </main>
    </AppShell>
  );
}
