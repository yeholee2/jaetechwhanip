/**
 * 사이트 설정 서버 사이드 fetch (REST 직접 호출, 60초 캐시).
 * SSR에서 배너·키워드를 미리 가져와서 HomeClient에 전달.
 */
import type { SiteBanner } from './site-settings';

export const DEFAULT_KEYWORDS = ['반도체', '월배당', 'AI전력', '나스닥100', 'S&P500', '커버드콜', '밸류업'];
export const DEFAULT_BANNER: SiteBanner = { enabled: false, message: '', link: '' };

export async function fetchSiteSettings(): Promise<{
  keywords: string[];
  banner: SiteBanner;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { keywords: DEFAULT_KEYWORDS, banner: DEFAULT_BANNER };

  try {
    const res = await fetch(
      `${url}/rest/v1/site_settings?select=key,value`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return { keywords: DEFAULT_KEYWORDS, banner: DEFAULT_BANNER };
    const rows = (await res.json()) as { key: string; value: any }[];
    const map = new Map(rows.map(r => [r.key, r.value]));
    return {
      keywords: (map.get('home_keywords') as string[]) || DEFAULT_KEYWORDS,
      banner: (map.get('banner') as SiteBanner) || DEFAULT_BANNER,
    };
  } catch {
    return { keywords: DEFAULT_KEYWORDS, banner: DEFAULT_BANNER };
  }
}
