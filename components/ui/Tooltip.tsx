/**
 * 'i' 아이콘 + 마우스 hover 시 설명 툴팁.
 *
 * 사용:
 *   <Tooltip label="총보수 설명">
 *     운용사가 받아가는 연 수수료. 0.5% 이하면 저렴한 편이에요.
 *   </Tooltip>
 *
 * 컴포넌트 자체가 inline-flex 라서 텍스트 옆에 자연스럽게 붙음.
 */

import styles from './Tooltip.module.css';

type Props = {
  children: React.ReactNode;
  label?: string;
  /** 툴팁 안에 굵게 노출할 제목 (Toss 톤). 생략 시 본문만 표시. */
  title?: React.ReactNode;
  /** 툴팁 말풍선이 우측 정렬 시 잘리면 align="left" */
  align?: 'center' | 'left';
  /**
   * trigger 노드. 생략 시 기본 'i' 아이콘.
   * 임의 요소(태그 칩 등)를 host로 쓰려면 trigger 에 그 노드를 전달.
   */
  trigger?: React.ReactNode;
  className?: string;
};

export function Tooltip({
  children,
  label = '도움말',
  title,
  align = 'center',
  trigger,
  className,
}: Props) {
  return (
    <span className={`${styles.wrap} ${className || ''}`}>
      {trigger ? (
        <span
          className={styles.triggerInline}
          aria-label={label}
          tabIndex={0}
          role="button"
        >
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          className={styles.trigger}
          aria-label={label}
          tabIndex={0}
        >
          i
        </button>
      )}
      <span
        role="tooltip"
        className={`${styles.bubble} ${align === 'left' ? styles.bubbleLeft : ''}`}
      >
        {title && <span className={styles.bubbleTitle}>{title}</span>}
        <span className={styles.bubbleBody}>{children}</span>
      </span>
    </span>
  );
}
