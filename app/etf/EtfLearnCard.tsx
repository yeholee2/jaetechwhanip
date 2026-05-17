import Link from 'next/link';
import { Card, Badge, Button } from '@/components/ui';
import styles from './EtfLearnCard.module.css';

/**
 * ETF 입문 카드 — 발견 탭 하단에 노출.
 * 첫 사용자에게 "ETF가 뭐죠? 어디서 사죠?" 질문을 미리 답해줌.
 */
export function EtfLearnCard() {
  return (
    <Card pad="lg" className={styles.card}>
      <div className={styles.header}>
        <Badge tone="purple">ETF 입문</Badge>
        <h2>ETF가 처음이세요?</h2>
        <p>주식·채권·금처럼 시장 자산을 한 번에 담는 펀드예요. 코드로 사고팔 수 있어 주식 거래소에서 바로 매수할 수 있습니다.</p>
      </div>

      <ul className={styles.faq}>
        <li>
          <strong>ETF는 어디서 사나요?</strong>
          <span>증권 앱(키움·토스·미래에셋·삼성 등)에서 종목 코드를 검색해 매수해요.</span>
        </li>
        <li>
          <strong>어떤 ETF로 시작할까요?</strong>
          <span>분산 잘 된 시장지수 ETF부터. S&P500·코스피200·MSCI 전세계 같은 광역 지수가 입문에 좋아요.</span>
        </li>
        <li>
          <strong>총보수와 분배금은 뭐가 중요하나요?</strong>
          <span>장기 보유는 총보수(연 0.05~0.5%)가 작을수록 유리해요. 분배금은 분기/월 등 ETF별 차이가 있어요.</span>
        </li>
      </ul>

      <div className={styles.actions}>
        <Button href="/etf/all" variant="primary" size="md">전체 ETF 둘러보기</Button>
        <Link href="/questions/create" className={styles.helpLink}>아직 모르겠다면 질문해보세요 →</Link>
      </div>
    </Card>
  );
}
