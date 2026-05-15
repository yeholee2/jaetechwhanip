-- 알림 트리거 v1 — 4 종류 자동 알림
--   1. 팔로우한 크리에이터 새 글
--   2. 내 글에 좋아요 받음
--   3. 내 글에 댓글 달림
--   4. 내 질문에 답변 달림

-- ── 1. kind enum 확장 ──
alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check
  check (kind in (
    'alert',                       -- ETF 가격 알림 (기존)
    'system',                      -- 시스템 공지 (기존)
    'creator_post_published',      -- 팔로우한 크리에이터 새 글
    'creator_post_liked',          -- 내 글 좋아요 받음
    'creator_post_commented',      -- 내 글에 댓글 달림
    'qa_answered'                  -- 내 질문에 답변 달림
  ));

-- ── 2. 크리에이터 새 글 발행 → 팔로워에게 알림 ──
create or replace function notify_creator_followers_on_post()
returns trigger as $$
declare
  v_creator record;
begin
  if new.is_published = false then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.is_published = true then
    return new;  -- 이미 발행된 글의 다른 필드 update 는 무시
  end if;
  select id, slug, display_name, user_id into v_creator from creators where id = new.creator_id;
  if v_creator is null then
    return new;
  end if;

  insert into user_notifications (user_id, kind, title, body, link)
  select
    f.user_id,
    'creator_post_published',
    v_creator.display_name || ' 새 글이 올라왔어요',
    new.title,
    '/creator/' || v_creator.slug || '/posts/' || new.slug
  from creator_follows f
  where f.creator_id = v_creator.id
    and f.user_id <> v_creator.user_id;  -- 자기 자신 제외
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_creator_followers_on_post on creator_posts;
create trigger trg_notify_creator_followers_on_post
  after insert or update of is_published on creator_posts
  for each row execute function notify_creator_followers_on_post();

-- ── 3. 내 글에 좋아요 → 글 작성자에게 알림 ──
create or replace function notify_post_author_on_like()
returns trigger as $$
declare
  v_post record;
  v_liker_name text;
begin
  select p.id, p.title, p.slug, c.user_id as author_id, c.slug as creator_slug
    into v_post
    from creator_posts p
    join creators c on c.id = p.creator_id
   where p.id = new.post_id;
  if v_post is null or v_post.author_id = new.user_id then
    return new;  -- 본인 좋아요는 알림 X
  end if;

  select coalesce(nickname, 'someone') into v_liker_name from public.users where id = new.user_id;

  insert into user_notifications (user_id, kind, title, body, link)
  values (
    v_post.author_id,
    'creator_post_liked',
    coalesce(v_liker_name, '누군가') || ' 님이 좋아요를 눌렀어요',
    v_post.title,
    '/creator/' || v_post.creator_slug || '/posts/' || v_post.slug
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_post_author_on_like on creator_post_likes;
create trigger trg_notify_post_author_on_like
  after insert on creator_post_likes
  for each row execute function notify_post_author_on_like();

-- ── 4. 내 글에 댓글 → 글 작성자에게 알림 ──
create or replace function notify_post_author_on_comment()
returns trigger as $$
declare
  v_post record;
  v_commenter_name text;
begin
  if new.is_deleted = true then return new; end if;

  select p.id, p.title, p.slug, c.user_id as author_id, c.slug as creator_slug
    into v_post
    from creator_posts p
    join creators c on c.id = p.creator_id
   where p.id = new.post_id;
  if v_post is null or v_post.author_id = new.user_id then
    return new;  -- 본인 댓글은 알림 X
  end if;

  select coalesce(nickname, 'someone') into v_commenter_name from public.users where id = new.user_id;

  insert into user_notifications (user_id, kind, title, body, link)
  values (
    v_post.author_id,
    'creator_post_commented',
    coalesce(v_commenter_name, '누군가') || ' 님이 댓글을 남겼어요',
    case when length(new.body) > 80 then substring(new.body, 1, 80) || '…' else new.body end,
    '/creator/' || v_post.creator_slug || '/posts/' || v_post.slug
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_post_author_on_comment on creator_post_comments;
create trigger trg_notify_post_author_on_comment
  after insert on creator_post_comments
  for each row execute function notify_post_author_on_comment();

-- ── 5. 내 질문에 답변 → 질문 작성자에게 알림 ──
-- (answers 테이블 존재 시에만 활성화)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='answers') then
    execute $f$
      create or replace function notify_question_author_on_answer()
      returns trigger as $body$
      declare
        v_q record;
        v_answerer_name text;
      begin
        select id, title, slug, author_id into v_q from questions where id = new.question_id;
        if v_q is null or v_q.author_id = new.author_id then
          return new;
        end if;
        select coalesce(nickname, 'someone') into v_answerer_name from public.users where id = new.author_id;
        insert into user_notifications (user_id, kind, title, body, link)
        values (
          v_q.author_id,
          'qa_answered',
          coalesce(v_answerer_name, '누군가') || ' 님이 답변을 남겼어요',
          v_q.title,
          '/q/' || coalesce(v_q.slug, v_q.id::text)
        );
        return new;
      end;
      $body$ language plpgsql security definer;
    $f$;
    execute 'drop trigger if exists trg_notify_question_author_on_answer on answers';
    execute 'create trigger trg_notify_question_author_on_answer
       after insert on answers
       for each row execute function notify_question_author_on_answer()';
  end if;
end $$;
