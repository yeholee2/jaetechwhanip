'use client';

import { useMemo, useState } from 'react';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import { inferPolarity, slugifySparringTitle, type Sparring, type SparringPolarity } from '@/lib/sparring';
import { createClient } from '@/lib/supabase/client';
import styles from './AdminSparring.module.css';

type FormState = {
  id: string;
  title: string;
  category: string;
  body: string;
  slug: string;
  sideA: string;
  sideB: string;
  sideAPolarity: SparringPolarity;
  sideBPolarity: SparringPolarity;
  deadlineAt: string;
  thumbnailUrl: string;
};

const emptyForm: FormState = {
  id: '',
  title: '',
  category: CATEGORY_DEFINITIONS[0].key,
  body: '',
  slug: '',
  sideA: '',
  sideB: '',
  sideAPolarity: 'positive',
  sideBPolarity: 'negative',
  deadlineAt: '',
  thumbnailUrl: '',
};

function toDatetimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromSparring(item: Sparring): FormState {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    body: item.body || '',
    slug: item.slug,
    sideA: item.side_a_label,
    sideB: item.side_b_label,
    sideAPolarity: item.side_a_polarity,
    sideBPolarity: item.side_b_polarity,
    deadlineAt: toDatetimeLocal(item.deadline_at),
    thumbnailUrl: item.thumbnail_url || '',
  };
}

export default function AdminSparringClient({ initialSparrings }: { initialSparrings: Sparring[] }) {
  const [sparrings, setSparrings] = useState(initialSparrings);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = useMemo(() => createClient(), []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const uploadThumbnail = async () => {
    if (!file) return form.thumbnailUrl || null;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `sparring/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('sparring-thumbnails').upload(path, file, { upsert: false });

    if (error) {
      setMessage(`썸네일 업로드 실패: ${error.message}. URL 입력값으로 저장합니다.`);
      return form.thumbnailUrl || null;
    }

    const { data } = supabase.storage.from('sparring-thumbnails').getPublicUrl(path);
    return data.publicUrl;
  };

  const refresh = async () => {
    const { data } = await supabase
      .from('sparrings')
      .select('*')
      .is('deleted_at', null)
      .order('round_number', { ascending: false });

    if (data) {
      setSparrings(data.map(row => ({
        ...row,
        stats: { votes_a: 0, votes_b: 0, votes_total: 0, comment_count: 0 },
      })) as Sparring[]);
    }
  };

  const submit = async () => {
    setPending(true);
    setMessage('');

    try {
      const thumbnailUrl = await uploadThumbnail();
      const payload = {
        category: form.category,
        title: form.title.trim(),
        body: form.body.trim() || null,
        slug: (form.slug || slugifySparringTitle(form.title)).trim(),
        side_a_label: form.sideA.trim(),
        side_b_label: form.sideB.trim(),
        side_a_polarity: form.sideAPolarity || inferPolarity(form.sideA),
        side_b_polarity: form.sideBPolarity || inferPolarity(form.sideB),
        thumbnail_url: thumbnailUrl,
        deadline_at: new Date(form.deadlineAt).toISOString(),
        status: 'active',
      };

      if (!payload.title || !payload.slug || !payload.side_a_label || !payload.side_b_label || !form.deadlineAt) {
        setMessage('제목, slug, 양측 라벨, 마감일을 확인해 주세요.');
        return;
      }

      if (form.id) {
        const { error } = await supabase.from('sparrings').update(payload).eq('id', form.id);
        if (error) throw error;
        setMessage('라운드를 수정했어요.');
      } else {
        const { error } = await supabase.from('sparrings').insert(payload);
        if (error) throw error;
        setMessage('새 라운드를 만들었어요.');
      }

      setForm(emptyForm);
      setFile(null);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장 중 문제가 생겼어요.');
    } finally {
      setPending(false);
    }
  };

  const closeRound = async (id: string) => {
    setPending(true);
    const { error } = await supabase
      .from('sparrings')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id);
    setPending(false);
    if (error) setMessage(error.message);
    await refresh();
  };

  const deleteRound = async (id: string) => {
    setPending(true);
    const { error } = await supabase
      .from('sparrings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    setPending(false);
    if (error) setMessage(error.message);
    await refresh();
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>스파링 관리</h1>
        <p>라운드 번호는 DB에서 자동으로 붙어요. polarity는 기본값을 제안하고, 필요하면 직접 바꿔주세요.</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>{form.id ? '라운드 편집' : '새 라운드 작성'}</h2>
          <div className={styles.form}>
            {message && <p className={styles.message}>{message}</p>}
            <label className={styles.field}>
              <span>제목</span>
              <input value={form.title} onChange={event => setField('title', event.target.value)} />
            </label>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>카테고리</span>
                <select value={form.category} onChange={event => setField('category', event.target.value)}>
                  {CATEGORY_DEFINITIONS.map(category => (
                    <option key={category.key} value={category.key}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Slug</span>
                <input value={form.slug} placeholder="비우면 제목 기반 자동 생성" onChange={event => setField('slug', event.target.value)} />
              </label>
            </div>
            <label className={styles.field}>
              <span>운영자 메모</span>
              <textarea value={form.body} onChange={event => setField('body', event.target.value)} />
            </label>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>A 선택지</span>
                <input value={form.sideA} onChange={event => {
                  const value = event.target.value;
                  setForm(prev => ({ ...prev, sideA: value, sideAPolarity: inferPolarity(value) }));
                }} />
              </label>
              <label className={styles.field}>
                <span>B 선택지</span>
                <input value={form.sideB} onChange={event => {
                  const value = event.target.value;
                  setForm(prev => ({ ...prev, sideB: value, sideBPolarity: inferPolarity(value) }));
                }} />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>A polarity</span>
                <select value={form.sideAPolarity} onChange={event => setField('sideAPolarity', event.target.value as SparringPolarity)}>
                  <option value="positive">positive</option>
                  <option value="negative">negative</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>B polarity</span>
                <select value={form.sideBPolarity} onChange={event => setField('sideBPolarity', event.target.value as SparringPolarity)}>
                  <option value="positive">positive</option>
                  <option value="negative">negative</option>
                </select>
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>마감일</span>
                <input type="datetime-local" value={form.deadlineAt} onChange={event => setField('deadlineAt', event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>썸네일 URL</span>
                <input value={form.thumbnailUrl} onChange={event => setField('thumbnailUrl', event.target.value)} />
              </label>
            </div>
            <label className={styles.field}>
              <span>썸네일 업로드</span>
              <input type="file" accept="image/*" onChange={event => setFile(event.target.files?.[0] || null)} />
            </label>
            <div className={styles.actions}>
              {form.id && <button className={styles.secondary} type="button" onClick={() => setForm(emptyForm)}>새 작성</button>}
              <button className={styles.primary} type="button" disabled={pending} onClick={submit}>
                {form.id ? '수정하기' : '등록하기'}
              </button>
            </div>
          </div>
        </section>

        <aside className={styles.panel}>
          <h2>라운드 목록</h2>
          <div className={styles.list}>
            {sparrings.map(item => (
              <article key={item.id} className={styles.item}>
                <div className={styles.itemMeta}>
                  <span>{item.round_number} 라운드 · {item.category}</span>
                  <span>{item.status}</span>
                </div>
                <strong>{item.title}</strong>
                <div className={styles.itemActions}>
                  <button type="button" onClick={() => setForm(fromSparring(item))}>편집</button>
                  <button type="button" disabled={pending || item.status !== 'active'} onClick={() => closeRound(item.id)}>마감</button>
                  <button type="button" disabled={pending} onClick={() => deleteRound(item.id)}>삭제</button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
