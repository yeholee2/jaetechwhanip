const AREAS = [
  '신림동',
  '여의도',
  '봉천동',
  '판교',
  '성수동',
  '을지로',
  '마포',
  '합정동',
  '역삼동',
  '서초동',
  '문래동',
  '잠실',
];

const FINANCE_TITLES = [
  '현인',
  '복리주의자',
  '배당수집가',
  'ETF탐험가',
  '절세러',
  '월급관리자',
  '적금장인',
  '분산투자러',
  '대출정리러',
  '예산설계자',
  '현금흐름러',
  '가계부고수',
];

const SPECIAL_NICKNAMES = [
  '신림동의현인',
  '소현버핏',
  '여의도복리주의자',
  '판교배당수집가',
  '봉천동절세러',
];

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function emailPrefix(email?: string | null) {
  return email?.split('@')[0]?.trim() || '';
}

export function createFinanceNickname(seed?: string | null) {
  const value = seed?.trim() || `guest-${Date.now()}`;
  const hash = hashSeed(value);

  if (hash % 5 === 0) {
    return SPECIAL_NICKNAMES[hash % SPECIAL_NICKNAMES.length];
  }

  const area = AREAS[hash % AREAS.length];
  const title = FINANCE_TITLES[Math.floor(hash / AREAS.length) % FINANCE_TITLES.length];
  return `${area}의${title}`;
}

export function getAuthNickname(user: any) {
  if (!user) return '';
  return createFinanceNickname(user.id || user.email || user.user_metadata?.sub);
}

export function isProviderDerivedName(name: string | null | undefined, user: any) {
  if (!name || !user) return true;
  const normalized = name.trim();
  const meta = user.user_metadata || {};
  const providerNames = [
    meta.full_name,
    meta.name,
    meta.nickname,
    meta.preferred_username,
    emailPrefix(meta.email),
    emailPrefix(user.email),
    user.email,
    'ME',
    '익명',
  ]
    .filter(Boolean)
    .map((item: string) => item.trim());

  return providerNames.includes(normalized);
}

export async function syncFinanceNickname(supabase: any, user: any) {
  if (!supabase || !user?.id) return '';

  const nickname = getAuthNickname(user);
  const { data } = await supabase
    .from('users')
    .select('id,name,email')
    .eq('id', user.id)
    .maybeSingle();

  if (data?.name && !isProviderDerivedName(data.name, user)) {
    return data.name;
  }

  await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email || data?.email || null,
      name: nickname,
      avatar_url:
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        user.user_metadata?.profile_image ||
        null,
    },
    { onConflict: 'id' },
  );

  return nickname;
}
