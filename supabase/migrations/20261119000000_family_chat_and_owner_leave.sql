-- Repair family chat and creator-leave behavior on databases that were provisioned
-- before these objects were included in the setup schema.

CREATE TABLE IF NOT EXISTS public.family_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('text', 'image', 'video', 'audio')),
  content text,
  media_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'text' AND length(btrim(COALESCE(content, ''))) BETWEEN 1 AND 4000 AND media_path IS NULL)
    OR (
      kind <> 'text'
      AND media_path LIKE family_id::text || '/' || sender_id::text || '/%'
      AND length(COALESCE(content, '')) <= 4000
    )
  )
);
CREATE INDEX IF NOT EXISTS family_messages_timeline_idx
  ON public.family_messages (family_id, created_at DESC);

ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.family_messages TO authenticated;
GRANT ALL ON public.family_messages TO service_role;
DROP POLICY IF EXISTS "family members read chat" ON public.family_messages;
DROP POLICY IF EXISTS "family members send chat" ON public.family_messages;
CREATE POLICY "family members read chat" ON public.family_messages
  FOR SELECT TO authenticated USING (family_id = public.my_family_id());
CREATE POLICY "family members send chat" ON public.family_messages
  FOR INSERT TO authenticated WITH CHECK (
    family_id = public.my_family_id() AND sender_id = auth.uid()
  );

-- People can delete only their own messages (their own media files are covered by the storage policy below).
DROP POLICY IF EXISTS "senders delete own chat" ON public.family_messages;
CREATE POLICY "senders delete own chat" ON public.family_messages
  FOR DELETE TO authenticated USING (
    family_id = public.my_family_id() AND sender_id = auth.uid()
  );

-- Private nicknames: each person's own names for family members (visible only to them).
-- Older databases lacked this table, which caused: "Could not find the table
-- 'public.family_member_nicknames' in the schema cache".
CREATE TABLE IF NOT EXISTS public.family_member_nicknames (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL,
  nickname text NOT NULL CHECK (length(btrim(nickname)) BETWEEN 1 AND 40),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, user_id, member_user_id),
  FOREIGN KEY (family_id, user_id)
    REFERENCES public.family_members(family_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (family_id, member_user_id)
    REFERENCES public.family_members(family_id, user_id) ON DELETE CASCADE
);
ALTER TABLE public.family_member_nicknames ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_member_nicknames TO authenticated;
GRANT ALL ON public.family_member_nicknames TO service_role;
DROP POLICY IF EXISTS "view own family nicknames" ON public.family_member_nicknames;
DROP POLICY IF EXISTS "insert own family nicknames" ON public.family_member_nicknames;
DROP POLICY IF EXISTS "update own family nicknames" ON public.family_member_nicknames;
DROP POLICY IF EXISTS "delete own family nicknames" ON public.family_member_nicknames;
CREATE POLICY "view own family nicknames" ON public.family_member_nicknames
  FOR SELECT TO authenticated USING (user_id = auth.uid() AND family_id = public.my_family_id());
CREATE POLICY "insert own family nicknames" ON public.family_member_nicknames
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND family_id = public.my_family_id()
  );
CREATE POLICY "update own family nicknames" ON public.family_member_nicknames
  FOR UPDATE TO authenticated USING (
    user_id = auth.uid() AND family_id = public.my_family_id()
  ) WITH CHECK (user_id = auth.uid() AND family_id = public.my_family_id());
CREATE POLICY "delete own family nicknames" ON public.family_member_nicknames
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND family_id = public.my_family_id());

-- Private media lives at family-id/uploader-id/... . Keep the bucket limits aligned with
-- the chat UI and ensure existing bucket configuration is repaired as well.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('family-chat', 'family-chat', false, 52428800, ARRAY['image/*', 'video/*', 'audio/*'])
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = 52428800, allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "family members read chat media" ON storage.objects;
DROP POLICY IF EXISTS "members upload own chat media" ON storage.objects;
DROP POLICY IF EXISTS "members remove own chat media" ON storage.objects;
CREATE POLICY "family members read chat media" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'family-chat'
    AND (storage.foldername(name))[1] = public.my_family_id()::text
  );
CREATE POLICY "members upload own chat media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'family-chat'
    AND (storage.foldername(name))[1] = public.my_family_id()::text
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
CREATE POLICY "members remove own chat media" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'family-chat'
    AND (storage.foldername(name))[1] = public.my_family_id()::text
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Transfer ownership before deleting the owner's membership. If the owner is the only
-- member, deleting the family cascades cleanly instead of leaving an ownerless family.
CREATE OR REPLACE FUNCTION public._leave_family(uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fid uuid; fam_owner uuid; next_owner uuid;
BEGIN
  SELECT family_id INTO fid FROM public.family_members WHERE user_id = uid;
  IF fid IS NULL THEN RETURN; END IF;

  SELECT owner_id INTO fam_owner
  FROM public.families
  WHERE id = fid
  FOR UPDATE;

  IF fam_owner = uid THEN
    SELECT user_id INTO next_owner
    FROM public.family_members
    WHERE family_id = fid AND user_id <> uid
    ORDER BY joined_at, user_id
    LIMIT 1;

    IF next_owner IS NULL THEN
      DELETE FROM public.families WHERE id = fid;
    ELSE
      UPDATE public.families SET owner_id = next_owner WHERE id = fid;
      DELETE FROM public.family_members WHERE family_id = fid AND user_id = uid;
    END IF;
  ELSE
    DELETE FROM public.family_members WHERE family_id = fid AND user_id = uid;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._leave_family(uuid) FROM PUBLIC, anon, authenticated;

-- The public RPC the app calls (supabase.rpc('leave_family')). Older databases only had the
-- internal helper above, which caused: "Could not find the function public.leave_family without
-- parameters in the schema cache". Create it here and expose it to signed-in users.
CREATE OR REPLACE FUNCTION public.leave_family()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  PERFORM public._leave_family(auth.uid());
END $$;
REVOKE EXECUTE ON FUNCTION public.leave_family() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_family() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'family_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.family_messages;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
