'use client';

import { useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHero, Card, Button, Badge } from '@/components/ui';
import styles from './not-found.module.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App error', error);
  }, [error]);

  return (
    <AppShell active="home" hideSlogan>
      <main className={styles.page}>
        <PageHero
          eyebrow="오류"
          title="잠시 문제가 생겼어요"
          lead="페이지를 다시 불러오거나 잠시 후 다시 시도해주세요."
        />

        <Card pad="lg" className={styles.card}>
          <div className={styles.inner}>
            <Badge tone="danger">Error</Badge>
            <p>
              {error.message
                ? `상세: ${error.message}`
                : '알 수 없는 오류가 발생했어요.'}
            </p>
            <div className={styles.actions}>
              <Button onClick={reset} variant="primary" size="md">다시 시도</Button>
              <Button href="/" variant="outline" size="md">홈으로</Button>
            </div>
          </div>
        </Card>
      </main>
    </AppShell>
  );
}
