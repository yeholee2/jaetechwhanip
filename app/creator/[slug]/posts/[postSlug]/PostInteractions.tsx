'use client';

/**
 * 글 상세 페이지 — 좋아요 + 댓글 인터랙션.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './CreatorPost.module.css';

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
};

export function PostInteractions({
  postId,
  initialLikeCount,
  initialCommentCount,
  locked,
}: {
  postId: string;
  initialLikeCount: number;
  initialCommentCount: number;
  locked: boolean;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        setUserId(user.id);
        const { data: likeRow } = await supabase
          .from('creator_post_likes')
          .select('post_id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled) setLiked(!!likeRow);
      }
      // 댓글 조회
      const { data: rows } = await supabase
        .from('creator_post_comments')
        .select('id, user_id, body, created_at')
        .eq('post_id', postId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      const list = (rows || []) as Comment[];

      // 댓글 작성자 이름/아바타 조회
      const ids = Array.from(new Set(list.map(c => c.user_id)));
      if (ids.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, nickname, avatar_url')
          .in('id', ids);
        const map = new Map((users || []).map((u: any) => [u.id, u]));
        for (const c of list) {
          const u = map.get(c.user_id);
          if (u) {
            c.author_name = u.nickname;
            c.author_avatar = u.avatar_url;
          }
        }
      }
      if (!cancelled) {
        setComments(list);
        setLoadingComments(false);
      }
    })();
    return () => { cancelled = true; };
  }, [postId]);

  const toggleLike = async () => {
    if (!userId) {
      window.location.href = `/auth?next=${window.location.pathname}`;
      return;
    }
    if (pending) return;
    setPending(true);
    const supabase = createClient();
    try {
      if (liked) {
        const { error } = await supabase
          .from('creator_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
        if (error) {
          alert(error.message);
          return;
        }
        setLiked(false);
        setLikeCount(c => Math.max(0, c - 1));
      } else {
        const { error } = await supabase
          .from('creator_post_likes')
          .insert({ post_id: postId, user_id: userId });
        if (error) {
          alert(error.message);
          return;
        }
        setLiked(true);
        setLikeCount(c => c + 1);
      }
    } finally {
      setPending(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      window.location.href = `/auth?next=${window.location.pathname}`;
      return;
    }
    const body = draft.trim();
    if (!body || pending) return;
    setPending(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('creator_post_comments')
        .insert({ post_id: postId, user_id: userId, body })
        .select('id, user_id, body, created_at')
        .single();
      if (error) {
        alert(error.message);
        return;
      }
      // 자기 정보 가져와서 즉시 표시
      const { data: me } = await supabase
        .from('users')
        .select('nickname, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      setComments(c => [
        { ...(data as Comment), author_name: me?.nickname, author_avatar: me?.avatar_url },
        ...c,
      ]);
      setCommentCount(c => c + 1);
      setDraft('');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.interact}>
      <div className={styles.actionsRow}>
        <button
          type="button"
          onClick={toggleLike}
          disabled={pending}
          className={`${styles.likeBtn} ${liked ? styles.likeBtnOn : ''}`}
        >
          {liked ? '♥' : '♡'} <strong>{likeCount.toLocaleString()}</strong>
        </button>
        <span className={styles.commentMeta}>
          💬 댓글 <strong>{commentCount.toLocaleString()}</strong>
        </span>
      </div>

      {locked ? (
        <div className={styles.commentLocked}>
          <span>🔒 멤버 전용 글의 댓글은 멤버만 볼 수 있어요</span>
        </div>
      ) : (
        <>
          <form onSubmit={submitComment} className={styles.commentForm}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={userId ? '댓글을 남겨보세요' : '로그인하면 댓글을 남길 수 있어요'}
              rows={2}
              maxLength={1000}
              disabled={!userId}
            />
            <button type="submit" disabled={!draft.trim() || pending} className={styles.commentSubmit}>
              {pending ? '등록 중…' : '등록'}
            </button>
          </form>

          {loadingComments ? (
            <div className={styles.commentEmpty}>댓글을 불러오는 중…</div>
          ) : comments.length === 0 ? (
            <div className={styles.commentEmpty}>아직 댓글이 없어요. 첫 댓글을 남겨보세요.</div>
          ) : (
            <ul className={styles.commentList}>
              {comments.map(c => (
                <li key={c.id} className={styles.commentItem}>
                  <div className={styles.commentAvatar}>
                    {c.author_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.author_avatar} alt="" />
                    ) : (
                      <span>{(c.author_name || '익').slice(0, 1)}</span>
                    )}
                  </div>
                  <div className={styles.commentBody}>
                    <div className={styles.commentHead}>
                      <strong>{c.author_name || '익명'}</strong>
                      <time>{formatRelative(c.created_at)}</time>
                    </div>
                    <p>{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const dt = new Date(iso);
  return `${dt.getMonth() + 1}.${dt.getDate()}`;
}
