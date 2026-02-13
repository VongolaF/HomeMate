-- Enable RLS and allow authenticated users to manage their own avatar files
-- Files are stored under: avatars/<user_id>/...

alter table storage.objects enable row level security;

create policy "avatars insert own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "avatars update own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "avatars delete own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );
