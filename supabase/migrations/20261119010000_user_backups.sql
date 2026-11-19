INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('user-backups', 'user-backups', false, ARRAY['application/zip'])
ON CONFLICT (id) DO UPDATE
SET public = false, allowed_mime_types = ARRAY['application/zip'];

DROP POLICY IF EXISTS "users read own backups" ON storage.objects;
DROP POLICY IF EXISTS "users upload own backups" ON storage.objects;
DROP POLICY IF EXISTS "users update own backups" ON storage.objects;
DROP POLICY IF EXISTS "users delete own backups" ON storage.objects;

CREATE POLICY "users read own backups" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'user-backups' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "users upload own backups" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'user-backups' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "users update own backups" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'user-backups' AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'user-backups' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "users delete own backups" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'user-backups' AND (storage.foldername(name))[1] = auth.uid()::text
  );
