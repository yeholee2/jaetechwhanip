'use client';

/**
 * ETF 보유종목 수동 업로드.
 *
 * 입력 형식: 한 줄당 `심볼,이름,비중`
 *   005930,삼성전자,29.5
 *   000660,SK하이닉스,8.2
 *   ...
 *
 * - 비중은 % (0~100) 또는 소수(0~1) 둘 다 OK — 서버에서 자동 정규화
 * - 탭/세미콜론 구분자도 허용
 */

import { useState } from 'react';

export function HoldingsUploadClient() {
  const [etfCode, setEtfCode] = useState('');
  const [source, setSource] = useState('manual');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  const parse = (text: string) => {
    return text.split(/\r?\n/).map(line => {
      const parts = line.split(/[,;\t]/).map(s => s.trim());
      if (parts.length < 3) return null;
      const [symbol, name, w] = parts;
      const weight = parseFloat(w.replace('%', ''));
      if (!symbol || !Number.isFinite(weight)) return null;
      return { symbol, name, weight };
    }).filter(Boolean) as { symbol: string; name: string; weight: number }[];
  };

  const submit = async () => {
    setResult('');
    const items = parse(raw);
    if (!etfCode.trim() || items.length === 0) {
      setResult('❌ ETF 코드와 한 줄 이상이 필요해요.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/holdings/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etfCode: etfCode.trim(), source, items }),
      });
      const j = await r.json();
      if (r.ok) {
        setResult(`✓ ${j.count}건 저장 — ${j.scaled ? '비중은 0~100 → 0~1 로 정규화됨' : '비중 그대로 사용'}`);
      } else {
        setResult(`❌ ${j.error || 'failed'}`);
      }
    } catch (e: any) {
      setResult(`❌ ${e?.message || 'network'}`);
    } finally {
      setBusy(false);
    }
  };

  const sample = `005930,삼성전자,29.5
000660,SK하이닉스,8.2
005380,현대차,3.1`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={etfCode}
          onChange={e => setEtfCode(e.target.value)}
          placeholder="ETF 코드 (예: 069500)"
          style={inputStyle}
        />
        <input
          type="text"
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="출처 (manual / KODEX / TIGER ...)"
          style={inputStyle}
        />
      </div>
      <textarea
        value={raw}
        onChange={e => setRaw(e.target.value)}
        placeholder={`심볼,이름,비중\n${sample}`}
        rows={12}
        style={{
          ...inputStyle,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          style={{
            padding: '10px 18px',
            background: 'var(--rw-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 900,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          onClick={() => setRaw(sample)}
          style={{
            padding: '10px 14px',
            background: 'transparent',
            border: '1px solid var(--rw-border)',
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            color: 'var(--rw-text-body)',
          }}
        >
          샘플 채우기
        </button>
        {result && <span style={{ fontSize: 13, fontWeight: 700 }}>{result}</span>}
      </div>
      <details style={{ fontSize: 12, color: 'var(--rw-text-muted)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>형식 도움말</summary>
        <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>한 줄당 하나의 종목 — `심볼,이름,비중`</li>
          <li>구분자: 콤마(,), 세미콜론(;), 탭 모두 OK</li>
          <li>비중은 % (29.5) 또는 소수 (0.295) 둘 다 인식</li>
          <li>같은 ETF 코드로 다시 업로드하면 기존 데이터가 교체돼요</li>
          <li>KODEX 200 → 069500, TIGER 미국S&P500 → 360750 등 6자리 코드 사용</li>
        </ul>
      </details>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
  padding: '10px 12px',
  border: '1px solid var(--rw-border)',
  borderRadius: 8,
  background: 'var(--rw-card-muted)',
  fontSize: 13.5,
  fontWeight: 600,
  color: 'var(--rw-text-strong)',
};
