-- creator_post_comments — v2 (Phase 1.5)

create table if not exists creator_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references creator_posts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  body text not null,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_creator_post_comments_post on creator_post_comments(post_id, created_at desc);

alter table creator_post_comments enable row level security;

do $$ begin
  create policy "creator_post_comments_read"
    on creator_post_comments for select
    using (is_deleted = false);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "creator_post_comments_self_insert"
    on creator_post_comments for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "creator_post_comments_self_update"
    on creator_post_comments for update
    using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- comment_count 카운터 트리거
create or replace function bump_creator_post_comment_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' and (new.is_deleted = false) then
    update creator_posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' then
    if old.is_deleted = false and new.is_deleted = true then
      update creator_posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    elsif old.is_deleted = true and new.is_deleted = false then
      update creator_posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;
  elsif tg_op = 'DELETE' and (old.is_deleted = false) then
    update creator_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_creator_post_comment_count on creator_post_comments;
create trigger trg_creator_post_comment_count
  after insert or update or delete on creator_post_comments
  for each row execute function bump_creator_post_comment_count();

-- like_count 카운터 트리거 (creator_post_likes 용)
create or replace function bump_creator_post_like_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update creator_posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update creator_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_creator_post_like_count on creator_post_likes;
create trigger trg_creator_post_like_count
  after insert or delete on creator_post_likes
  for each row execute function bump_creator_post_like_count();
