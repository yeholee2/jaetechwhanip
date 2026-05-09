'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { isBookmarked, toggleBookmark, type BookmarkTargetType } from '@/lib/bookmarks';
import styles from './BookmarkButton.module.css';

export default function BookmarkButton({
  targetType,
  targetId,
  title,
  href,
  category,
}: {
  targetType: BookmarkTargetType;
  targetId: string;
  title: string;
  href: string;
  category?: string | null;
}) {
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    isBookmarked(targetType, targetId).then(setActive);
  }, [targetType, targetId]);

  return (
    <button
      type="button"
      className={`${styles.button} ${active ? styles.active : ''}`}
      aria-label={active ? '저장 취소' : '저장'}
      disabled={pending}
      onClick={async event => {
        event.preventDefault();
        event.stopPropagation();
        setPending(true);
        try {
          const next = await toggleBookmark({ target_type: targetType, target_id: targetId, title, href, category });
          setActive(next);
        } finally {
          setPending(false);
        }
      }}
    >
      <Bookmark size={17} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}
