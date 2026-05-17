/**
 * 크리에이터 활동 지표 — 클라이언트/서버 양쪽에서 안전하게 import 가능한 순수 모듈.
 * server-only fetch 는 lib/creatorStats.ts 에 있음.
 */

export type CreatorStats = {
  posts30d: number;
  posts7d: number;
  members30d: number;
  followers30d: number;
  lastPostAt: string | null;
  totalLikes: number;
};

export function activityBadge(stats: CreatorStats): { label: string; tone: 'hot' | 'active' | 'steady' | 'quiet' } | null {
  if (stats.posts7d >= 3) return { label: '🔥 활발', tone: 'hot' };
  if (stats.posts30d >= 8) return { label: '✓ 꾸준히', tone: 'active' };
  if (stats.posts30d >= 3) return { label: '월간 발행', tone: 'steady' };
  return null;
}

export function summarize(stats: CreatorStats): string[] {
  const lines: string[] = [];
  if (stats.posts30d > 0) lines.push(`최근 30일 ${stats.posts30d}건 발행`);
  if (stats.members30d > 0) lines.push(`최근 30일 ${stats.members30d}명 신규 멤버`);
  if (stats.totalLikes >= 10) lines.push(`누적 ${stats.totalLikes.toLocaleString()} 좋아요`);
  return lines;
}
