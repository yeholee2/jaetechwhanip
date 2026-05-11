'use client';

import { useEffect, useRef, useState } from 'react';
import { FaIcon } from '@/components/FaIcon';
import { Badge } from '@/components/ui';
import styles from './EtfChat.module.css';

type Message = {
  role: 'user' | 'assistant' | 'error';
  content: string;
};

type EtfChatContext = {
  code: string;
  name: string;
  summary?: string;
  theme?: string;
  fee?: string;
  distribution?: string;
  hedge?: string;
  aum?: string;
};

const SUGGESTIONS = [
  '이 ETF 처음 사도 괜찮을까요?',
  '월배당 ETF인가요? 분배 주기를 알려주세요.',
  '비슷한 ETF가 있다면 추천해주세요.',
  '세금은 어떻게 매겨지나요?',
];

export function EtfChat({ etf }: { etf: EtfChatContext }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || pending) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setPending(true);
    try {
      const res = await fetch('/api/etf/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, etfContext: etf }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'error', content: data.error || '실패' }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'error', content: `네트워크 오류: ${error?.message}` }]);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={styles.chat} aria-label="ETF AI 도우미">
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={styles.toggleLeft}>
          <span className={`${styles.aiIcon} tf`} aria-hidden="true">🤖</span>
          <div>
            <strong>이 ETF에 대해 AI에게 물어보기</strong>
            <span>{etf.name} 컨텍스트로 답변해요</span>
          </div>
        </span>
        <span className={styles.toggleRight}>
          <Badge tone="purple">β</Badge>
          <FaIcon name="chevron-down" size={12} />
        </span>
      </button>

      {open && (
        <div className={styles.body}>
          <div ref={scrollRef} className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.empty}>
                <p>이 ETF에 대해 궁금한 점을 물어보세요.</p>
                <div className={styles.suggestions}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={styles.suggestion}
                      onClick={() => send(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`${styles.msg} ${
                  m.role === 'user'
                    ? styles.msgUser
                    : m.role === 'error'
                    ? styles.msgError
                    : styles.msgAi
                }`}
              >
                {m.role !== 'user' && (
                  <span className={`${styles.msgIcon} tf`} aria-hidden="true">
                    {m.role === 'error' ? '⚠️' : '🤖'}
                  </span>
                )}
                <div className={styles.msgBubble}>{m.content}</div>
              </div>
            ))}
            {pending && (
              <div className={`${styles.msg} ${styles.msgAi}`}>
                <span className={`${styles.msgIcon} tf`} aria-hidden="true">🤖</span>
                <div className={styles.msgBubble}>
                  <span className={styles.dots}><span /><span /><span /></span>
                </div>
              </div>
            )}
          </div>

          <form
            className={styles.inputRow}
            onSubmit={e => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`${etf.name}에 대해 물어보기…`}
              maxLength={500}
              disabled={pending}
            />
            <button type="submit" disabled={pending || !input.trim()}>
              <FaIcon name="paper-plane" size={14} />
            </button>
          </form>

          <p className={styles.disclaimer}>
            ※ AI 답변은 참고용이며 투자 권유가 아니에요.
          </p>
        </div>
      )}
    </section>
  );
}
