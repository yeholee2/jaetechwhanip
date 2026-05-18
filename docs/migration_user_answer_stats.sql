-- 답변자 신뢰도 컬럼 + 자동 집계 트리거
--
-- 목적: 답변 카드 옆에 '답변 12회 · 채택률 42%' 같은 신뢰도 배지 노출.
-- 멱등. 여러 번 돌려도 안전.

-- 1) 컬럼 추가
alter table public.users
  add column if not exists answer_count int not null default 0,
  add column if not exists accepted_count int not null default 0;

-- 2) 기존 데이터 백필
update public.users u
set
  answer_count = coalesce(s.cnt, 0),
  accepted_count = coalesce(s.acc, 0)
from (
  select author_id,
    count(*) as cnt,
    count(*) filter (where is_adopted) as acc
  from public.answers
  group by author_id
) s
where u.id = s.author_id;

-- 3) 트리거 함수 — 답변 insert/update/delete 시 집계 갱신
create or replace function public.refresh_user_answer_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_user_ids uuid[];
  uid uuid;
begin
  if (tg_op = 'INSERT') then
    affected_user_ids := array[new.author_id];
  elsif (tg_op = 'DELETE') then
    affected_user_ids := array[old.author_id];
  elsif (tg_op = 'UPDATE') then
    if new.author_id is distinct from old.author_id then
      affected_user_ids := array[new.author_id, old.author_id];
    else
      affected_user_ids := array[new.author_id];
    end if;
  end if;

  foreach uid in array affected_user_ids loop
    update public.users
    set
      answer_count = (select count(*) from public.answers where author_id = uid),
      accepted_count = (select count(*) from public.answers where author_id = uid and is_adopted)
    where id = uid;
  end loop;

  return null;
end;
$$;

-- 4) 트리거 부착 (멱등)
drop trigger if exists trg_user_answer_stats on public.answers;
create trigger trg_user_answer_stats
after insert or update or delete on public.answers
for each row
execute function public.refresh_user_answer_stats();
