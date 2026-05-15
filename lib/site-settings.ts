/**
 * 사이트 설정 read/write 헬퍼.
 *
 * key-value JSONB 테이블 (site_settings). 누구나 read, admin만 write.
 */
import { createClient } from '@/lib/supabase/client';

export type SiteBanner = { enabled: boolean; message: string; link: string };

export const DEFAULT_KEYWORDS = ['반도체','월배당','AI전력','나스닥100','S&P500','커버드콜','밸류업'];
export const DEFAULT_BANNER: SiteBanner = { enabled: false, message: '', link: '' };

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
