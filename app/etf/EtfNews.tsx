/**
 * ETF·시장 주요 뉴스 리스트.
 * 현재는 큐레이션 뉴스 링크 + 피드 뉴스탭 유도.
 * RSS 자동수집 구현 시 서버에서 articles를 받아 대체 예정.
 */
import Link from 'next/link';
import sec from './sectionStyles.module.css';
import styles from './EtfNews.module.css';

type NewsItem = {
  title: string;
  source: string;
  url: string;
};

/** 수동 큐레이션 뉴스. RSS 연동 전까지 주기적으로 업데이트. */
const NEWS_SEED: NewsItem[] = [
  { title: '같은 반도체가 아냐…인텔·마이크론·AMD 추격 매수 vs 찬밥 된 엔비디아', source: '머니투데이', url: '/feed?tab=news' },
  { title: '[ETF 시황] 반도체·우주 ETF 급등…코스피 7800 돌파에 인버스 급락', source: 'NewsPim', url: '/feed?tab=news' },
  { title: '황선오 금감원 부원장 "韓 증시 74% 급등에 단타·빚투 급증…리스크 관리 필요"', source: '조선비즈', url: '/feed?tab=news' },
  { title: "금감원 '삼전' 2배 레버리지 ETF, 투자자 쏠림 심화할 것", source: '아시아경제', url: '/feed?tab=news' },
  { title: "JP모간 '코스피 1만도 가능'…한 달 만에 목표치 재상향", source: 'NewsPim', url: '/feed?tab=news' },
];

export function EtfNews() {
  return (
    <section className={sec.card} aria-label="주요 뉴스">
      <div className={sec.head}>
        <h3 className={sec.title}>주요 뉴스</h3>
        <Link href="/feed?tab=news" className={sec.metaLink}>더보기 →</Link>
      </div>

      <ul className={styles.list}>
        {NEWS_SEED.map((item, i) => (
          <li key={i} className={styles.item}>
            <Link href={item.url} className={styles.itemLink}>
              <p className={styles.itemTitle}>{item.title}</p>
              <span className={styles.itemMeta}>{item.source}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
