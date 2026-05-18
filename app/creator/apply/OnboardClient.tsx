'use client';

/**
 * 재프콘 크리에이터 온보딩 — Fanding 스타일.
 *
 * 흐름:
 *   Step 0 — 환영 + Q1: 어떻게 알게 됐는지 (마케팅 데이터)
 *   Step 1 — Q2: 활용 계획 (마케팅 데이터)
 *   Step 2 — 페이지 정보 입력 (좌측) + 라이브 미리보기 (우측)
 *   → 즉시 creators 행 생성 + /creator/{slug} 로 이동
 *
 * 승인 대기 없음. creator_applications 는 마케팅 데이터 저장용으로만 사용.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { normalizeSlug } from '@/lib/creator';
import { CATEGORY_DEFINITIONS, normalizeCreatorTopics } from '@/lib/categories';
import { ImageUploader } from '@/components/creator/ImageUploader';
import styles from './Onboard.module.css';

const REFERRAL_OPTIONS = [
  { v: 'search', label: '검색·SNS에서' },
  { v: 'friend', label: '친구·지인 추천' },
  { v: 'creator', label: '다른 크리에이터 추천' },
  { v: 'self', label: '직접 알아냄' },
  { v: 'other', label: '직접 입력하기' },
] as const;

const USE_CASE_OPTIONS = [
  { v: 'membership', label: '양질의 콘텐츠로 멤버십 수익' },
  { v: 'community', label: '팬과 활발히 소통할 커뮤니티' },
  { v: 'monetize', label: '지식·노하우를 수익화' },
  { v: 'aggregator', label: '여러 채널의 팬을 통합 관리' },
  { v: 'other', label: '직접 입력하기' },
] as const;

const TOPIC_OPTIONS = CATEGORY_DEFINITIONS.map(category => ({
  key: category.key,
  label: category.label,
}));
const CATEGORY_OPTIONS = CATEGORY_DEFINITIONS.map(category => ({
  v: category.key,
  label: `${category.emoji} ${category.label}`,
}));

type FormState = {
  referral: string;
  referralCustom: string;
  useCase: string;
  useCaseCustom: string;
  displayName: string;
  slug: string;
  bio: string;
  category: string;
  avatar_url: string;
  cover_url: string;
  topics: string[];
};

const emptyForm: FormState = {
  referral: '',
  referralCustom: '',
  useCase: '',
  useCaseCustom: '',
  displayName: '',
  slug: '',
  bio: '',
  category: '',
  avatar_url: '',
  cover_url: '',
  topics: [],
};

export function OnboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // boot — 로그인 + 기존 creator 행 확인
  useEffect(() => {
    if (!hasSupabase()) {
      setBootLoading(false);
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        router.replace('/auth?next=/creator/apply');
        return;
      }
      setUser(u);

      // 이미 본인 크리에이터 페이지가 있으면 바로 이동
      const { data: existing } = await supabase
        .from('creators')
        .select('slug')
        .eq('user_id', u.id)
        .maybeSingle();
      if (existing?.slug) {
        router.replace(`/creator/${existing.slug}`);
        return;
      }

      // 닉네임 기본값: auth meta 에서
      const meta = u.user_metadata || {};
      const defaultName =
        meta.name ||
        meta.full_name ||
        (u.email ? u.email.split('@')[0] : '') ||
        '';
      if (defaultName) setForm(f => ({ ...f, displayName: defaultName }));

      setBootLoading(false);
    })().catch(() => setBootLoading(false));
  }, [router]);

  // 닉네임 → slug 자동 채움 (사용자가 직접 안 건드렸을 때만)
  const autoSlug = useMemo(() => normalizeSlug(form.displayName), [form.displayName]);

  const nextFromStep0 = () => {
    setErr('');
    if (!form.referral) { setErr('어떻게 알게 됐는지 선택해주세요.'); return; }
    if (form.referral === 'other' && !form.referralCustom.trim()) {
      setErr('직접 입력 내용을 적어주세요.');
      return;
    }
    setStep(1);
  };

  const nextFromStep1 = () => {
    setErr('');
    if (!form.useCase) { setErr('활용 계획을 선택해주세요.'); return; }
    if (form.useCase === 'other' && !form.useCaseCustom.trim()) {
      setErr('직접 입력 내용을 적어주세요.');
      return;
    }
    setStep(2);
  };

  const toggleTopic = (t: string) => {
    setForm(f => ({
      ...f,
      topics: f.topics.includes(t) ? f.topics.filter(x => x !== t) : [...f.topics, t],
    }));
  };

  const launch = async () => {
    setErr('');
    if (!user) return;
    if (form.displayName.trim().length < 2) { setErr('닉네임은 2자 이상이어야 해요.'); return; }
    if (form.bio.trim().length < 5) { setErr('한 줄 소개를 5자 이상 적어주세요.'); return; }
    if (!form.category) { setErr('카테고리를 선택해주세요.'); return; }

    setSubmitting(true);
    try {
      const baseSlug = (form.slug.trim() ? normalizeSlug(form.slug) : autoSlug) || `c-${Date.now().toString(36)}`;

      // 카테고리 → topics 배열에 자동 포함
      const baseTopics = form.topics.slice();
      if (form.category && !baseTopics.includes(form.category)) baseTopics.push(form.category);
      const normalizedTopics = normalizeCreatorTopics(baseTopics);

      const referralFinal = form.referral === 'other' ? form.referralCustom.trim() : form.referral;
      const useCaseFinal = form.useCase === 'other' ? form.useCaseCustom.trim() : form.useCase;
      const res = await fetch('/api/creator/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: baseSlug,
          displayName: form.displayName.trim(),
          bio: form.bio.trim(),
          avatar_url: form.avatar_url || null,
          cover_url: form.cover_url || null,
          topics: normalizedTopics,
          referral_source: referralFinal,
          intended_use: useCaseFinal,
        }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) {
        setErr(result?.error || '페이지 생성 중 오류가 발생했어요.');
        setSubmitting(false);
        return;
      }

      router.push(`/creator/${result.slug}`);
    } catch (e: any) {
      setErr(e?.message || '생성 중 오류가 발생했어요.');
      setSubmitting(false);
    }
  };

  if (bootLoading) {
    return <div className={styles.wrap}><div className={styles.loading}>불러오는 중…</div></div>;
  }

  // ── Stepper ──
  const Stepper = () => (
    <ol className={styles.stepper} aria-label="진행 단계">
      {(['계정 전환', '활용 계획', '페이지 런칭'] as const).map((label, i) => (
        <li
          key={label}
          className={`${styles.stepItem} ${i === step ? styles.stepItemOn : ''} ${i < step ? styles.stepItemDone : ''}`}
        >
          <span className={styles.stepDot}>{i < step ? '✓' : i + 1}</span>
          <span className={styles.stepLabel}>{label}</span>
        </li>
      ))}
    </ol>
  );
  const previewSlug = (form.slug.trim() ? normalizeSlug(form.slug) : autoSlug) || 'my-channel';

  return (
    <div className={styles.wrap}>
      {step === 0 && (
        <div className={styles.card}>
          <header className={styles.cardHead}>
            <h1>재프콘 크리에이터 페이지를 만들어요</h1>
            <p>{user?.user_metadata?.name || user?.email?.split('@')[0] || '크리에이터'}님 계정을 크리에이터 모드로 전환하고, 기본 정보를 입력하면 <strong>공개 채널이 바로 생성돼요</strong>.</p>
          </header>

          <Stepper />

          <div className={styles.formBlock}>
            <label className={styles.qLabel}>재프콘을 어떻게 알게 되셨나요? <span className={styles.required}>*</span></label>
            <div className={styles.radioGroup}>
              {REFERRAL_OPTIONS.map(o => (
                <label key={o.v} className={`${styles.radioRow} ${form.referral === o.v ? styles.radioRowOn : ''}`}>
                  <input
                    type="radio"
                    name="referral"
                    checked={form.referral === o.v}
                    onChange={() => setForm(f => ({ ...f, referral: o.v }))}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
              {form.referral === 'other' && (
                <input
                  type="text"
                  value={form.referralCustom}
                  onChange={e => setForm(f => ({ ...f, referralCustom: e.target.value }))}
                  placeholder="예: 트위터 어느 글에서 봤어요"
                  maxLength={60}
                  className={styles.customInput}
                />
              )}
            </div>
          </div>

          {err && <div className={styles.errorBox}>{err}</div>}

          <div className={styles.actions}>
            <button type="button" onClick={nextFromStep0} className={styles.btnPrimary}>다음</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className={styles.card}>
          <Stepper />
          <div className={styles.formBlock}>
            <label className={styles.qLabel}>재프콘을 어떤 공간으로 활용하실 계획이세요? <span className={styles.required}>*</span></label>
            <div className={styles.radioGroup}>
              {USE_CASE_OPTIONS.map(o => (
                <label key={o.v} className={`${styles.radioRow} ${form.useCase === o.v ? styles.radioRowOn : ''}`}>
                  <input
                    type="radio"
                    name="useCase"
                    checked={form.useCase === o.v}
                    onChange={() => setForm(f => ({ ...f, useCase: o.v }))}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
              {form.useCase === 'other' && (
                <input
                  type="text"
                  value={form.useCaseCustom}
                  onChange={e => setForm(f => ({ ...f, useCaseCustom: e.target.value }))}
                  placeholder="예: 책 출간 전 사전 청자 모으기"
                  maxLength={80}
                  className={styles.customInput}
                />
              )}
            </div>
          </div>

          {err && <div className={styles.errorBox}>{err}</div>}

          <div className={styles.actions}>
            <button type="button" onClick={() => setStep(0)} className={styles.btnSecondary}>이전</button>
            <button type="button" onClick={nextFromStep1} className={styles.btnPrimary}>다음</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.builderWrap}>
          <div className={styles.builderLeft}>
            <Stepper />
            <h2 className={styles.builderTitle}>페이지 기본 정보를 입력해 주세요</h2>

            <div className={styles.field}>
              <label>크리에이터 닉네임 <span className={styles.required}>*</span></label>
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                maxLength={20}
                placeholder="2~20자, 페이지 상단에 표시돼요"
              />
              <span className={styles.charCount}>{form.displayName.length}/20</span>
            </div>

            <div className={styles.field}>
              <label>페이지 한 줄 소개 <span className={styles.required}>*</span></label>
              <input
                type="text"
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                maxLength={100}
                placeholder="예: ETF로 적립식 투자 중인 30대 직장인"
              />
              <span className={styles.charCount}>{form.bio.length}/100</span>
            </div>

            <div className={styles.field}>
              <label>카테고리 <span className={styles.required}>*</span></label>
              <div className={styles.catGrid}>
                {CATEGORY_OPTIONS.map(o => (
                  <button
                    type="button"
                    key={o.v}
                    onClick={() => setForm(f => ({ ...f, category: o.v }))}
                    className={`${styles.catChip} ${form.category === o.v ? styles.catChipOn : ''}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label>주제 태그 <span className={styles.optional}>(선택, 검색·발견에 사용)</span></label>
              <div className={styles.topicGrid}>
                {TOPIC_OPTIONS.map(t => (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => toggleTopic(t.key)}
                    className={`${styles.topicChip} ${form.topics.includes(t.key) ? styles.topicOn : ''}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label>URL <span className={styles.optional}>(선택, 비우면 자동 생성)</span></label>
              <div className={styles.urlInput}>
                <span className={styles.urlPrefix}>etf.hannipmoney.com/creator/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))}
                  maxLength={32}
                  placeholder={autoSlug || 'my-channel'}
                />
              </div>
            </div>

            <details className={styles.optional2}>
              <summary>프로필·커버 이미지 추가 (선택)</summary>
              <div className={styles.field}>
                <ImageUploader
                  label="프로필 이미지"
                  value={form.avatar_url}
                  onChange={url => setForm(f => ({ ...f, avatar_url: url }))}
                  scope="user-avatar"
                  shape="circle"
                />
              </div>
              <div className={styles.field}>
                <ImageUploader
                  label="커버 이미지 (16:9)"
                  value={form.cover_url}
                  onChange={url => setForm(f => ({ ...f, cover_url: url }))}
                  scope="user-avatar"
                  shape="wide"
                />
              </div>
            </details>

            {err && <div className={styles.errorBox}>{err}</div>}

            <div className={styles.launchSummary}>
              <div className={styles.launchSummaryHead}>
                <span>생성될 페이지</span>
                <strong>etf.hannipmoney.com/creator/{previewSlug}</strong>
              </div>
              <ul>
                <li>기본 정보 저장 즉시 공개 채널이 만들어져요.</li>
                <li>생성 후 멤버십 상품, 정산 정보, 첫 글을 이어서 설정하면 됩니다.</li>
                <li>후기는 크리에이터 전체가 아니라 멤버십 상품 단위로 쌓이게 설계돼요.</li>
              </ul>
            </div>

            <div className={styles.actions}>
              <button type="button" onClick={() => setStep(1)} className={styles.btnSecondary}>이전</button>
              <button type="button" onClick={launch} disabled={submitting} className={styles.btnPrimary}>
                {submitting ? '런칭 중…' : '페이지 런칭하기'}
              </button>
            </div>
          </div>

          <div className={styles.builderRight}>
            <div className={styles.previewLabel}>페이지 미리보기</div>
            <PagePreview form={form} />
          </div>
        </div>
      )}
    </div>
  );
}

function PagePreview({ form }: { form: FormState }) {
  const initial = (form.displayName || 'A').slice(0, 1).toUpperCase();
  return (
    <div className={styles.previewCard}>
      {form.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={form.cover_url} alt="" className={styles.previewCover} />
      ) : (
        <div className={styles.previewCoverPlaceholder} />
      )}
      <div className={styles.previewBody}>
        {form.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.avatar_url} alt="" className={styles.previewAvatar} />
        ) : (
          <div className={styles.previewAvatarPlaceholder}>{initial}</div>
        )}
        <div className={styles.previewNameRow}>
          <strong className={styles.previewName}>{form.displayName || '닉네임'}</strong>
        </div>
        <p className={styles.previewBio}>{form.bio || '한 줄 소개가 여기에 표시돼요'}</p>
        <div className={styles.previewTabs}>
          <span className={styles.previewTabOn}>홈</span>
          <span>멤버십</span>
          <span>포스트</span>
          <span>시리즈</span>
          <span>안내</span>
        </div>
        <div className={styles.previewEmpty}>
          <span>▦</span>
          <p>페이지 런칭 후 첫 글과 멤버십을 채워요</p>
        </div>
      </div>
    </div>
  );
}
