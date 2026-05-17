'use client';

/**
 * 시리즈 CRUD — 단일 페이지 (만들기 폼 + 목록 카드).
 * RLS 가 본인 외 쓰기를 막아주니 클라이언트에서 직접 supabase 호출.
 */

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { normalizeSlug, type Creator, type CreatorSeries } from '@/lib/creator';
import { ImageUploader } from '@/components/creator/ImageUploader';
import styles from './SeriesManager.module.css';

type Props = {
  creator: Creator;
  initialSeries: CreatorSeries[];
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  cover_url: string;
};

const emptyForm: FormState = { title: '', slug: '', description: '', cover_url: '' };

export function SeriesManagerClient({ creator, initialSeries }: Props) {
  const supabase = createClient();
  const [list, setList] = useState<CreatorSeries[]>(initialSeries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErr('');
  };

  const openEdit = (s: CreatorSeries) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      slug: s.slug,
      description: s.description || '',
      cover_url: s.cover_url || '',
    });
    setErr('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.title.trim()) { setErr('제목을 입력해주세요.'); return; }
    const finalSlug = (form.slug.trim() || normalizeSlug(form.title) || `series-${Date.now().toString(36)}`).slice(0, 32);

    setSaving(true);
    try {
      if (editingId) {
        const { data, error } = await supabase
          .from('creator_series')
          .update({
            title: form.title.trim(),
            slug: finalSlug,
            description: form.description.trim() || null,
            cover_url: form.cover_url.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)
          .select('*')
          .single();
        if (error) { setErr(error.message); return; }
        setList(prev => prev.map(s => s.id === editingId ? (data as CreatorSeries) : s));
      } else {
        const { data, error } = await supabase
          .from('creator_series')
          .insert({
            creator_id: creator.id,
            title: form.title.trim(),
            slug: finalSlug,
            description: form.description.trim() || null,
            cover_url: form.cover_url.trim() || null,
            is_published: true,
          })
          .select('*')
          .single();
        if (error) { setErr(error.message); return; }
        setList(prev => [data as CreatorSeries, ...prev]);
      }
      setForm(emptyForm);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: CreatorSeries) => {
    if (!window.confirm(`'${s.title}' 시리즈를 삭제할까요?\n묶여 있던 글들은 풀려서 보존돼요.`)) return;
    const { error } = await supabase.from('creator_series').delete().eq('id', s.id);
    if (error) { alert(error.message); return; }
    setList(prev => prev.filter(x => x.id !== s.id));
    if (editingId === s.id) { setEditingId(null); setForm(emptyForm); }
  };

  const togglePublished = async (s: CreatorSeries) => {
    const next = !s.is_published;
    const { error } = await supabase
      .from('creator_series')
      .update({ is_published: next, updated_at: new Date().toISOString() })
      .eq('id', s.id);
    if (error) { alert(error.message); return; }
    setList(prev => prev.map(x => x.id === s.id ? { ...x, is_published: next } : x));
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1>시리즈 관리</h1>
          <p>{creator.display_name} · 묶음으로 관련 글을 정리해보세요.</p>
        </div>
        <Link href={`/creator/${creator.slug}`} className={styles.back}>← 페이지로</Link>
      </header>

      <form onSubmit={save} className={styles.formCard}>
        <div className={styles.formHead}>{editingId ? '시리즈 수정' : '새 시리즈 만들기'}</div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label>제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="예: 2026년 반도체 톺아보기"
              maxLength={60}
            />
          </div>
          <div className={styles.field}>
            <label>URL slug <span className={styles.optional}>(자동 생성)</span></label>
            <input
              type="text"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="2026-semiconductor"
              maxLength={32}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label>설명 <span className={styles.optional}>(선택)</span></label>
          <textarea
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="이 시리즈가 어떤 주제·관점을 다루는지 한 줄로."
            maxLength={200}
          />
        </div>

        <div className={styles.field}>
          <ImageUploader
            label="커버 이미지 (선택, 16:9)"
            value={form.cover_url}
            onChange={url => setForm(f => ({ ...f, cover_url: url }))}
            scope="post-thumb"
            shape="wide"
          />
        </div>

        {err && <div className={styles.errorBox}>{err}</div>}

        <div className={styles.actions}>
          {editingId && (
            <button type="button" onClick={openNew} className={styles.btnSecondary}>새로 만들기로</button>
          )}
          <button type="submit" disabled={saving} className={styles.btnPrimary}>
            {saving ? '저장 중…' : editingId ? '수정 저장' : '시리즈 만들기'}
          </button>
        </div>
      </form>

      <section className={styles.listSection}>
        <div className={styles.listHead}>
          <strong>내 시리즈</strong>
          <span>{list.length}개</span>
        </div>
        {list.length === 0 ? (
          <div className={styles.empty}>
            아직 만든 시리즈가 없어요. 위 폼에서 첫 시리즈를 만들어보세요.
          </div>
        ) : (
          <ul className={styles.list}>
            {list.map(s => (
              <li key={s.id} className={`${styles.item} ${s.is_published ? '' : styles.itemHidden}`}>
                {s.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.cover_url} alt="" className={styles.itemCover} />
                )}
                <div className={styles.itemBody}>
                  <strong>{s.title}</strong>
                  <span className={styles.itemSlug}>/series/{s.slug}</span>
                  {s.description && <p>{s.description}</p>}
                </div>
                <div className={styles.itemActions}>
                  <button type="button" onClick={() => togglePublished(s)} className={styles.iconBtn} title={s.is_published ? '비공개로' : '공개로'}>
                    {s.is_published ? '👁️' : '🙈'}
                  </button>
                  <button type="button" onClick={() => openEdit(s)} className={styles.iconBtn} title="수정">✏️</button>
                  <button type="button" onClick={() => remove(s)} className={styles.iconBtn} title="삭제">🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
