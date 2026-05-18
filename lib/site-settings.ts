/**
 * 사이트 설정 read/write 헬퍼.
 *
 * key-value JSONB 테이블 (site_settings). 누구나 read, admin만 write.
 */
import { createClient } from '@/lib/supabase/client';

export type SiteBanner = { enabled: boolean; message: string; link: string };
export type HomeRollingBanner = {
  id: string;
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  link: string;
  imageUrl: string;
  dimImage?: boolean;
};

export const DEFAULT_KEYWORDS = ['반도체','월배당','AI전력','나스닥100','S&P500','커버드콜','밸류업'];
export const DEFAULT_BANNER: SiteBanner = { enabled: false, message: '', link: '' };
export const DEFAULT_HOME_ROLLING_BANNERS: HomeRollingBanner[] = [
  {
    id: 'jaefcon-launch',
    enabled: true,
    eyebrow: '재프콘',
    title: '재테크 크리에이터를 팔로우하고 깊은 리포트는 멤버십으로',
    description: 'ETF, 절세, 연금, 시장 인사이트 채널을 발견하고 내 뉴스피드에서 새 글을 모아보세요.',
    ctaLabel: '재프콘 탐색',
    link: '/creators',
    imageUrl: '',
    dimImage: true,
  },
  {
    id: 'creator-open',
    enabled: true,
    eyebrow: '크리에이터 모집',
    title: '내 투자 관점을 담은 채널을 바로 런칭하세요',
    description: '닉네임과 한 줄 소개만으로 공개 페이지가 만들어지고, 글·시리즈·멤버십으로 확장할 수 있어요.',
    ctaLabel: '내 채널 생성',
    link: '/creator/apply',
    imageUrl: '',
    dimImage: true,
  },
];

export async function getSetting<T = any>(key: string, fallback: T): Promise<T> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error || !data) return fallback;
    return (data.value as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: any): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return !error;
  } catch {
    return false;
  }
}
