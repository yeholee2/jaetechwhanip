'use client';

import { useState } from 'react';
import styles from '../admin.module.css';

type Migration = {
  name: string;
  file: string;
  description: string;
  requiredFor: string;
  sql: string;
  exists: boolean;
};

export default function AdminSetupClient({
  migrations,
  sqlEditorUrl,
}: {
  migrations: Migration[];
  sqlEditorUrl: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (name: string, sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(name);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      alert('복사 실패. 직접 선택해서 복사해주세요.');
    }
  };

  const allReady = migrations.every(m => m.exists);

  return (
    <>
      <div className={styles.head}>
        <h1>초기 설정 (마이그레이션)</h1>
        <p>새 기능에 필요한 DB 테이블 상태를 확인하고, 누락된 마이그레이션을 실행해요.</p>
      </div>

      {allReady && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(34,197,94,.08)',
          border: '1px solid rgba(34,197,94,.25)',
          borderRadius: 12,
          color: '#15803d',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 20,
        }}>
          ✅ 모든 테이블이 준비됐어요. 트래킹·배너·설정이 정상 작동합니다.
        </div>
      )}

      {!allReady && sqlEditorUrl && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(251,146,60,.08)',
          border: '1px solid rgba(251,146,60,.3)',
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, color: 'var(--rw-text-body, var(--t2))', marginBottom: 8 }}>
            ⚠️ 일부 테이블이 누락됐어요. 아래 SQL을 Supabase SQL Editor에서 실행해주세요.
          </div>
          <a
            href={sqlEditorUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.actionBtn}
            style={{ display: 'inline-block', marginTop: 4 }}
          >
            Supabase SQL Editor 열기 →
          </a>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {migrations.map(m => (
          <section key={m.name} className={styles.tableWrap}>
            <div className={styles.tableHead}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.exists ? '✅' : '⚠️'} {m.name}
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: m.exists ? 'rgba(34,197,94,.12)' : 'rgba(224,49,49,.12)',
                    color: m.exists ? '#15803d' : '#c92a2a',
                  }}>
                    {m.exists ? '존재' : '미생성'}
                  </span>
                </h2>
                <p style={{ fontSize: 12, color: 'var(--rw-text-muted, var(--t3))', margin: '4px 0 0' }}>
                  {m.description} · 필요한 곳: <code>{m.requiredFor}</code>
                </p>
              </div>
              {!m.exists && (
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => copy(m.name, m.sql)}
                >
                  {copied === m.name ? '복사됨 ✓' : 'SQL 복사'}
                </button>
              )}
            </div>
            {!m.exists && (
              <pre style={{
                margin: 0,
                padding: 16,
                fontSize: 11,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                background: 'var(--rw-screen, var(--bg))',
                color: 'var(--rw-text-body, var(--t2))',
                overflow: 'auto',
                maxHeight: 400,
                lineHeight: 1.5,
              }}>
                <code>{m.sql}</code>
              </pre>
            )}
          </section>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: 'var(--rw-screen, var(--bg))', borderRadius: 10, fontSize: 13, color: 'var(--rw-text-body, var(--t2))', lineHeight: 1.6 }}>
        <strong>실행 절차:</strong>
        <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
          <li>각 마이그레이션의 「SQL 복사」 버튼 클릭</li>
          <li>Supabase Dashboard → SQL Editor에서 새 쿼리 열기</li>
          <li>붙여넣고 Run (Cmd/Ctrl + Enter)</li>
          <li>이 페이지를 새로고침하면 ✅ 표시 확인</li>
        </ol>
      </div>
    </>
  );
}
