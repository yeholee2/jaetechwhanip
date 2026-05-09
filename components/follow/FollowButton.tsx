'use client';

import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { isFollowing, toggleFollow, type FollowTargetType } from '@/lib/follows';
import styles from './FollowButton.module.css';

export default function FollowButton({
  targetType,
  targetId,
  title,
}: {
  targetType: FollowTargetType;
  targetId: string;
  title: string;
}) {
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    isFollowing(targetType, targetId).then(setActive);
  }, [targetType, targetId]);

  return (
    <button
      type="button"
      className={`${styles.button} ${active ? styles.following : ''}`}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const next = await toggleFollow(targetType, targetId, title);
          setActive(next);
        } finally {
          setPending(false);
        }
      }}
    >
      {active ? <Check size={16} /> : <Plus size={16} />}
      {active ? '팔로우 중' : '팔로우+'}
    </button>
  );
}
