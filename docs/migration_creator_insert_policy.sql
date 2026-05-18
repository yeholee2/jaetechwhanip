-- Allow signed-in users to create their own creator page directly.
-- The live onboarding flow now uses /api/creator/launch with service_role,
-- but this keeps direct Supabase clients and admin UI paths aligned with RLS.

drop policy if exists "creators_self_insert" on public.creators;
create policy "creators_self_insert" on public.creators
  for insert
  with check (user_id = auth.uid());
