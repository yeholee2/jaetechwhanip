-- Sparring thumbnail storage bucket
-- 실행 위치: Supabase SQL Editor
-- 목적: /admin/sparring 에서 대표 이미지 업로드가 동작하도록 public bucket + admin 정책을 만든다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sparring-thumbnails',
  'sparring-thumbnails',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  create policy "sparring_thumbnails_public_read"
    on storage.objects
    for select
    using (bucket_id = 'sparring-thumbnails');
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "sparring_thumbnails_admin_insert"
    on storage.objects
    for insert
    with check (
      bucket_id = 'sparring-thumbnails'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'admin'
      )
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "sparring_thumbnails_admin_update"
    on storage.objects
    for update
    using (
      bucket_id = 'sparring-thumbnails'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'admin'
      )
    )
    with check (
      bucket_id = 'sparring-thumbnails'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'admin'
      )
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "sparring_thumbnails_admin_delete"
    on storage.objects
    for delete
    using (
      bucket_id = 'sparring-thumbnails'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'admin'
      )
    );
exception when duplicate_object then null;
end $$;
