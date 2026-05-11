import { AppShell } from '@/components/AppShell';
import { PageHero, Card, Button, Badge } from '@/components/ui';
import styles from './not-found.module.css';

export const metadata = {
  title: '페이지를 찾을 수 없어요',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <AppShell active="home" hideSlogan>
      <main className={styles.page}>
        <PageHero
          eyebrow="404"
          title="요청하신 페이지를 찾을 수 없어요"
          lead="주소가 잘못됐거나, 페이지가 옮겨졌을 수 있어요. 메뉴에서 다시 시작해보세요."
        />

        <Card pad="lg" className={styles.card}>
          <div className={styles.inner}>
            <Badge tone="neutral">길을 잃었어요?</Badge>
            <p>아래 메뉴에서 원하는 페이지로 이동할 수 있어요.</p>
            <div className={styles.actions}>
              <Button href="/" variant="primary" size="md">홈으로</Button>
              <Button href="/etf" variant="outline" size="md">ETF</Button>
              <Button href="/feed" variant="outline" size="md">피드</Button>
              <Button href="/sparring" variant="outline" size="md">스파링</Button>
            </div>
          </div>
        </Card>
      </main>
    </AppShell>
  );
}
