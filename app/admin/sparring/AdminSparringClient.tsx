'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import { inferPolarity, slugifySparringTitle, sparringPath, type Sparring, type SparringPolarity } from '@/lib/sparring';
import { etfs, getEtfByCode } from '@/lib/etfs';
import { createClient } from '@/lib/supabase/client';
import { ImageCropper } from './ImageCropper';
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
  previewVotes: number;
  etfACode: string;
  etfBCode: string;
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
  previewVotes: 0,
  etfACode: '',
  etfBCode: '',
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
    previewVotes: item.stats.votes_total || 0,
    etfACode: item.etf_a_code || '',
    etfBCode: item.etf_b_code || '',
  };
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

function deadlineCopy(value: string) {
  if (!value) return '마감일 설정';

  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff)) return '마감일 확인';
  if (diff <= 0) return '마감됨';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}분 남았어요`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const restMinutes = String(minutes % 60).padStart(2, '0');
    return `${hours} : ${restMinutes} 남음`;
  }

  return `${Math.ceil(hours / 24)}일 남았어요`;
}

export default function AdminSparringClient({ initialSparrings }: { initialSparrings: Sparring[] }) {
  const [sparrings, setSparrings] = useState(initialSparrings);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  // 토스트 — 성공/에러 후 잠깐 떠 있는 알림
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // 크롭 모달 — 사용자가 파일 선택하면 모달 열림, 확인 시 webp blob 으로 file 갱신
  const [cropTarget, setCropTarget] = useState<File | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // ?edit=<id> 쿼리로 진입 시 해당 스파링 폼에 자동 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (!editId) return;
    const target = sparrings.find(s => s.id === editId);
    if (target) {
      setForm(fromSparring(target));
      setFile(null);
      // URL 정리 (편집 후 새로고침해도 다시 같은 폼 안 열림)
      window.history.replaceState(null, '', '/admin/sparring');
      // 폼 영역으로 스무스 스크롤
      setTimeout(() => {
        document.querySelector('input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [sparrings]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const previewImage = filePreviewUrl || form.thumbnailUrl;
  const previewTitle = form.title.trim() || '스파링 제목을 입력하면 여기에 보여요';
  const previewVotes = form.previewVotes || 0;

  const uploadThumbnail = async () => {
    if (!file) return form.thumbnailUrl || null;

    setMessage('이미지 업로드 중…');
    // 서버 API 경유 (서비스 롤로 RLS 우회 + admin 검증)
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/sparring/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errMsg = '업로드 실패';
      try {
        const j = await res.json();
        errMsg = j.error || errMsg;
      } catch {}
      setMessage(`❌ 이미지 업로드 실패: ${errMsg}`);
      throw new Error(`Upload API: ${errMsg}`);
    }

    const { url } = await res.json();
    if (!url) {
      setMessage('❌ 업로드는 됐지만 URL 받기 실패');
      throw new Error('No URL returned');
    }

    setMessage('✓ 이미지 업로드 완료, DB 반영 중…');
    return url;
  };

  const refresh = async () => {
    const [{ data }, { data: statsRows }] = await Promise.all([
      supabase
        .from('sparrings')
        .select('*')
        .is('deleted_at', null)
        .order('round_number', { ascending: false }),
      supabase
        .from('sparring_stats')
        .select('sparring_id,votes_a,votes_b,votes_total,comment_count'),
    ]);

    if (data) {
      const statsMap = new Map(
        (statsRows || []).map(row => [row.sparring_id, {
          votes_a: Number(row.votes_a || 0),
          votes_b: Number(row.votes_b || 0),
          votes_total: Number(row.votes_total || 0),
          comment_count: Number(row.comment_count || 0),
        }]),
      );

      setSparrings(data.map(row => ({
        ...row,
        stats: statsMap.get(row.id) || { votes_a: 0, votes_b: 0, votes_total: 0, comment_count: 0 },
      })) as Sparring[]);
    }
  };

  const submit = async () => {
    setPending(true);
    setMessage('');

    try {
      const title = form.title.trim();
      const slug = (form.slug || slugifySparringTitle(form.title)).trim();
      const sideALabel = form.sideA.trim();
      const sideBLabel = form.sideB.trim();

      if (!title || !slug || !sideALabel || !sideBLabel || !form.deadlineAt) {
        setMessage('제목, slug, 양측 라벨, 마감일을 확인해 주세요.');
        return;
      }

      const deadline = new Date(form.deadlineAt);
      if (Number.isNaN(deadline.getTime())) {
        setMessage('마감일 형식을 확인해 주세요.');
        return;
      }

      const etfACode = form.etfACode.trim() || null;
      const etfBCode = form.etfBCode.trim() || null;
      const codeRe = /^[0-9]{6}$/;
      if (etfACode && !codeRe.test(etfACode)) {
        setMessage('A ETF 코드는 6자리 숫자여야 해요.');
        return;
      }
      if (etfBCode && !codeRe.test(etfBCode)) {
        setMessage('B ETF 코드는 6자리 숫자여야 해요.');
        return;
      }

      const thumbnailUrl = await uploadThumbnail();
      const payload = {
        category: form.category,
        title,
        body: form.body.trim() || null,
        slug,
        side_a_label: sideALabel,
        side_b_label: sideBLabel,
        side_a_polarity: form.sideAPolarity || inferPolarity(form.sideA),
        side_b_polarity: form.sideBPolarity || inferPolarity(form.sideB),
        thumbnail_url: thumbnailUrl,
        deadline_at: deadline.toISOString(),
        etf_a_code: etfACode,
        etf_b_code: etfBCode,
      };

      let savedId = form.id;
      if (form.id) {
        const { error } = await supabase.from('sparrings').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from('sparrings')
          .insert({ ...payload, status: 'active' })
          .select()
          .single();
        if (error) throw error;
        savedId = inserted?.id || '';
      }

      // 캐시 즉시 무효화 — 홈/ETF/스파링 페이지 새로 빌드
      try {
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paths: ['/', '/etf', '/sparring', `/sparring/${slug}`] }),
        });
      } catch {
        // 실패해도 1분 후 ISR 로 갱신됨
      }

      const successMsg = form.id ? '✓ 수정 완료! 홈에 즉시 반영됐어요' : '✓ 새 라운드 생성 완료!';
      setMessage(successMsg);
      setToast({ type: 'success', text: successMsg });

      // 저장된 URL 로 form 갱신 (file 만 초기화, 나머지 유지 → 사용자가 결과 확인 가능)
      setForm(prev => ({ ...prev, id: savedId, thumbnailUrl: thumbnailUrl || '' }));
      setFile(null);
      await refresh();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '저장 중 문제가 생겼어요.';
      setMessage(errMsg);
      setToast({ type: 'error', text: errMsg });
    } finally {
      setPending(false);
    }
  };

  // 토스트 자동 사라짐 (성공: 3초, 에러: 6초)
  useEffect(() => {
    if (!toast) return;
    const timeout = toast.type === 'success' ? 3000 : 6000;
    const t = window.setTimeout(() => setToast(null), timeout);
    return () => window.clearTimeout(t);
  }, [toast]);

  const revalidateHome = async () => {
    try {
      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths: ['/', '/etf', '/sparring'] }),
      });
    } catch {}
  };

  const closeRound = async (id: string) => {
    setPending(true);
    const { error } = await supabase
      .from('sparrings')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id);
    setPending(false);
    if (error) setMessage(error.message);
    await revalidateHome();
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
    await revalidateHome();
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
              <textarea
                value={form.body}
                placeholder="상세 페이지에서 '이유 보기'로 열릴 설명을 적어요. 목록 카드에는 노출되지 않아요."
                onChange={event => setField('body', event.target.value)}
              />
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    style={{ flex: 1, minWidth: 0 }}
                    value={form.thumbnailUrl}
                    placeholder="https://... 이미지 주소"
                    onChange={event => setField('thumbnailUrl', event.target.value)}
                  />
                  {(form.thumbnailUrl || file) && (
                    <button
                      type="button"
                      onClick={() => { setField('thumbnailUrl', ''); setFile(null); }}
                      style={{
                        padding: '0 10px',
                        fontSize: 12,
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        borderRadius: 6,
                        color: 'var(--t3)',
                        cursor: 'pointer',
                      }}
                    >지우기</button>
                  )}
                </div>
              </label>
            </div>
            <label className={styles.field}>
              <span>썸네일 업로드</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={event => {
                  const f = event.target.files?.[0];
                  if (f) setCropTarget(f);   // 크롭 모달로
                  event.target.value = '';   // 같은 파일 재선택 가능하게
                }}
              />
              <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'var(--t3)' }}>
                업로드 후 크롭 창에서 영역을 조정할 수 있어요. <strong>1200×675 (16:9) webp</strong> 로 저장됩니다.
              </small>
            </label>

            <div className={styles.designNote}>
              <strong>ETF 비교 모드 (선택)</strong>
              <p>두 ETF 종목 코드를 모두 채우면 상세 페이지에 ETF 비교 카드가 노출돼요. 비워두면 일반 스파링과 동일하게 작동합니다.</p>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>A ETF 코드</span>
                <input
                  list="admin-etf-codes"
                  placeholder="예: 360750"
                  value={form.etfACode}
                  onChange={event => setField('etfACode', event.target.value.trim())}
                />
                {form.etfACode && (
                  <small style={{ color: getEtfByCode(form.etfACode) ? 'var(--t3)' : '#e42939' }}>
                    {getEtfByCode(form.etfACode)?.name || '⚠ 알 수 없는 코드 (라이브러리에 없는 ETF도 저장은 가능)'}
                  </small>
                )}
              </label>
              <label className={styles.field}>
                <span>B ETF 코드</span>
                <input
                  list="admin-etf-codes"
                  placeholder="예: 379800"
                  value={form.etfBCode}
                  onChange={event => setField('etfBCode', event.target.value.trim())}
                />
                {form.etfBCode && (
                  <small style={{ color: getEtfByCode(form.etfBCode) ? 'var(--t3)' : '#e42939' }}>
                    {getEtfByCode(form.etfBCode)?.name || '⚠ 알 수 없는 코드'}
                  </small>
                )}
              </label>
            </div>
            <datalist id="admin-etf-codes">
              {etfs.map(e => (
                <option key={e.code} value={e.code}>{e.name}</option>
              ))}
            </datalist>
            <div className={styles.designNote}>
              <strong>카드 디자인 메모</strong>
              <p>대표 이미지는 카드 전체 배경으로 깔려요. 위쪽 왼쪽에는 투표 수와 제목, 아래쪽에는 남은 시간과 참여하기가 올라오니 핵심 피사체는 중앙~하단에 두는 게 좋아요.</p>
            </div>
            <div className={styles.actions}>
              {form.id && <button className={styles.secondary} type="button" onClick={() => setForm(emptyForm)}>새 작성</button>}
              <button className={styles.primary} type="button" disabled={pending} onClick={submit}>
                {form.id ? '수정하기' : '등록하기'}
              </button>
            </div>
          </div>
        </section>

        <aside className={styles.sideStack}>
          <section className={styles.panel}>
            <h2>실제 노출 미리보기</h2>
            <p className={styles.previewHint} style={{ marginTop: 0, marginBottom: 12 }}>
              같은 이미지가 두 곳에서 다른 비율로 잘려요. 둘 다 보기 좋게 만들어주세요.
            </p>

            {/* 1) 홈/질문 사이드바 — SparringMiniCard (세로 320px) */}
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)', margin: '4px 0 8px' }}>
              홈/질문 사이드바 (세로 카드)
            </h3>
            <article
              className={styles.previewMini}
              style={{
                '--preview-thumb': previewImage ? `url("${previewImage}")` : 'none',
                '--preview-opacity': previewImage ? '1' : '0',
              } as CSSProperties}
            >
              <div className={styles.previewMiniCopy}>
                <span>{formatNumber(previewVotes)}명 투표 중</span>
                <strong>{previewTitle}</strong>
              </div>
              <div className={styles.previewMiniFoot}>
                <span>{deadlineCopy(form.deadlineAt)}</span>
                <b>참여하기 →</b>
              </div>
            </article>

            {/* 2) /sparring 페이지 — SparringActiveCard (가로 248px) */}
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)', margin: '20px 0 8px' }}>
              /sparring 진행중 카드 (가로 카드)
            </h3>
            <article
              className={styles.previewCard}
              style={{
                '--preview-thumb': previewImage ? `url("${previewImage}")` : 'none',
                '--preview-opacity': previewImage ? '1' : '0',
              } as CSSProperties}
            >
              <div className={styles.previewCopy}>
                <span>{formatNumber(previewVotes)}명 투표 중</span>
                <strong>{previewTitle}</strong>
              </div>
              <div className={styles.previewFoot}>
                <span>{deadlineCopy(form.deadlineAt)}</span>
                <b>참여하기</b>
              </div>
            </article>
          </section>

          <section className={styles.panel}>
            <h2>라운드 목록</h2>
            <div className={styles.list}>
              {sparrings.map(item => (
                <article key={item.id} className={styles.item}>
                  {item.thumbnail_url ? (
                    <div
                      className={styles.itemThumb}
                      style={{ backgroundImage: `url("${item.thumbnail_url}")` }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div className={styles.itemThumbEmpty} aria-hidden="true">📷</div>
                  )}
                  <div className={styles.itemBody}>
                    <div className={styles.itemMeta}>
                      <span>{item.round_number} 라운드 · {item.category}</span>
                      <span>{item.status}</span>
                    </div>
                    <strong>{item.title}</strong>
                    <div className={styles.itemStats}>
                      {formatNumber(item.stats.votes_total)}표 · 토론 {formatNumber(item.stats.comment_count)}개
                    </div>
                    <div className={styles.itemActions}>
                      <Link href={sparringPath(item.slug)}>보기</Link>
                      <button type="button" onClick={() => { setForm(fromSparring(item)); setFile(null); }}>편집</button>
                      <button type="button" disabled={pending || item.status !== 'active'} onClick={() => closeRound(item.id)}>마감</button>
                      <button type="button" disabled={pending} onClick={() => deleteRound(item.id)}>삭제</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* ── 저장 결과 토스트 ── */}
      {toast && (
        <div
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
          role="status"
          onClick={() => setToast(null)}
        >
          <span className={styles.toastIcon} aria-hidden="true">
            {toast.type === 'success' ? '✓' : '⚠️'}
          </span>
          <span className={styles.toastText}>{toast.text}</span>
        </div>
      )}

      {/* 이미지 크롭 모달 — 파일 선택 시 자동 열림 */}
      {cropTarget && (
        <ImageCropper
          file={cropTarget}
          onCancel={() => setCropTarget(null)}
          onConfirm={(blob) => {
            // Blob → File (webp) — name 에 timestamp 넣어 캐시 방지
            const webpFile = new File([blob], `sparring-${Date.now()}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            setFile(webpFile);
            setCropTarget(null);
          }}
        />
      )}
    </main>
  );
}
