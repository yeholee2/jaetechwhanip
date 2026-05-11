'use client';

import { useMemo, useState } from 'react';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import { createClient } from '@/lib/supabase/client';
import { etfs, getEtfByCode } from '@/lib/etfs';
import type { ReportItem } from '@/lib/reports';
import styles from '../sparring/AdminSparring.module.css';

type FormState = {
  id: string;
  source: string;
  title: string;
  summary: string;
  url: string;
  thumbnailUrl: string;
  category: string;
  publishedAt: string;
  /** 쉼표 구분 6자리 코드 문자열. 저장 시 배열로 변환. */
  relatedEtfCodesText: string;
};

const emptyForm: FormState = {
  id: '',
  source: '',
  title: '',
  summary: '',
  url: '',
  thumbnailUrl: '',
  category: CATEGORY_DEFINITIONS[0].key,
  publishedAt: '',
  relatedEtfCodesText: '',
};

function toDatetimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromReport(item: ReportItem): FormState {
  return {
    id: item.id,
    source: item.source,
    title: item.title,
    summary: item.summary || '',
    url: item.url,
    thumbnailUrl: item.thumbnailUrl || '',
    category: item.category,
    publishedAt: toDatetimeLocal(item.publishedAt),
    relatedEtfCodesText: (item.relatedEtfCodes || []).join(', '),
  };
}

function parseEtfCodes(text: string): { codes: string[]; invalid: string[] } {
  const tokens = text.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
  const codes: string[] = [];
  const invalid: string[] = [];
  for (const t of tokens) {
    if (/^[0-9]{6}$/.test(t)) codes.push(t);
    else invalid.push(t);
  }
  return { codes, invalid };
}

export default function AdminReportsClient({ initialReports }: { initialReports: ReportItem[] }) {
  const [reports, setReports] = useState(initialReports);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = useMemo(() => createClient(), []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const parsedCodes = parseEtfCodes(form.relatedEtfCodesText);

  const refresh = async () => {
    const { data } = await supabase
      .from('reports')
      .select('id,source,title,summary,url,thumbnail_url,category,related_etf_codes,published_at,click_count')
      .is('deleted_at', null)
      .order('published_at', { ascending: false })
      .limit(100);
    if (data) {
      setReports(data.map((row: any) => ({
        id: row.id,
        source: row.source || '',
        title: row.title || '',
        summary: row.summary || '',
        url: row.url,
        thumbnailUrl: row.thumbnail_url || null,
        category: row.category || '재테크입문',
        publishedAt: row.published_at,
        relatedEtfCodes: Array.isArray(row.related_etf_codes) ? row.related_etf_codes : [],
        clickCount: Number(row.click_count || 0),
      })));
    }
  };

  const submit = async () => {
    setPending(true);
    setMessage('');
    try {
      const title = form.title.trim();
      const source = form.source.trim();
      const url = form.url.trim();
      if (!title || !source || !url || !form.publishedAt) {
        setMessage('제목, 출처, URL, 발행일은 필수예요.');
        return;
      }
      const published = new Date(form.publishedAt);
      if (Number.isNaN(published.getTime())) {
        setMessage('발행일 형식을 확인해 주세요.');
        return;
      }
      if (parsedCodes.invalid.length > 0) {
        setMessage(`ETF 코드 형식 오류 (6자리 숫자 필요): ${parsedCodes.invalid.join(', ')}`);
        return;
      }

      const payload = {
        source,
        title,
        summary: form.summary.trim() || null,
        url,
        thumbnail_url: form.thumbnailUrl.trim() || null,
        category: form.category,
        related_etf_codes: parsedCodes.codes,
        published_at: published.toISOString(),
      };

      if (form.id) {
        const { error } = await supabase.from('reports').update(payload).eq('id', form.id);
        if (error) throw error;
        setMessage('리포트를 수정했어요.');
      } else {
        const { error } = await supabase.from('reports').insert(payload);
        if (error) throw error;
        setMessage('새 리포트를 등록했어요.');
      }

      setForm(emptyForm);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장 중 문제가 생겼어요.');
    } finally {
      setPending(false);
    }
  };

  const softDelete = async (id: string) => {
    setPending(true);
    const { error } = await supabase
      .from('reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    setPending(false);
    if (error) setMessage(error.message);
    await refresh();
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>리포트 관리</h1>
        <p>증권사·운용사 리포트 큐레이션. 관련 ETF 코드를 같이 태깅하면 분절 해소(/etf, /sparring)와도 연결돼요.</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>{form.id ? '리포트 편집' : '새 리포트 등록'}</h2>
          <div className={styles.form}>
            {message && <p className={styles.message}>{message}</p>}

            <label className={styles.field}>
              <span>제목</span>
              <input value={form.title} onChange={e => setField('title', e.target.value)} />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>출처</span>
                <input
                  placeholder="미래에셋자산운용, 한국투자증권 등"
                  value={form.source}
                  onChange={e => setField('source', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>카테고리</span>
                <select value={form.category} onChange={e => setField('category', e.target.value)}>
                  {CATEGORY_DEFINITIONS.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className={styles.field}>
              <span>요약</span>
              <textarea
                value={form.summary}
                placeholder="2~3줄로 정리. /feed 카드에 그대로 노출돼요."
                onChange={e => setField('summary', e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>원본 URL</span>
              <input
                type="url"
                placeholder="https://..."
                value={form.url}
                onChange={e => setField('url', e.target.value)}
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>썸네일 URL (선택)</span>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.thumbnailUrl}
                  onChange={e => setField('thumbnailUrl', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>발행일</span>
                <input
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={e => setField('publishedAt', e.target.value)}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>관련 ETF 코드 (쉼표 구분, 6자리)</span>
              <input
                list="admin-report-etf-codes"
                placeholder="예: 360750, 379800"
                value={form.relatedEtfCodesText}
                onChange={e => setField('relatedEtfCodesText', e.target.value)}
              />
              <small style={{ color: 'var(--t3)' }}>
                {parsedCodes.codes.length > 0 && (
                  <>인식: {parsedCodes.codes.map(c => `${c}(${getEtfByCode(c)?.shortName || '미등록'})`).join(', ')}</>
                )}
                {parsedCodes.invalid.length > 0 && (
                  <> · <span style={{ color: '#e42939' }}>형식 오류: {parsedCodes.invalid.join(', ')}</span></>
                )}
              </small>
            </label>
            <datalist id="admin-report-etf-codes">
              {etfs.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}
            </datalist>

            <div className={styles.actions}>
              {form.id && (
                <button className={styles.secondary} type="button" onClick={() => setForm(emptyForm)}>
                  새 작성
                </button>
              )}
              <button className={styles.primary} type="button" disabled={pending} onClick={submit}>
                {form.id ? '수정하기' : '등록하기'}
              </button>
            </div>
          </div>
        </section>

        <aside className={styles.sideStack}>
          <section className={styles.panel}>
            <h2>등록된 리포트</h2>
            <div className={styles.list}>
              {reports.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--t3)', padding: '12px 4px' }}>
                  아직 등록된 리포트가 없어요. 마이그(`migration_reports_v1.sql`) 실행 여부도 확인해 주세요.
                </p>
              )}
              {reports.map(item => (
                <article key={item.id} className={styles.item}>
                  <div className={styles.itemMeta}>
                    <span>{item.source} · {item.category}</span>
                    <span>{item.clickCount || 0} 클릭</span>
                  </div>
                  <strong>{item.title}</strong>
                  <div className={styles.itemStats}>
                    {new Date(item.publishedAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}
                    {item.relatedEtfCodes.length > 0 && ` · ETF: ${item.relatedEtfCodes.join(', ')}`}
                  </div>
                  <div className={styles.itemActions}>
                    <a href={item.url} target="_blank" rel="noreferrer">원문</a>
                    <button type="button" onClick={() => setForm(fromReport(item))}>편집</button>
                    <button type="button" disabled={pending} onClick={() => softDelete(item.id)}>삭제</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
