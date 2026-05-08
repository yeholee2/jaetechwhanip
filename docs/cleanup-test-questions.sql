-- Supabase SQL Editor에서 실행하는 테스트 질문 정리용 SQL.
-- 대상: title/body가 dld, test, asdf 등으로만 된 얇은 테스트 질문.

do $$
declare
  target_ids uuid[];
begin
  select coalesce(array_agg(id), '{}')
    into target_ids
  from public.questions
  where
    lower(trim(coalesce(title, ''))) in ('test', 'asdf', 'qwer', 'dld', 'aaa', 'bbb', 'ccc')
    or lower(trim(coalesce(body, ''))) in ('test', 'asdf', 'qwer', 'dld', 'aaa', 'bbb', 'ccc')
    or trim(coalesce(title, '')) in ('테스트', 'ㄴㄴ', 'ㅇㅇ')
    or trim(coalesce(body, '')) in ('테스트', 'ㄴㄴ', 'ㅇㅇ')
    or (
      trim(coalesce(title, '')) = trim(coalesce(body, ''))
      and length(trim(coalesce(title, ''))) < 8
    );

  delete from public.comments
  where answer_id in (select id from public.answers where question_id = any(target_ids));

  delete from public.liked_answers
  where answer_id in (select id from public.answers where question_id = any(target_ids));

  delete from public.answers
  where question_id = any(target_ids);

  delete from public.liked_questions
  where question_id = any(target_ids);

  delete from public.questions
  where id = any(target_ids);
end $$;
