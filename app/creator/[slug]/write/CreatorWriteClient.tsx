'use client';

/**
 * 크리에이터 글 작성 — Phase 2/3 통합본.
 * - 자동저장: localStorage debounced 1s. "이어서 작성하기" 카드 노출.
 * - 태그: 최대 15개, 개당 20자.
 * - 예약발행: 즉시 / 예약 (publish_at).
 * - 시리즈: creator_series 에서 골라 묶기.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizeSlug, type Creator, type CreatorSeries } from '@/lib/creator';
import type { PostTemplate } from '@/lib/creatorTemplatesTypes';
import { ImageUploader } from '@/components/creator/ImageUploader';
import { RichEditor } from '@/components/creator/RichEditor';
import { TemplatePicker } from '@/components/creator/TemplatePicker';
import { TagsInput } from '@/components/creator/TagsInput';
import styles from './CreatorWrite.module.css';

type FormState = {
  title: string;
  body: string;
  cover_url: string;
  preview: string;
  is_member_only: boolean;
  tags: string[];
  publish_mode: 'now' | 'scheduled';
  publish_at_local: string; // datetime-local format
  series_id: string | null;
};

const DRAFT_VERSION = 1;
const draftKey = (creatorId: string) => `creator_draft_v${DRAFT_VERSION}_${creatorId}`;

function emptyForm(): FormState {
  return {
    title: '',
    body: '',
    cover_url: '',
    preview: '',
    is_member_only: false,
    tags: [],
    publish_mode: 'now',
    publish_at_local: '',
    series_id: null,
  };
}

function isEmpty(f: FormState): boolean {
  return !f.title.trim() && !f.body.trim() && !f.cover_url && !f.tags.length;
}

export function CreatorWriteClient({ creator, templates = [] }: { creator: Creator; templates?: PostTemplate[] }) {
  const router = useRouter();
  const [showTemplatePicker, setShowTemplatePicker] = useState(templates.length > 0);
  const [pickedTemplate, setPickedTemplate] = useState<PostTemplate | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // 자동저장 상태
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<FormState | null>(null);
  const draftKeyMemo = useMemo(() => draftKey(creator.id), [creator.id]);
  const skipAutosaveRef = useRef(false);

  // 시리즈 목록
  const [seriesList, setSeriesList] = useState<CreatorSeries[]>([]);

  // 1) 마운트: 드래프트 + 시리즈 페치
  useEffect(() => {
    // 드래프트
    try {
      const raw = window.localStorage.getItem(draftKeyMemo);
      if (raw) {
        const parsed = JSON.parse(raw) as { form?: FormState; ts?: number };
        if (parsed.form && !isEmpty(parsed.form)) {
          setRestoreCandidate(parsed.form);
          setShowTemplatePicker(false);
        }
      }
    } catch {
      // ignore corrupt draft
    }

    // 시리즈
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('creator_series')
        .select('id, creator_id, title, slug, description, cover_url, is_published, created_at, updated_at')
        .eq('creator_id', creator.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (data) setSeriesList(data as CreatorSeries[]);
    })().catch(() => {});
  }, [creator.id, draftKeyMemo]);

  // 2) 자동저장 (debounced 1s)
  useEffect(() => {
    if (skipAutosaveRef.current) return;
    if (isEmpty(form)) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKeyMemo, JSON.stringify({ form, ts: Date.now() }));
        setLastSavedAt(Date.now());
      } catch {}
    }, 1000);
    return () => clearTimeout(t);
  }, [form, draftKeyMemo]);

  const restoreDraft = useCallback(() => {
    if (!restoreCandidate) return;
    setForm(restoreCandidate);
    setRestoreCandidate(null);
  }, [restoreCandidate]);

  const discardDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKeyMemo);
    } catch {}
    setRestoreCandidate(null);
  }, [draftKeyMemo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.title.trim()) {
      setErr('제목은 필수예요.');
      return;
    }
    if (!form.body.trim()) {
      setErr('본문을 입력해주세요.');
      return;
    }
    if (form.is_member_only && !creator.membership_enabled) {
      setErr('멤버 전용 글은 멤버십을 먼저 활성화해야 해요. 페이지 편집에서 켜주세요.');
      return;
    }

    // 예약 시각 검증
    let publishAtIso: string | null = null;
    if (form.publish_mode === 'scheduled') {
      if (!form.publish_at_local) {
        setErr('예약 시각을 선택해주세요.');
        return;
      }
      const d = new Date(form.publish_at_local);
      if (isNaN(d.getTime())) {
        setErr('예약 시각이 올바르지 않아요.');
        return;
      }
      if (d.getTime() <= Date.now()) {
        setErr('예약 시각은 현재 이후여야 해요.');
        return;
      }
      publishAtIso = d.toISOString();
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const baseSlug = normalizeSlug(form.title) || `post-${Date.now()}`;
      const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

      const { data, error } = await supabase
        .from('creator_posts')
        .insert({
          creator_id: creator.id,
          title: form.title.trim(),
          slug,
          body: form.body.trim(),
          cover_url: form.cover_url.trim() || null,
          preview: form.preview.trim() || null,
          is_member_only: form.is_member_only,
          is_published: true,
          tags: form.tags,
          publish_at: publishAtIso,
          series_id: form.series_id,
        })
        .select('id, slug')
        .single();
      if (error) {
        setErr(error.message);
        return;
      }
      // 발행 성공 → 드래프트 비움
      skipAutosaveRef.current = true;
      try { window.localStorage.removeItem(draftKeyMemo); } catch {}

      // 즉시 발행만 알림/인덱싱 (예약은 publish_at 도래 후 별도 처리 필요)
      if (form.publish_mode === 'now') {
        fetch('/api/creator/posts/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: data!.id }),
        }).catch(() => {});
        fetch('/api/creator/posts/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: data!.id }),
        }).catch(() => {});
      }
      router.push(`/creator/${creator.slug}/posts/${data!.slug}`);
    } finally {
      setSaving(false);
    }
  };

  if (showTemplatePicker) {
    return (
      <main className={styles.wrap}>
        <header className={styles.head}>
          <h1>글 작성</h1>
          <p>{creator.display_name} · {creator.membership_enabled ? '멤버십 활성' : '무료 페이지'}</p>
        </header>
        <TemplatePicker
          templates={templates}
          onPick={t => {
            setPickedTemplate(t);
            setForm(f => ({ ...f, body: t.body_html }));
            setShowTemplatePicker(false);
          }}
          onSkip={() => setShowTemplatePicker(false)}
        />
      </main>
    );
  }

  const lastSavedLabel = lastSavedAt
    ? `자동저장 · ${new Date(lastSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1>글 작성</h1>
        <p>
          {creator.display_name} · {creator.membership_enabled ? '멤버십 활성' : '무료 페이지'}
          {pickedTemplate && (
            <>
              {' · '}
              <span style={{ color: 'var(--rw-primary)' }}>{pickedTemplate.emoji} {pickedTemplate.name} 템플릿</span>
              {' '}
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                style={{ background: 'none', border: 'none', color: 'var(--rw-text-muted)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
              >
                변경
              </button>
            </>
          )}
          {lastSavedLabel && (
            <>
              {' · '}
              <span className={styles.savedHint}>{lastSavedLabel}</span>
            </>
          )}
        </p>
      </header>

      {restoreCandidate && (
        <div className={styles.restoreCard}>
          <div className={styles.restoreBody}>
            <strong>📝 이어서 작성하기</strong>
            <span>
              저장된 초안이 있어요{restoreCandidate.title ? ` — "${restoreCandidate.title}"` : ''}.
            </span>
          </div>
          <div className={styles.restoreActions}>
            <button type="button" onClick={discardDraft} className={styles.btnSecondary}>버리기</button>
            <button type="button" onClick={restoreDraft} className={styles.btnPrimary}>불러오기</button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className={styles.form}>
        <div className={styles.field}>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="제목을 입력하세요"
            className={styles.titleInput}
            maxLength={120}
          />
        </div>

        <div className={styles.field}>
          <ImageUploader
            label="썸네일 이미지 (선택, 16:9 권장)"
            value={form.cover_url}
            onChange={url => setForm(f => ({ ...f, cover_url: url }))}
            scope="post-thumb"
            shape="wide"
          />
        </div>

        <div className={styles.field}>
          <label>본문</label>
          <RichEditor
            value={form.body}
            onChange={html => setForm(f => ({ ...f, body: html }))}
            placeholder="멤버에게 어떤 인사이트를 전달할지 적어보세요. 헤딩·인용·이미지·차트·페이월 모두 지원해요."
          />
        </div>

        <div className={styles.field}>
          <label>태그 <span className={styles.optional}>(검색·발견·시리즈 묶기에 사용)</span></label>
          <TagsInput
            value={form.tags}
            onChange={tags => setForm(f => ({ ...f, tags }))}
          />
        </div>

        {seriesList.length > 0 && (
          <div className={styles.field}>
            <label>시리즈 <span className={styles.optional}>(선택)</span></label>
            <select
              value={form.series_id || ''}
              onChange={e => setForm(f => ({ ...f, series_id: e.target.value || null }))}
              className={styles.select}
            >
              <option value="">묶지 않음</option>
              {seriesList.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.memberToggle}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={form.is_member_only}
              onChange={e => setForm(f => ({ ...f, is_member_only: e.target.checked }))}
              disabled={!creator.membership_enabled}
            />
            <div>
              <strong>멤버 전용 글</strong>
              <span>
                {creator.membership_enabled
                  ? `월 ${creator.membership_price_won?.toLocaleString()}원 ${creator.membership_tier_name}만 전체 본문을 볼 수 있어요.`
                  : '멤버십이 비활성화된 상태예요. 페이지 편집에서 멤버십을 켜야 사용할 수 있어요.'}
              </span>
            </div>
          </label>
        </div>

        {form.is_member_only && (
          <div className={styles.field}>
            <label>무료 미리보기 <span className={styles.optional}>(paywall 위에 노출)</span></label>
            <textarea
              rows={4}
              value={form.preview}
              onChange={e => setForm(f => ({ ...f, preview: e.target.value }))}
              placeholder="멤버가 아닌 사람도 볼 수 있는 첫 단락을 적어주세요. 호기심을 끄는 한두 문단이 좋아요."
              maxLength={400}
            />
          </div>
        )}

        <div className={styles.publishCard}>
          <div className={styles.publishHead}>📅 발행 시점</div>
          <div className={styles.publishGroup}>
            <label className={`${styles.publishOption} ${form.publish_mode === 'now' ? styles.publishOptionOn : ''}`}>
              <input
                type="radio"
                name="publish_mode"
                value="now"
                checked={form.publish_mode === 'now'}
                onChange={() => setForm(f => ({ ...f, publish_mode: 'now', publish_at_local: '' }))}
              />
              <div>
                <strong>지금 바로</strong>
                <span>발행 즉시 팔로워에게 알림이 가요.</span>
              </div>
            </label>
            <label className={`${styles.publishOption} ${form.publish_mode === 'scheduled' ? styles.publishOptionOn : ''}`}>
              <input
                type="radio"
                name="publish_mode"
                value="scheduled"
                checked={form.publish_mode === 'scheduled'}
                onChange={() => setForm(f => ({ ...f, publish_mode: 'scheduled' }))}
              />
              <div>
                <strong>예약 발행</strong>
                <span>선택한 시각이 되면 노출돼요.</span>
              </div>
            </label>
          </div>
          {form.publish_mode === 'scheduled' && (
            <input
              type="datetime-local"
              value={form.publish_at_local}
              onChange={e => setForm(f => ({ ...f, publish_at_local: e.target.value }))}
              className={styles.dtInput}
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
            />
          )}
        </div>

        {err && <div className={styles.errorBox}>{err}</div>}

        <div className={styles.actions}>
          <button type="button" onClick={() => router.back()} className={styles.btnSecondary}>
            취소
          </button>
          <button type="submit" disabled={saving} className={styles.btnPrimary}>
            {saving ? '발행 중…' : form.publish_mode === 'scheduled' ? '예약 발행' : '발행'}
          </button>
        </div>
      </form>
    </main>
  );
}
