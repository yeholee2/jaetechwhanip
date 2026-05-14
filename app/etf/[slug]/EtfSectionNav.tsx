'use client';

/**
 * ETF 상세 — 섹션 앵커 nav (PC sticky, 토스/펀ETF 톤).
 *
 * - 클릭 시 해당 섹션으로 스무스 스크롤
 * - 스크롤 위치 기반 active 계산 (mount + IO + scroll listener 3중 보장)
 * - 모바일에선 가로 스크롤 횡 nav (CSS).
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
    // 페이지 위치 기반 active 계산 — 상단 200px 안에 가장 가까운 섹션
    const compute = () => {
      const probe = 200;
      let best: { id: string; top: number } | null = null;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= probe) {
          if (!best || top > best.top) best = { id: s.id, top };
        }
      }
      setActive(best ? best.id : SECTIONS[0].id);
    };

    // 1) 마운트 시 1회 계산
    compute();

    // 2) IntersectionObserver — 섹션이 화면 상단을 가로지를 때마다 갱신
    const io = new IntersectionObserver(
      () => compute(),
      { rootMargin: '-80px 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });

    // 3) 스크롤 이벤트 폴백 (rAF 스로틀)
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; compute(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
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
