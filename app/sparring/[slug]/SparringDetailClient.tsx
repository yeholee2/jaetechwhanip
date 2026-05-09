'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, MessageCircle, ThumbsDown, ThumbsUp, Timer } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { SparringCard } from '@/components/SparringCard';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import {
  getDaysLeft,
  getVotePercent,
  type Sparring,
  type SparringComment,
  type SparringSide,
  type SparringStats,
} from '@/lib/sparrings';
import styles from './SparringDetail.module.css';

function sideLabel(sparring: Sparring, side: SparringSide) {
  return side === 'a' ? sparring.side_a_label : sparring.side_b_label;
}

function optimisticStats(stats: SparringStats, nextSide: SparringSide, prevSide: SparringSide | null) {
  const next = { ...stats };
  if (prevSide === 'a') next.votesA = Math.max(0, next.votesA - 1);
  if (prevSide === 'b') next.votesB = Math.max(0, next.votesB - 1);
  if (nextSide === 'a') next.votesA += 1;
  if (nextSide === 'b') next.votesB += 1;
  return next;
}

export default function SparringDetailClient({
  sparring,
  initialComments,
  related,
}: {
  sparring: Sparring;
  initialComments: SparringComment[];
  related: Sparring[];
}) {
  const [selectedSide, setSelectedSide] = useState<SparringSide | null>(null);
  const [stats, setStats] = useState<SparringStats>(sparring.stats);
  const [comments, setComments] = useState(initialComments);
  const [commentSide, setCommentSide] = useState<SparringSide>('a');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const percent = getVotePercent(stats);
  const daysLeft = getDaysLeft(sparring.deadline_at);

  const sideAComments = useMemo(() => comments.filter(comment => comment.side === 'a'), [comments]);
  const sideBComments = useMemo(() => comments.filter(comment => comment.side === 'b'), [comments]);

  async function vote(side: SparringSide) {
    const previous = selectedSide;
    setSelectedSide(side);
    setStats(prev => optimisticStats(prev, side, previous));
    setNotice(`${sideLabel(sparring, side)} 쪽으로 투표했어요.`);

    if (!hasSupabase()) return;

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      await supabase
        .from('sparring_votes')
        .upsert({
          sparring_id: sparring.id,
          user_id: user.id,
          side,
          voted_at: new Date().toISOString(),
        }, { onConflict: 'sparring_id,user_id' });
    } catch {
      setNotice('화면에는 반영했어요. 저장은 Supabase 설정 후 다시 확인해 주세요.');
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setIsSaving(true);
    const draft: SparringComment = {
      id: `local-${Date.now()}`,
      sparring_id: sparring.id,
      user_id: null,
      side: commentSide,
      body: trimmed,
      created_at: new Date().toISOString(),
      author_name: '나',
    };

    setComments(prev => [...prev, draft]);
    setStats(prev => ({
      ...prev,
      commentsA: prev.commentsA + (commentSide === 'a' ? 1 : 0),
      commentsB: prev.commentsB + (commentSide === 'b' ? 1 : 0),
    }));
    setBody('');

    if (!hasSupabase()) {
      setIsSaving(false);
      setNotice('의견을 화면에 추가했어요.');
      return;
    }

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setNotice('의견을 화면에 추가했어요. 로그인하면 서버에 저장됩니다.');
        return;
      }

      const { data, error } = await supabase
        .from('sparring_comments')
        .insert({
          sparring_id: sparring.id,
          user_id: user.id,
          side: commentSide,
          body: trimmed,
        })
        .select('*')
        .single();

      if (!error && data) {
        setComments(prev => prev.map(comment => comment.id === draft.id ? data : comment));
        setNotice('의견을 저장했어요.');
      }
    } catch {
      setNotice('화면에는 반영했어요. 저장은 Supabase 설정 후 다시 확인해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell active="sparring">
      <main className={styles.page}>
        <Link href="/sparring" className={styles.back}><ArrowLeft size={16} /> 스파링 목록</Link>

        <section className={styles.hero}>
          <div className={styles.heroMeta}>
            <span>{sparring.category}</span>
            <span>Round {sparring.round_number}</span>
            <span><Timer size={14} /> {daysLeft > 0 ? `${daysLeft}일 남았어요` : '마감됐어요'}</span>
          </div>
          <h1>{sparring.title}</h1>
          <p>{sparring.body}</p>
        </section>

        <section className={styles.votePanel} aria-label="스파링 투표">
          <div className={styles.voteHead}>
            <span><BarChart3 size={16} /> 내 선택</span>
            <strong>{percent.total}명 참여</strong>
          </div>
          <div className={styles.voteButtons}>
            <button
              type="button"
              className={`${styles.voteButton} ${selectedSide === 'a' ? styles.voteOnA : ''}`}
              onClick={() => vote('a')}
            >
              <ThumbsUp size={20} />
              <span>찬성</span>
              <strong>{sparring.side_a_label}</strong>
            </button>
            <button
              type="button"
              className={`${styles.voteButton} ${selectedSide === 'b' ? styles.voteOnB : ''}`}
              onClick={() => vote('b')}
            >
              <ThumbsDown size={20} />
              <span>반대</span>
              <strong>{sparring.side_b_label}</strong>
            </button>
          </div>
          {selectedSide && (
            <div className={styles.chart} aria-live="polite">
              <div className={styles.chartLine}>
                <strong>{sparring.side_a_label}</strong>
                <span>{percent.a}%</span>
              </div>
              <div className={styles.resultBar}>
                <span className={styles.sideA} style={{ width: `${percent.a}%` }} />
                <span className={styles.sideB} style={{ width: `${percent.b}%` }} />
              </div>
              <div className={styles.chartLine}>
                <strong>{sparring.side_b_label}</strong>
                <span>{percent.b}%</span>
              </div>
              {notice && <p>{notice}</p>}
            </div>
          )}
        </section>

        <section className={styles.commentComposer} aria-label="의견 작성">
          <div className={styles.voteHead}>
            <span><MessageCircle size={16} /> 의견 남기기</span>
            <strong>{comments.length}개 의견</strong>
          </div>
          <form onSubmit={submitComment}>
            <div className={styles.sideToggle} role="group" aria-label="의견 방향 선택">
              <button
                type="button"
                className={commentSide === 'a' ? styles.sideOnA : ''}
                onClick={() => setCommentSide('a')}
              >
                찬성 의견
              </button>
              <button
                type="button"
                className={commentSide === 'b' ? styles.sideOnB : ''}
                onClick={() => setCommentSide('b')}
              >
                반대 의견
              </button>
            </div>
            <textarea
              value={body}
              onChange={event => setBody(event.target.value)}
              placeholder={`${sideLabel(sparring, commentSide)} 쪽 의견을 남겨보세요.`}
              maxLength={600}
            />
            <button type="submit" disabled={isSaving || body.trim().length === 0}>
              {isSaving ? '저장 중' : '의견 등록'}
            </button>
          </form>
        </section>

        <section className={styles.columns} aria-label="찬반 의견">
          <OpinionColumn title="찬성 의견" label={sparring.side_a_label} comments={sideAComments} tone="a" />
          <OpinionColumn title="반대 의견" label={sparring.side_b_label} comments={sideBComments} tone="b" />
        </section>

        {related.length > 0 && (
          <section className={styles.related}>
            <div className={styles.sectionHead}>
              <span>같은 카테고리 다른 스파링</span>
            </div>
            <div className={styles.relatedGrid}>
              {related.map(item => <SparringCard key={item.id} sparring={item} />)}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}

function OpinionColumn({
  title,
  label,
  comments,
  tone,
}: {
  title: string;
  label: string;
  comments: SparringComment[];
  tone: SparringSide;
}) {
  return (
    <div className={styles.opinionColumn}>
      <div className={styles.columnHead}>
        <span className={tone === 'a' ? styles.toneA : styles.toneB}>{title}</span>
        <strong>{label}</strong>
      </div>
      <div className={styles.commentList}>
        {comments.map(comment => (
          <article key={comment.id} className={styles.comment}>
            <p>{comment.body}</p>
            <span>{comment.author_name || '한입 사용자'}</span>
          </article>
        ))}
        {comments.length === 0 && (
          <div className={styles.emptyComment}>아직 의견이 없어요.</div>
        )}
      </div>
    </div>
  );
}
