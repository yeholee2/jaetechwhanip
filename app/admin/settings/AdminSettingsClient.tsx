'use client';

import { useState } from 'react';
import { setSetting, type HomeRollingBanner, type SiteBanner } from '@/lib/site-settings';
import { ImageUploader } from '@/components/creator/ImageUploader';
import styles from '../admin.module.css';

type Initial = {
  keywords: string[];
  banner: SiteBanner;
  rollingBanners: HomeRollingBanner[];
  spamWords: string[];
};

function newRollingBanner(): HomeRollingBanner {
  return {
    id: `home-${Date.now().toString(36)}`,
    enabled: true,
    eyebrow: '재프콘',
    title: '',
    description: '',
    ctaLabel: '자세히 보기',
    link: '',
    imageUrl: '',
    dimImage: true,
  };
}

export default function AdminSettingsClient({ initial }: { initial: Initial }) {
  const [keywords, setKeywords] = useState<string[]>(initial.keywords);
  const [keywordInput, setKeywordInput] = useState('');
  const [banner, setBanner] = useState<SiteBanner>(initial.banner);
  const [rollingBanners, setRollingBanners] = useState<HomeRollingBanner[]>(initial.rollingBanners || []);
  const [spamWords, setSpamWords] = useState<string[]>(initial.spamWords);
  const [spamInput, setSpamInput] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const saveKeywords = async () => {
    setSavingKey('home_keywords');
    const ok = await setSetting('home_keywords', keywords);
    setSavingKey(null);
    showToast(ok ? '인기 키워드 저장됨' : '저장 실패');
  };

  const saveBanner = async () => {
    setSavingKey('banner');
    const ok = await setSetting('banner', banner);
    setSavingKey(null);
    showToast(ok ? '배너 저장됨' : '저장 실패');
  };

  const saveRollingBanners = async () => {
    setSavingKey('home_rolling_banners');
    const cleaned = rollingBanners.map((item, index) => ({
      ...item,
      id: item.id || `home-${index}`,
      eyebrow: item.eyebrow.trim(),
      title: item.title.trim(),
      description: item.description.trim(),
      ctaLabel: item.ctaLabel.trim(),
      link: item.link.trim(),
      imageUrl: item.imageUrl.trim(),
      dimImage: item.dimImage !== false,
    }));
    const ok = await setSetting('home_rolling_banners', cleaned);
    setSavingKey(null);
    showToast(ok ? '홈 롤링배너 저장됨' : '저장 실패');
  };

  const saveSpam = async () => {
    setSavingKey('spam_words');
    const ok = await setSetting('spam_words', spamWords);
    setSavingKey(null);
    showToast(ok ? '스팸 단어 저장됨' : '저장 실패');
  };

  const addKeyword = () => {
    const v = keywordInput.trim().replace(/^#/, '');
    if (!v || keywords.includes(v)) return;
    setKeywords(prev => [...prev, v]);
    setKeywordInput('');
  };
  const removeKeyword = (k: string) => setKeywords(prev => prev.filter(x => x !== k));

  const addSpam = () => {
    const v = spamInput.trim().toLowerCase();
    if (!v || spamWords.includes(v)) return;
    setSpamWords(prev => [...prev, v]);
    setSpamInput('');
  };
  const removeSpam = (w: string) => setSpamWords(prev => prev.filter(x => x !== w));

  const updateRollingBanner = (index: number, patch: Partial<HomeRollingBanner>) => {
    setRollingBanners(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const removeRollingBanner = (index: number) => {
    setRollingBanners(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className={styles.head}>
        <h1>사이트 설정</h1>
        <p>인기 키워드, 홈 롤링배너, 공지 배너, 스팸 필터 단어를 관리해요.</p>
      </div>

      {/* 1. 인기 키워드 */}
      <section className={styles.tableWrap} style={{ marginBottom: 20 }}>
        <div className={styles.tableHead}>
          <h2>인기 키워드</h2>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={saveKeywords}
            disabled={savingKey === 'home_keywords'}
          >
            {savingKey === 'home_keywords' ? '저장중…' : '저장'}
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 12px' }}>
            홈 사이드바에 노출되는 해시태그. 추가/삭제 후 저장 버튼을 눌러주세요.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {keywords.map(k => (
              <span
                key={k}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px 6px 12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: 16,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                #{k}
                <button
                  type="button"
                  onClick={() => removeKeyword(k)}
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: 'none', background: 'transparent',
                    color: 'var(--t3)', cursor: 'pointer', fontSize: 14,
                  }}
                  aria-label={`${k} 삭제`}
                >×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              placeholder="새 키워드 입력 후 Enter"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid var(--line)',
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <button type="button" onClick={addKeyword} className={styles.actionBtn}>추가</button>
          </div>
        </div>
      </section>

      {/* 2. 홈 롤링배너 */}
      <section className={styles.tableWrap} style={{ marginBottom: 20 }}>
        <div className={styles.tableHead}>
          <h2>홈 롤링배너</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setRollingBanners(prev => [...prev, newRollingBanner()])}
            >
              추가
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={saveRollingBanners}
              disabled={savingKey === 'home_rolling_banners'}
            >
              {savingKey === 'home_rolling_banners' ? '저장중…' : '저장'}
            </button>
          </div>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>
            홈 피드 상단에 큰 롤링 배너로 노출돼요. 이미지가 있으면 우측 비주얼로 들어가고, 없으면 어두운 기본 배경으로 표시됩니다.
          </p>
          {rollingBanners.length === 0 && (
            <div className={styles.empty} style={{ padding: 24 }}>등록된 롤링배너가 없어요.</div>
          )}
          {rollingBanners.map((item, index) => (
            <div
              key={item.id || index}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 280px',
                gap: 16,
                padding: 16,
                border: '1px solid var(--line)',
                borderRadius: 10,
                background: 'var(--bg)',
              }}
            >
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={e => updateRollingBanner(index, { enabled: e.target.checked })}
                    />
                    노출
                  </label>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.danger}`}
                    onClick={() => removeRollingBanner(index)}
                  >
                    삭제
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>라벨</label>
                    <input
                      type="text"
                      value={item.eyebrow}
                      onChange={e => updateRollingBanner(index, { eyebrow: e.target.value })}
                      placeholder="예: 오프라인 세미나"
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>제목</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={e => updateRollingBanner(index, { title: e.target.value })}
                      placeholder="배너 제목"
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>설명</label>
                  <textarea
                    value={item.description}
                    onChange={e => updateRollingBanner(index, { description: e.target.value })}
                    placeholder="짧은 설명"
                    rows={2}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>버튼 문구</label>
                    <input
                      type="text"
                      value={item.ctaLabel}
                      onChange={e => updateRollingBanner(index, { ctaLabel: e.target.value })}
                      placeholder="예: 신청하기"
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>링크</label>
                    <input
                      type="text"
                      value={item.link}
                      onChange={e => updateRollingBanner(index, { link: e.target.value })}
                      placeholder="/creators 또는 https://..."
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <ImageUploader
                  value={item.imageUrl}
                  onChange={url => updateRollingBanner(index, { imageUrl: url })}
                  scope="user-avatar"
                  shape="wide"
                  label="배너 이미지"
                />
                <input
                  type="text"
                  value={item.imageUrl}
                  onChange={e => updateRollingBanner(index, { imageUrl: e.target.value })}
                  placeholder="이미지 URL 직접 입력"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t3)' }}>
                  <input
                    type="checkbox"
                    checked={item.dimImage !== false}
                    onChange={e => updateRollingBanner(index, { dimImage: e.target.checked })}
                  />
                  이미지 어둡게 처리
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 공지 배너 */}
      <section className={styles.tableWrap} style={{ marginBottom: 20 }}>
        <div className={styles.tableHead}>
          <h2>공지 배너</h2>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={saveBanner}
            disabled={savingKey === 'banner'}
          >
            {savingKey === 'banner' ? '저장중…' : '저장'}
          </button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={banner.enabled}
              onChange={e => setBanner(prev => ({ ...prev, enabled: e.target.checked }))}
            />
            <span style={{ fontWeight: 600 }}>배너 활성화</span>
          </label>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>메시지</label>
            <input
              type="text"
              value={banner.message}
              onChange={e => setBanner(prev => ({ ...prev, message: e.target.value }))}
              placeholder="예: 새 기능 — AI 답변 요약이 출시됐어요"
              style={{
                width: '100%', padding: '8px 12px',
                border: '1px solid var(--line)', borderRadius: 8, fontSize: 13,
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>링크 (선택)</label>
            <input
              type="url"
              value={banner.link}
              onChange={e => setBanner(prev => ({ ...prev, link: e.target.value }))}
              placeholder="https://..."
              style={{
                width: '100%', padding: '8px 12px',
                border: '1px solid var(--line)', borderRadius: 8, fontSize: 13,
              }}
            />
          </div>
        </div>
      </section>

      {/* 4. 스팸 필터 */}
      <section className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <h2>스팸 필터 단어</h2>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={saveSpam}
            disabled={savingKey === 'spam_words'}
          >
            {savingKey === 'spam_words' ? '저장중…' : '저장'}
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 12px' }}>
            이 단어들이 포함된 질문/답변은 표시되지 않거나 관리자 검토 대상이 돼요. (소문자 자동 변환)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {spamWords.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--t3)' }}>등록된 단어가 없어요.</span>
            )}
            {spamWords.map(w => (
              <span
                key={w}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px 6px 12px',
                  background: 'rgba(224,49,49,.08)',
                  border: '1px solid rgba(224,49,49,.2)',
                  borderRadius: 16,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#c92a2a',
                }}
              >
                {w}
                <button
                  type="button"
                  onClick={() => removeSpam(w)}
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: 'none', background: 'transparent',
                    color: '#c92a2a', cursor: 'pointer', fontSize: 14,
                  }}
                  aria-label={`${w} 삭제`}
                >×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={spamInput}
              onChange={e => setSpamInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSpam())}
              placeholder="단어 입력 후 Enter"
              style={{
                flex: 1, padding: '8px 12px',
                border: '1px solid var(--line)', borderRadius: 8, fontSize: 13,
              }}
            />
            <button type="button" onClick={addSpam} className={styles.actionBtn}>추가</button>
          </div>
        </div>
      </section>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '12px 20px',
          background: 'var(--t1)',
          color: 'var(--white)',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,.15)',
          zIndex: 1000,
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
