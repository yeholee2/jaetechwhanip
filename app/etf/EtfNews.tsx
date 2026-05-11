/**
 * ETFCheck식 주요 뉴스 리스트.
 * Phase B 현재: 정적 시드. Phase F에서 RSS 자동수집 검토 (저작권 안전선 준수).
 */
import Link from 'next/link';
import styles from './EtfNews.module.css';

type NewsItem = {
  title: string;
  source: string;
  timeAgo: string;
  url?: string;
};

const NEWS_SEED: NewsItem[] = [
  { title: '같은 반도체가 아냐…인텔·마이크론·AMD 추격 매수 vs 찬밥 된 엔비디아', source: '머니투데이', timeAgo: '37분 전' },
  { title: '[ETF 시황] 반도체·우주 ETF 급등…코스피 7800 돌파에 인버스 급락', source: 'NewsPim', timeAgo: '2시간 전' },
  { title: '황선오 금감원 부원장 "韓 증시 74% 급등에 단타·빚투 급증…리스크 관리 필요"', source: '조선비즈', timeAgo: '4시간 전' },
  { title: "금감원 '삼전' 2배 레버리지 ETF, 투자자 쏠림 심화할 것", source: '아시아경제', timeAgo: '4시간 전' },
  { title: "JP모간 '코스피 1만도 가능'…한 달 만에 목표치 재상향", source: 'NewsPim', timeAgo: '6시간 전' },
];

export function EtfNews() {
  return (
    <section className={styles.section} aria-label="주요 뉴스">
      <div className={styles.head}>
        <h3 className={styles.title}>주요 뉴스</h3>
        <Link href="#" className={styles.more}>
          더보기 →
        </Link>
      </div>

      <ul className={styles.list}>
        {NEWS_SEED.map((item, i) => (
          <li key={i} className={styles.item}>
            <p className={styles.itemTitle}>{item.title}</p>
            <span className={styles.itemMeta}>
              {item.source} · {item.timeAgo}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
