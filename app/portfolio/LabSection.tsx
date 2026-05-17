/**
 * 실험실 — 베타 placeholder.
 *
 * 아직 정식 기능 전. 어떤 실험을 준비 중인지 미리 보여주고,
 * 가능한 건 부분 기능으로 연결 (백테스트는 이미 동작).
 */

import Link from 'next/link';
import { Badge } from '@/components/ui';
import styles from './LabSection.module.css';

type LabCard = {
  emoji: string;
  title: string;
  body: string;
  status: 'live' | 'soon' | 'idea';
  href?: string;
  cta?: string;
};

const LAB_CARDS: LabCard[] = [
  {
    emoji: '📊',
    title: '포트폴리오 백테스트',
    body: '내 비중으로 과거 10년을 돌리면 어땠을지. 대가 모델과 나란히 비교하는 차트도 함께.',
    status: 'live',
    href: '/portfolio/templates',
    cta: '대가 포트폴리오에서 시도해보기',
  },
  {
    emoji: '🔀',
    title: '비중 시나리오 (드래그)',
    body: '비중을 끌어서 바꾸면 즉시 위험·환노출·예상 수익률이 다시 계산돼요.',
    status: 'soon',
  },
  {
    emoji: '🎲',
    title: 'Monte Carlo 시뮬',
    body: '1만 번 돌려본 10년 후 수익 분포. 평균 말고 “최악 5%”도 같이 보여드릴게요.',
    status: 'soon',
  },
  {
    emoji: '🤖',
    title: 'AI 리밸런싱 코치',
    body: '한입 AI가 내 포트폴리오 사진 보고 — “이 비중은 너무 한쪽에 치우쳤어요” 한 줄 진단.',
    status: 'idea',
  },
];

const STATUS_META: Record<LabCard['status'], { label: string; tone: 'primary' | 'neutral' | 'fresh' }> = {
  live: { label: '베타 사용 가능', tone: 'primary' },
  soon: { label: '곧 공개',       tone: 'fresh' },
  idea: { label: '아이디어',      tone: 'neutral' },
};

export function LabSection() {
  return (
    <div className={styles.lab}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>
          <span className={`${styles.sparkle} tf`} aria-hidden="true">✨</span>
          실험실 (β)
        </span>
        <h2 className={styles.title}>내 포트폴리오로 더 깊게 놀아보기</h2>
        <p className={styles.lead}>
          아직 완성된 기능은 아니에요. 어떤 도구가 가장 도움이 될지 함께 만들어가는 공간이에요.
        </p>
      </header>

      <div className={styles.cards}>
        {LAB_CARDS.map(card => {
          const meta = STATUS_META[card.status];
          const isLive = card.status === 'live';
          const Inner = (
            <>
              <div className={styles.cardHead}>
                <span className={`${styles.cardEmoji} tf`} aria-hidden="true">{card.emoji}</span>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <strong className={styles.cardTitle}>{card.title}</strong>
              <p className={styles.cardBody}>{card.body}</p>
              {isLive && card.cta && (
                <span className={styles.cardCta}>{card.cta} →</span>
              )}
            </>
          );
          return isLive && card.href ? (
            <Link key={card.title} href={card.href} className={`${styles.card} ${styles.cardLive}`}>
              {Inner}
            </Link>
          ) : (
            <div key={card.title} className={styles.card}>
              {Inner}
            </div>
          );
        })}
      </div>

      <div className={styles.feedback}>
        <p>
          <strong>어떤 실험이 가장 궁금하세요?</strong>
          <br />
          “시나리오 드래그가 제일 필요해요”, “세금 시뮬도 넣어주세요” —
          {' '}<Link href="/questions/create">한입에 알려주시면</Link> 우선순위에 반영합니다.
        </p>
      </div>
    </div>
  );
}
