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
  /** 툴팁 말풍선이 우측 정렬 시 잘리면 align="left" */
  align?: 'center' | 'left';
  className?: string;
};

export function Tooltip({ children, label = '도움말', align = 'center', className }: Props) {
  return (
    <span className={`${styles.wrap} ${className || ''}`}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        tabIndex={0}
      >
        i
      </button>
      <span
        role="tooltip"
        className={`${styles.bubble} ${align === 'left' ? styles.bubbleLeft : ''}`}
      >
        {children}
      </span>
    </span>
  );
}
