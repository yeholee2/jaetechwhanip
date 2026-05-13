'use client';

/**
 * ETF 상세 — 섹션 앵커 nav (PC sticky, 토스/펀ETF 톤).
 *
 * - 클릭 시 해당 섹션으로 스무스 스크롤
 * - 스크롤 중인 섹션을 IntersectionObserver 로 추적해 active 표시
 *
 * 모바일에선 가로 스크롤 가능한 횡 nav 로 자동 전환 (CSS).
 */

import { useEffect, useState } from 'react';
import styles from './EtfSectionNav.module.css';

const SECTIONS: { id: string; label: string; sub: string }[] = [
  { id: 'sec-quote',  label: '01 시세',     sub: '가격·수익률' },
  { id: 'sec-health', label: '02 건전성',   sub: '보수·위험' },
  { id: 'sec-inside', label: '03 속살',     sub: '구성·섹터' },
  { id: 'sec-match',  label: '04 궁합',     sub: 'AI 매칭' },
  { id: 'sec-social', label: '05 사회적 증거', sub: '대가·유사' },
];

export function EtfSectionNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const triggered = new Set<string>();
    // 단일 옵저버, 여러 섹션
    const io = new IntersectionObserver(
      entries => {
        // 화면 상단(0~40%)에 가장 가깝게 들어온 섹션 선택
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      {
        // 상단 80px(헤더) 무시, 하단 50%까지 본격 active
        rootMargin: '-80px 0px -50% 0px',
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) {
        io.observe(el);
        triggered.add(s.id);
      }
    });
    observers.push(io);
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActive(id);
  };

  return (
    <nav className={styles.nav} aria-label="ETF 섹션 목차">
      {SECTIONS.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={e => onClick(e, s.id)}
          className={`${styles.tab} ${active === s.id ? styles.active : ''}`}
          aria-current={active === s.id ? 'true' : undefined}
        >
          <span className={styles.tabLabel}>{s.label}</span>
          <span className={styles.tabSub}>{s.sub}</span>
        </a>
      ))}
    </nav>
  );
}
