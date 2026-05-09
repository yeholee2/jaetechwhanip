export type SparringSide = 'a' | 'b';
export type SparringStatus = 'active' | 'closed';

export type SparringStats = {
  votesA: number;
  votesB: number;
  commentsA: number;
  commentsB: number;
};

export type Sparring = {
  id: string;
  round_number: number;
  category: string;
  title: string;
  body: string;
  slug: string;
  side_a_label: string;
  side_b_label: string;
  deadline_at: string;
  status: SparringStatus;
  created_at: string;
  deleted_at?: string | null;
  stats: SparringStats;
};

export type SparringComment = {
  id: string;
  sparring_id: string;
  user_id: string | null;
  side: SparringSide;
  body: string;
  created_at: string;
  deleted_at?: string | null;
  author_name?: string | null;
};

export type SparringPageData = {
  sparrings: Sparring[];
};

export type SparringDetailData = {
  sparring: Sparring | null;
  comments: SparringComment[];
  related: Sparring[];
};

const SEED_CREATED_AT = '2026-05-09T09:00:00+09:00';

export const seedSparrings: Sparring[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    round_number: 1,
    category: '해외주식·ETF',
    title: 'S&P500 ETF, 지금 들어가도 될까요?',
    body: 'VOO나 SPY를 매달 사려는데 최근 지수가 많이 오른 것 같아 시작 타이밍이 고민돼요. 지금 분할 매수를 시작하는 쪽과 현금을 더 들고 기다리는 쪽, 어느 판단이 더 나을까요?',
    slug: 'sp500-etf-entry',
    side_a_label: '분할 매수 시작',
    side_b_label: '현금 유지',
    deadline_at: '2026-05-12T23:59:59+09:00',
    status: 'active',
    created_at: SEED_CREATED_AT,
    stats: { votesA: 74, votesB: 46, commentsA: 18, commentsB: 11 },
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    round_number: 2,
    category: '절세',
    title: 'ISA와 연금저축, 뭐부터 채워야 할까요?',
    body: '월 40만원 정도 투자 여력이 있을 때 중도 활용이 쉬운 ISA부터 채울지, 세액공제가 큰 연금저축부터 채울지 의견을 나눠요.',
    slug: 'isa-vs-pension-priority',
    side_a_label: 'ISA 먼저',
    side_b_label: '연금저축 먼저',
    deadline_at: '2026-05-15T23:59:59+09:00',
    status: 'active',
    created_at: SEED_CREATED_AT,
    stats: { votesA: 52, votesB: 41, commentsA: 9, commentsB: 8 },
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    round_number: 3,
    category: '대출·부채',
    title: '학자금대출, 먼저 갚을까요?',
    body: '금리가 낮은 학자금대출이 남아 있을 때 여윳돈을 상환에 쓸지, 비상금과 투자금을 먼저 만들지 토론해요.',
    slug: 'student-loan-vs-emergency-fund',
    side_a_label: '대출 먼저 상환',
    side_b_label: '비상금 먼저 확보',
    deadline_at: '2026-05-18T23:59:59+09:00',
    status: 'active',
    created_at: SEED_CREATED_AT,
    stats: { votesA: 33, votesB: 59, commentsA: 7, commentsB: 14 },
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    round_number: 4,
    category: '해외주식·ETF',
    title: '처음 해외 ETF, S&P500이 나을까요 QQQ가 나을까요?',
    body: '미국 ETF를 처음 시작할 때 시장 전체를 따라가는 S&P500과 성장주 비중이 큰 QQQ 중 어떤 선택이 더 맞는지 비교해요.',
    slug: 'sp500-vs-qqq-first-etf',
    side_a_label: 'S&P500 먼저',
    side_b_label: 'QQQ도 함께',
    deadline_at: '2026-05-20T23:59:59+09:00',
    status: 'active',
    created_at: SEED_CREATED_AT,
    stats: { votesA: 44, votesB: 28, commentsA: 10, commentsB: 6 },
  },
];

export const seedSparringComments: SparringComment[] = [
  {
    id: 'seed-comment-a-1',
    sparring_id: seedSparrings[0].id,
    user_id: null,
    side: 'a',
    body: '장기 적립식이면 시작 시점을 너무 정확히 맞히려다 현금을 오래 들고 있게 되는 비용도 커요. 월 납입액을 작게 두고 환율까지 나눠 맞는 게 현실적이라고 봅니다.',
    created_at: '2026-05-09T10:20:00+09:00',
    author_name: '분할매수파',
  },
  {
    id: 'seed-comment-a-2',
    sparring_id: seedSparrings[0].id,
    user_id: null,
    side: 'a',
    body: '비상금이 이미 있다면 첫 달부터 전액을 넣기보다 6개월로 쪼개는 방식이 마음 관리에 좋아요.',
    created_at: '2026-05-09T11:10:00+09:00',
    author_name: '월급날ETF',
  },
  {
    id: 'seed-comment-b-1',
    sparring_id: seedSparrings[0].id,
    user_id: null,
    side: 'b',
    body: '환율이 높고 시장 기대도 많이 반영된 구간이라면 첫 진입 금액은 더 낮춰도 된다고 봐요. 매수 규칙부터 정하고 들어가는 게 우선입니다.',
    created_at: '2026-05-09T10:45:00+09:00',
    author_name: '현금비중파',
  },
  {
    id: 'seed-comment-b-2',
    sparring_id: seedSparrings[0].id,
    user_id: null,
    side: 'b',
    body: '투자 경험이 적다면 초반 하락을 버틸 수 있는지 먼저 확인해야 해요. 현금 유지가 포기가 아니라 준비일 수 있습니다.',
    created_at: '2026-05-09T12:00:00+09:00',
    author_name: '리스크체크',
  },
];

function emptyStats(): SparringStats {
  return { votesA: 0, votesB: 0, commentsA: 0, commentsB: 0 };
}

function normalizeSparring(row: any, stats?: SparringStats): Sparring {
  return {
    id: row.id,
    round_number: row.round_number,
    category: row.category,
    title: row.title,
    body: row.body,
    slug: row.slug,
    side_a_label: row.side_a_label,
    side_b_label: row.side_b_label,
    deadline_at: row.deadline_at,
    status: row.status || 'active',
    created_at: row.created_at,
    deleted_at: row.deleted_at || null,
    stats: stats || row.stats || emptyStats(),
  };
}

function mergeStats(
  sparrings: Sparring[],
  votes: Array<{ sparring_id: string; side: SparringSide }>,
  comments: Array<{ sparring_id: string; side: SparringSide }>,
) {
  const byId = new Map(sparrings.map(item => [item.id, emptyStats()]));

  votes.forEach(vote => {
    const stats = byId.get(vote.sparring_id);
    if (!stats) return;
    if (vote.side === 'a') stats.votesA += 1;
    if (vote.side === 'b') stats.votesB += 1;
  });

  comments.forEach(comment => {
    const stats = byId.get(comment.sparring_id);
    if (!stats) return;
    if (comment.side === 'a') stats.commentsA += 1;
    if (comment.side === 'b') stats.commentsB += 1;
  });

  return byId;
}

function idsParam(sparrings: Sparring[]) {
  return `(${sparrings.map(item => item.id).join(',')})`;
}

async function fetchJson(url: string, key: string) {
  const res = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSparrings(): Promise<SparringPageData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { sparrings: seedSparrings };
  }

  try {
    const rows = await fetchJson(
      `${supabaseUrl}/rest/v1/sparrings?deleted_at=is.null&select=*&order=status.asc&order=deadline_at.asc&limit=12`,
      supabaseKey,
    );

    if (!Array.isArray(rows) || rows.length === 0) return { sparrings: seedSparrings };

    const sparrings = rows.map(row => normalizeSparring(row));
    const [votes, comments] = await Promise.all([
      fetchJson(`${supabaseUrl}/rest/v1/sparring_votes?sparring_id=in.${idsParam(sparrings)}&select=sparring_id,side`, supabaseKey),
      fetchJson(`${supabaseUrl}/rest/v1/sparring_comments?deleted_at=is.null&sparring_id=in.${idsParam(sparrings)}&select=sparring_id,side`, supabaseKey),
    ]);
    const stats = mergeStats(sparrings, Array.isArray(votes) ? votes : [], Array.isArray(comments) ? comments : []);

    return {
      sparrings: sparrings.map(item => normalizeSparring(item, stats.get(item.id))),
    };
  } catch {
    return { sparrings: seedSparrings };
  }
}

export async function fetchSparringDetail(slug: string): Promise<SparringDetailData> {
  const fallback = seedSparrings.find(item => item.slug === slug) || null;
  const fallbackComments = fallback
    ? seedSparringComments.filter(comment => comment.sparring_id === fallback.id)
    : [];
  const fallbackRelated = fallback
    ? seedSparrings.filter(item => item.category === fallback.category && item.slug !== fallback.slug)
    : [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { sparring: fallback, comments: fallbackComments, related: fallbackRelated };
  }

  try {
    const rows = await fetchJson(
      `${supabaseUrl}/rest/v1/sparrings?slug=eq.${encodeURIComponent(slug)}&deleted_at=is.null&select=*&limit=1`,
      supabaseKey,
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return { sparring: fallback, comments: fallbackComments, related: fallbackRelated };

    const sparring = normalizeSparring(row);
    const [votes, comments, relatedRows] = await Promise.all([
      fetchJson(`${supabaseUrl}/rest/v1/sparring_votes?sparring_id=eq.${sparring.id}&select=sparring_id,side`, supabaseKey),
      fetchJson(`${supabaseUrl}/rest/v1/sparring_comments?deleted_at=is.null&sparring_id=eq.${sparring.id}&select=*&order=created_at.asc`, supabaseKey),
      fetchJson(`${supabaseUrl}/rest/v1/sparrings?deleted_at=is.null&category=eq.${encodeURIComponent(sparring.category)}&slug=neq.${encodeURIComponent(sparring.slug)}&select=*&order=deadline_at.asc&limit=3`, supabaseKey),
    ]);
    const stats = mergeStats([sparring], Array.isArray(votes) ? votes : [], Array.isArray(comments) ? comments : []);
    const related = Array.isArray(relatedRows) && relatedRows.length > 0
      ? relatedRows.map(row => normalizeSparring(row))
      : fallbackRelated;

    return {
      sparring: normalizeSparring(sparring, stats.get(sparring.id)),
      comments: Array.isArray(comments) && comments.length > 0 ? comments : fallbackComments,
      related,
    };
  } catch {
    return { sparring: fallback, comments: fallbackComments, related: fallbackRelated };
  }
}

export function getVotePercent(stats: SparringStats) {
  const total = stats.votesA + stats.votesB;
  if (total === 0) return { a: 50, b: 50, total };
  const a = Math.round((stats.votesA / total) * 100);
  return { a, b: 100 - a, total };
}

export function getDaysLeft(deadlineAt: string) {
  const ms = new Date(deadlineAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
