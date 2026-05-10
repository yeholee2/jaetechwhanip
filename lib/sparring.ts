import { normalizeCategory } from '@/lib/categories';

export type SparringSide = 'a' | 'b';
export type SparringPolarity = 'positive' | 'negative';
export type SparringStatus = 'active' | 'closed' | 'archived';

export type SparringStats = {
  votes_a: number;
  votes_b: number;
  votes_total: number;
  comment_count: number;
};

export type Sparring = {
  id: string;
  round_number: number;
  category: string;
  title: string;
  body: string | null;
  slug: string;
  side_a_label: string;
  side_b_label: string;
  side_a_polarity: SparringPolarity;
  side_b_polarity: SparringPolarity;
  thumbnail_url: string | null;
  deadline_at: string;
  status: SparringStatus;
  created_at: string;
  closed_at?: string | null;
  deleted_at?: string | null;
  stats: SparringStats;
};

export type SparringComment = {
  id: string;
  sparring_id: string;
  user_id: string;
  side: SparringSide;
  body: string;
  parent_id?: string | null;
  like_count: number;
  dislike_count: number;
  created_at: string;
  deleted_at?: string | null;
};

export type SparringListResult = {
  sparrings: Sparring[];
  usingFallback: boolean;
};

export type SparringDetailResult = {
  sparring: Sparring | null;
  comments: SparringComment[];
  otherActive: Sparring[];
  usingFallback: boolean;
};

export function decodeSparringSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function sparringPath(slug: string) {
  return `/sparring/${encodeURIComponent(decodeSparringSlug(slug))}`;
}

const now = Date.now();

const fallbackSparrings: Sparring[] = [
  {
    id: 'demo-active-kospi',
    round_number: 215,
    category: '국내주식·ETF',
    title: '코스피가 신고가 근처일 때도 적립식 매수를 시작해도 될까요?',
    body: '목돈 투입보다 매달 나눠 사는 전략이 실제로 심리와 수익률에 어떤 차이를 만드는지 토론해요.',
    slug: 'kospi-high-installment-buying',
    side_a_label: '분할 매수 시작',
    side_b_label: '현금 유지',
    side_a_polarity: 'positive',
    side_b_polarity: 'negative',
    thumbnail_url: null,
    deadline_at: new Date(now + 3 * 24 * 60 * 60 * 1000 + 82 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 1284, votes_b: 901, votes_total: 2185, comment_count: 36 },
  },
  {
    id: 'demo-active-loan',
    round_number: 216,
    category: '대출·부채',
    title: '신용대출 금리가 내려갈 때까지 상환을 늦춰도 될까요?',
    body: '금리 인하 기대가 있을 때도 여유 현금과 이자 부담을 어떻게 비교해야 하는지 의견을 모읍니다.',
    slug: 'delay-loan-repayment',
    side_a_label: '상환 먼저',
    side_b_label: '현금 확보',
    side_a_polarity: 'positive',
    side_b_polarity: 'negative',
    thumbnail_url: null,
    deadline_at: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    created_at: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 744, votes_b: 629, votes_total: 1373, comment_count: 19 },
  },
  {
    id: 'demo-past-isa',
    round_number: 214,
    category: '절세',
    title: 'ISA와 연금저축 중 올해 먼저 채울 계좌는 무엇일까요?',
    body: '중도 인출 가능성과 세액공제 효과 중 어느 쪽을 먼저 봐야 할지 의견을 모았습니다.',
    slug: 'isa-vs-pension-first',
    side_a_label: 'ISA 먼저',
    side_b_label: '연금저축 먼저',
    side_a_polarity: 'positive',
    side_b_polarity: 'positive',
    thumbnail_url: null,
    deadline_at: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'closed',
    created_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 1833, votes_b: 1472, votes_total: 3305, comment_count: 87 },
  },
  {
    id: 'demo-past-insurance',
    round_number: 213,
    category: '보험',
    title: '건강한 20대도 실손보험을 유지하는 게 맞을까요?',
    body: '고정비 절감과 미래 가입 조건 사이에서 어떤 선택이 합리적인지 검토했습니다.',
    slug: 'insurance-20s-keep-or-cut',
    side_a_label: '기본 보장 유지',
    side_b_label: '보험료 최소화',
    side_a_polarity: 'positive',
    side_b_polarity: 'negative',
    thumbnail_url: null,
    deadline_at: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'closed',
    created_at: new Date(now - 22 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 1204, votes_b: 802, votes_total: 2006, comment_count: 48 },
  },
  {
    id: 'demo-past-snp500',
    round_number: 212,
    category: '해외주식·ETF',
    title: 'S&P500 ETF, 신고가여도 첫 매수를 시작해도 될까요?',
    body: '고점 공포와 장기 적립식 투자 사이에서 어떤 기준으로 첫 매수 시점을 잡아야 할지 토론했습니다.',
    slug: 'sp500-etf-first-buy-at-high',
    side_a_label: '분할 매수 시작',
    side_b_label: '조정 기다리기',
    side_a_polarity: 'positive',
    side_b_polarity: 'negative',
    thumbnail_url: null,
    deadline_at: new Date(now - 18 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'closed',
    created_at: new Date(now - 28 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 2341, votes_b: 1310, votes_total: 3651, comment_count: 128 },
  },
  {
    id: 'demo-past-cash',
    round_number: 211,
    category: '재테크입문',
    title: '월급 300만원이면 비상금부터 1,000만원까지 모아야 할까요?',
    body: '투자를 빨리 시작하는 것과 비상금 체력을 먼저 만드는 것 중 어떤 선택이 더 안정적인지 의견을 모았습니다.',
    slug: 'salary-300-emergency-fund-first',
    side_a_label: '비상금 먼저',
    side_b_label: '투자 병행',
    side_a_polarity: 'positive',
    side_b_polarity: 'positive',
    thumbnail_url: null,
    deadline_at: new Date(now - 24 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'closed',
    created_at: new Date(now - 34 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 3615, votes_b: 327, votes_total: 3942, comment_count: 92 },
  },
  {
    id: 'demo-past-loan-invest',
    round_number: 210,
    category: '대출·부채',
    title: '연 5% 신용대출이 남아도 ETF 투자를 계속해도 될까요?',
    body: '대출 이자 확정 손실과 투자 기대수익을 비교할 때 어느 쪽을 우선해야 하는지 토론했습니다.',
    slug: 'loan-5-percent-or-etf-investing',
    side_a_label: '대출 상환 우선',
    side_b_label: '투자 계속',
    side_a_polarity: 'negative',
    side_b_polarity: 'positive',
    thumbnail_url: null,
    deadline_at: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'closed',
    created_at: new Date(now - 41 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 2862, votes_b: 740, votes_total: 3602, comment_count: 156 },
  },
  {
    id: 'demo-past-monthly-dividend',
    round_number: 209,
    category: '국내주식·ETF',
    title: '월배당 ETF, 현금흐름용으로 모아도 괜찮을까요?',
    body: '분배금의 안정감과 총수익률 손해 가능성을 같이 놓고 의견을 나눴습니다.',
    slug: 'monthly-dividend-etf-cashflow',
    side_a_label: '현금흐름용 적합',
    side_b_label: '총수익률 먼저',
    side_a_polarity: 'positive',
    side_b_polarity: 'positive',
    thumbnail_url: null,
    deadline_at: new Date(now - 39 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'closed',
    created_at: new Date(now - 49 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 1544, votes_b: 1197, votes_total: 2741, comment_count: 74 },
  },
  {
    id: 'demo-past-subscription',
    round_number: 208,
    category: '재테크입문',
    title: '주택청약통장, 당장 집 살 계획이 없어도 유지해야 할까요?',
    body: '낮은 금리의 청약통장을 계속 들고 갈지, 비상금과 투자금으로 돌릴지 토론했습니다.',
    slug: 'housing-subscription-account-keep',
    side_a_label: '유지한다',
    side_b_label: '해지한다',
    side_a_polarity: 'positive',
    side_b_polarity: 'negative',
    thumbnail_url: null,
    deadline_at: new Date(now - 46 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'closed',
    created_at: new Date(now - 56 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 1981, votes_b: 519, votes_total: 2500, comment_count: 63 },
  },
  {
    id: 'demo-past-tax-refund',
    round_number: 207,
    category: '절세',
    title: '연말정산 환급금, 바로 투자보다 소비 통제에 먼저 써야 할까요?',
    body: '일회성 돈이 들어왔을 때 투자, 부채 상환, 소비 예산 중 어떤 순서가 나은지 의견을 모았습니다.',
    slug: 'tax-refund-invest-or-budget',
    side_a_label: '소비 예산 정리',
    side_b_label: '바로 투자',
    side_a_polarity: 'positive',
    side_b_polarity: 'positive',
    thumbnail_url: null,
    deadline_at: new Date(now - 54 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'closed',
    created_at: new Date(now - 64 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { votes_a: 1498, votes_b: 803, votes_total: 2301, comment_count: 51 },
  },
];

const fallbackComments: SparringComment[] = [
  {
    id: 'demo-comment-1',
    sparring_id: 'demo-active-kospi',
    user_id: 'demo-user-blue',
    side: 'a',
    body: '한 번에 들어가는 건 부담이지만, 월급날마다 같은 금액으로 나누면 고점 공포를 줄일 수 있었어요. 비상금만 따로 있으면 시작 자체는 미루지 않는 쪽입니다.',
    like_count: 18,
    dislike_count: 2,
    created_at: new Date(now - 36 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-comment-2',
    sparring_id: 'demo-active-kospi',
    user_id: 'demo-user-red',
    side: 'b',
    body: '환율까지 높은 구간이면 첫 경험이 손실로 시작될 수 있어요. 투자 습관이 아직 없으면 2-3개월은 현금 흐름부터 보는 게 낫다고 봅니다.',
    like_count: 11,
    dislike_count: 1,
    created_at: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-comment-3',
    sparring_id: 'demo-active-kospi',
    user_id: 'demo-user-gray',
    side: 'a',
    body: '핵심은 시작 여부보다 납입 규칙인 것 같아요. 6개월 자동이체를 걸어두고 중간에 평가하지 않는 조건이면 찬성입니다.',
    like_count: 7,
    dislike_count: 0,
    created_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
  },
];

function hasServerSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function apiHeaders() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

async function supabaseGet<T>(path: string): Promise<T | null> {
  if (!hasServerSupabase()) return null;
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;
  const response = await fetch(url, {
    headers: apiHeaders(),
    next: { revalidate: 30 },
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

function normalizeSparring(row: Omit<Sparring, 'stats'> & { stats?: SparringStats }, stats?: SparringStats): Sparring {
  return {
    ...row,
    category: normalizeCategory(row.category),
    body: row.body ?? null,
    side_a_polarity: row.side_a_polarity || 'positive',
    side_b_polarity: row.side_b_polarity || 'negative',
    thumbnail_url: row.thumbnail_url ?? null,
    status: row.status || 'active',
    stats: stats || row.stats || { votes_a: 0, votes_b: 0, votes_total: 0, comment_count: 0 },
  };
}

function withComputedStatus(item: Sparring): Sparring {
  if (item.status === 'active' && new Date(item.deadline_at).getTime() <= Date.now()) {
    return { ...item, status: 'closed' };
  }
  return item;
}

function withSamplePastSparrings(rows: Sparring[]): Sparring[] {
  const existingSlugs = new Set(rows.map(item => item.slug));
  const closedCount = rows.filter(item => withComputedStatus(item).status !== 'active').length;
  const needed = Math.max(0, 8 - closedCount);
  if (needed === 0) return rows;

  const samples = fallbackSparrings
    .map(withComputedStatus)
    .filter(item => item.status !== 'active' && !existingSlugs.has(item.slug))
    .slice(0, needed);

  return [...rows, ...samples];
}

async function fetchAllSparrings(): Promise<Sparring[] | null> {
  const [rows, statsRows] = await Promise.all([
    supabaseGet<Array<Omit<Sparring, 'stats'>>>('sparrings?select=*&deleted_at=is.null&order=status.asc,deadline_at.desc'),
    supabaseGet<Array<SparringStats & { id?: string; sparring_id?: string }>>('sparring_stats?select=*'),
  ]);

  if (!rows) return null;
  const statsMap = new Map(
    (statsRows || []).map(row => [row.sparring_id || row.id || '', {
      votes_a: Number(row.votes_a || 0),
      votes_b: Number(row.votes_b || 0),
      votes_total: Number(row.votes_total || 0),
      comment_count: Number(row.comment_count || 0),
    }]),
  );

  return withSamplePastSparrings(rows.map(row => withComputedStatus(normalizeSparring(row, statsMap.get(row.id)))));
}

export async function listSparrings(): Promise<SparringListResult> {
  const rows = await fetchAllSparrings();
  if (!rows) {
    return { sparrings: fallbackSparrings.map(withComputedStatus), usingFallback: true };
  }
  return { sparrings: rows, usingFallback: false };
}

export function getFeaturedActiveSparring(sparrings: Sparring[]) {
  return sparrings.find(item => item.status === 'active') || null;
}

export async function getSparringBySlug(slug: string): Promise<SparringDetailResult> {
  const list = await fetchAllSparrings();
  const sparrings = list || fallbackSparrings.map(withComputedStatus);
  const decodedSlug = decodeSparringSlug(slug);
  const sparring = sparrings.find(item => (
    item.slug === slug ||
    item.slug === decodedSlug ||
    encodeURIComponent(item.slug) === slug
  )) || null;

  if (!sparring) {
    return { sparring: null, comments: [], otherActive: sparrings.filter(item => item.status === 'active'), usingFallback: !list };
  }

  const comments = list
    ? await supabaseGet<SparringComment[]>(
        `sparring_comments?select=*&sparring_id=eq.${sparring.id}&deleted_at=is.null&order=created_at.desc`,
      )
    : fallbackComments.filter(comment => comment.sparring_id === sparring.id);

  return {
    sparring,
    comments: comments || [],
    otherActive: sparrings.filter(item => item.status === 'active' && item.id !== sparring.id).slice(0, 3),
    usingFallback: !list,
  };
}

export async function listComments(sparringId: string): Promise<SparringComment[]> {
  return await supabaseGet<SparringComment[]>(
    `sparring_comments?select=*&sparring_id=eq.${sparringId}&deleted_at=is.null&order=created_at.desc`,
  ) || fallbackComments.filter(comment => comment.sparring_id === sparringId);
}

export async function vote(sparringId: string, side: SparringSide) {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('로그인이 필요합니다.');
  }

  const { error } = await supabase
    .from('sparring_votes')
    .upsert(
      { sparring_id: sparringId, user_id: user.id, side, voted_at: new Date().toISOString() },
      { onConflict: 'sparring_id,user_id' },
    );

  if (error) throw error;
  return { userId: user.id, side };
}

export async function getCurrentUserVote(sparringId: string) {
  const { createClient, hasSupabase } = await import('@/lib/supabase/client');
  if (!hasSupabase()) return null;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('sparring_votes')
    .select('side')
    .eq('sparring_id', sparringId)
    .eq('user_id', user.id)
    .maybeSingle();

  return data?.side as SparringSide | null;
}

export async function createComment(sparringId: string, side: SparringSide, body: string) {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('로그인이 필요합니다.');
  }

  const { data, error } = await supabase
    .from('sparring_comments')
    .insert({ sparring_id: sparringId, user_id: user.id, side, body })
    .select('*')
    .single();

  if (error) throw error;
  return data as SparringComment;
}

export function inferPolarity(label: string): SparringPolarity {
  return /(않다|없다|아니다|위반|반대|부적절|유지|최소화|보류|중단)/.test(label)
    ? 'negative'
    : 'positive';
}

export function getSideLabel(sparring: Sparring, side: SparringSide) {
  return side === 'a' ? sparring.side_a_label : sparring.side_b_label;
}

export function getSidePolarity(sparring: Sparring, side: SparringSide): SparringPolarity {
  return side === 'a' ? sparring.side_a_polarity : sparring.side_b_polarity;
}

export function slugifySparringTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
