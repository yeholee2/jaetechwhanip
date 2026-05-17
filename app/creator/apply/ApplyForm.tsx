'use client';

/**
 * 재프콘 신청 폼 — 비공개 베타.
 * 로그인 필수, 한 사용자당 1 신청 (중복 차단은 DB에서).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { normalizeSlug } from '@/lib/creator';
import styles from './Apply.module.css';

const TOPIC_OPTIONS = [
  'ETF', '주식', '채권', '자산관리', '코인', '은퇴 설계',
  '절세', '월급쟁이 재테크', '대가 분석', '시장 인사이트',
];

type Status = 'idle' | 'loading' | 'pending' | 'approved' | 'rejected' | 'submitting';

export function ApplyForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 폼
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [followerCount, setFollowerCount] = useState<number | ''>('');
  const [topics, setTopics] = useState<string[]>([]);
  const [sampleContent, setSampleContent] = useState('');
  const [motivation, setMotivation] = useState('');

  // 기존 신청 조회
  useEffect(() => {
    if (!hasSupabase()) {
      setStatus('idle');
      return;
    }
    const supabase = createClient();
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        router.replace('/auth?next=/creator/apply');
        return;
      }
      setUser(u);
      const { data: app } = await supabase
        .from('creator_applications')
        .select('status, reject_reason, display_name')
        .eq('user_id', u.id)
        .order('applied_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (app) {
        setStatus(app.status as Status);
        setRejectReason(app.reject_reason || '');
        if (app.display_name) setDisplayName(app.display_name);
      } else {
        setStatus('idle');
      }
    })();
  }, [router]);

  const toggleTopic = (t: string) => {
    setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const submit = async () => {
    if (!user || !hasSupabase()) return;
    setErrorMsg('');
    const errors: string[] = [];
    if (displayName.trim().length < 2) errors.push('표시 이름 2글자 이상');
    if (bio.trim().length < 30) errors.push('자기소개 30자 이상');
    if (topics.length === 0) errors.push('주제 1개 이상 선택');
    if (errors.length > 0) {
      setErrorMsg(errors.join(' · '));
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('creator_applications').insert({
        user_id: user.id,
        display_name: displayName.trim(),
        slug: slug.trim() ? normalizeSlug(slug) : null,
        bio: bio.trim(),
        channel_url: channelUrl.trim() || null,
        follower_count: typeof followerCount === 'number' ? followerCount : null,
        topics,
        sample_content: sampleContent.trim() || null,
        motivation: motivation.trim() || null,
        status: 'pending',
      });
      if (error) throw error;
      setStatus('pending');
    } catch (e: any) {
      setErrorMsg(e?.message || '신청 중 오류가 발생했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 상태별 화면 ──
  if (status === 'loading') {
    return <div className={styles.wrap}><div className={styles.loading}>불러오는 중…</div></div>;
  }

  if (status === 'pending') {
    return (
      <div className={styles.wrap}>
        <div className={styles.statusCard}>
          <span className={styles.statusBadge}>심사 중</span>
          <h1>신청이 접수됐어요</h1>
          <p>1~3일 내 결과를 알려드릴게요. 알림으로 보내드리고, 마이페이지에서도 확인할 수 있어요.</p>
        </div>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className={styles.wrap}>
        <div className={styles.statusCard}>
          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>승인 완료</span>
          <h1>축하해요, {displayName} 님!</h1>
          <p>이제 본인 크리에이터 페이지에서 콘텐츠를 올릴 수 있어요.</p>
          <a href="/creator/me" className={styles.btnPrimary}>내 크리에이터 페이지 →</a>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className={styles.wrap}>
        <div className={styles.statusCard}>
          <span className={`${styles.statusBadge} ${styles.statusRejected}`}>이번엔 보류</span>
          <h1>아쉬워요</h1>
          <p>사유: {rejectReason || '심사 기준 미달'}</p>
          <p className={styles.subNote}>채널 성장 후 다시 신청해주세요. 1개월 후 재신청 가능합니다.</p>
        </div>
      </div>
    );
  }

  // status === 'idle' → 새 신청 폼
  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>
          <span className={`${styles.sparkle} tf`} aria-hidden="true">✨</span>
          비공개 베타
        </span>
        <h1>재프콘 채널 만들기</h1>
        <p className={styles.lead}>
          재테크 인사이트를 멤버에게 직접 전달하고 매출도 만들어보세요.
          베타 기간엔 <strong>플랫폼 수수료 0%</strong> — 매출 100% 가 크리에이터 몫이에요.
        </p>
      </header>

      {/* 수수료 비교 */}
      <section className={styles.feeCompare}>
        <span className={styles.feeLabel}>플랫폼 수수료 비교</span>
        <div className={styles.feeRow}>
          <div className={styles.feeItem}>
            <span>팬딩</span><strong>15%</strong>
          </div>
          <div className={styles.feeItem}>
            <span>네프콘</span><strong>10%</strong>
          </div>
          <div className={`${styles.feeItem} ${styles.feeItemUs}`}>
            <span>재프콘 (베타)</span><strong>0%</strong>
            <em>100% 본인 수익</em>
          </div>
        </div>
      </section>

      <section className={styles.benefits}>
        <div className={styles.benefit}>
          <span className={styles.benefitEmoji} aria-hidden="true">💵</span>
          <strong>매출 100% 수령</strong>
          <span>베타 기간 수수료 0%. 정착 후 12% (네프콘·팬딩보다 낮음)</span>
        </div>
        <div className={styles.benefit}>
          <span className={styles.benefitEmoji} aria-hidden="true">📈</span>
          <strong>내 전용 채널</strong>
          <span>/creator/내이름 — 페이지·디자인·발행 자율</span>
        </div>
        <div className={styles.benefit}>
          <span className={styles.benefitEmoji} aria-hidden="true">🛠️</span>
          <strong>ETF 도구 결합</strong>
          <span>ETF DB·캘린더·AI 시그널과 결합한 콘텐츠 제작</span>
        </div>
      </section>

      <form className={styles.form} onSubmit={e => { e.preventDefault(); submit(); }}>
        <div className={styles.field}>
          <label>표시 이름 *</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={32}
            placeholder="예: 부읽남 / 토스ETF리서치"
          />
        </div>

        <div className={styles.field}>
          <label>희망 URL <span className={styles.optional}>(선택)</span></label>
          <div className={styles.urlInput}>
            <span className={styles.urlPrefix}>/creator/</span>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase())}
              maxLength={32}
              placeholder="my-channel"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label>자기소개 * <span className={styles.optional}>30자 이상</span></label>
          <textarea
            rows={4}
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={500}
            placeholder="어떤 콘텐츠를 만드는지, 차별점이 뭔지 알려주세요."
          />
          <span className={styles.charCount}>{bio.length} / 500</span>
        </div>

        <div className={styles.field}>
          <label>채널 URL <span className={styles.optional}>(유튜브/블로그/X 등)</span></label>
          <input
            type="url"
            value={channelUrl}
            onChange={e => setChannelUrl(e.target.value)}
            placeholder="https://youtube.com/@your-channel"
          />
        </div>

        <div className={styles.field}>
          <label>구독자/팔로워 수 <span className={styles.optional}>(선택)</span></label>
          <input
            type="number"
            value={followerCount}
            onChange={e => setFollowerCount(e.target.value ? Number(e.target.value) : '')}
            min={0}
            placeholder="현재 채널 구독자 수"
          />
        </div>

        <div className={styles.field}>
          <label>다루는 주제 *</label>
          <div className={styles.topicGrid}>
            {TOPIC_OPTIONS.map(t => (
              <button
                type="button"
                key={t}
                onClick={() => toggleTopic(t)}
                className={`${styles.topicChip} ${topics.includes(t) ? styles.topicOn : ''}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label>대표 콘텐츠 샘플 <span className={styles.optional}>(글 본문 또는 URL)</span></label>
          <textarea
            rows={4}
            value={sampleContent}
            onChange={e => setSampleContent(e.target.value)}
            maxLength={2000}
            placeholder="평소 작성하는 콘텐츠 한 편을 붙여넣거나 링크를 적어주세요."
          />
        </div>

        <div className={styles.field}>
          <label>왜 우리 플랫폼? <span className={styles.optional}>(선택)</span></label>
          <textarea
            rows={3}
            value={motivation}
            onChange={e => setMotivation(e.target.value)}
            maxLength={300}
            placeholder="짧게 한두 줄로 알려주세요."
          />
        </div>

        {errorMsg && <div className={styles.errorBox}>⚠️ {errorMsg}</div>}

        <button
          type="submit"
          disabled={submitting}
          className={styles.btnPrimary}
        >
          {submitting ? '제출 중…' : '신청하기'}
        </button>

        <p className={styles.disclaimer}>
          신청 시 재프콘 운영 약관에 동의한 것으로 봅니다.
          금융 콘텐츠는 자본시장법상 투자권유에 해당할 수 있어 면책 조항이 의무입니다.
        </p>
      </form>
    </div>
  );
}
