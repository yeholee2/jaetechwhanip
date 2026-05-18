import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_HOME_ROLLING_BANNERS } from '@/lib/site-settings';
import AdminSettingsClient from './AdminSettingsClient';

export const dynamic = 'force-dynamic';

async function loadAllSettings() {
  const admin = createAdminClient();
  if (!admin) {
    return {
      keywords: [],
      banner: { enabled: false, message: '', link: '' },
      rollingBanners: DEFAULT_HOME_ROLLING_BANNERS,
      spamWords: [],
    };
  }
  const { data } = await admin.from('site_settings').select('key, value');
  const map = new Map((data || []).map(r => [r.key, r.value]));
  return {
    keywords: (map.get('home_keywords') as string[]) || ['반도체','월배당','AI전력','나스닥100','S&P500','커버드콜','밸류업'],
    banner: (map.get('banner') as any) || { enabled: false, message: '', link: '' },
    rollingBanners: (map.get('home_rolling_banners') as any) || DEFAULT_HOME_ROLLING_BANNERS,
    spamWords: (map.get('spam_words') as string[]) || [],
  };
}

export default async function AdminSettingsPage() {
  const initial = await loadAllSettings();
  return <AdminSettingsClient initial={initial} />;
}
