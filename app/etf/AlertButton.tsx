'use client';

/**
 * ETF 상세 hero용 알림 추가 버튼.
 * 클릭 시 AlertModal 열림. 비로그인 시 /auth 유도.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui';
import { FaIcon } from '@/components/FaIcon';
import { AlertModal } from '@/components/AlertModal';
import styles from './AlertButton.module.css';

type Props = {
  etfCode: string;
  etfName: string;
  currentPrice?: string;
  variant?: 'default' | 'top';
};

export function AlertButton({ etfCode, etfName, currentPrice, variant = 'default' }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleOpen = async () => {
    // 로그인 체크
    if (!hasSupabase()) {
      setOpen(true);
      return;
    }
    const supabase = createClient();
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      router.push(`/auth?next=/etf/${encodeURIComponent(etfCode)}`);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {variant === 'top' ? (
        <button
          type="button"
          className={styles.topAlert}
          onClick={handleOpen}
          aria-label={`${etfName} 알림`}
        >
          <FaIcon name="bell" size={14} />
          알림
        </button>
      ) : (
        <Button variant="ghost" size="md" onClick={handleOpen}>알림</Button>
      )}
      {open && (
        <AlertModal
          etfCode={etfCode}
          etfName={etfName}
          currentPrice={currentPrice}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
