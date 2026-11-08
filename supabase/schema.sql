-- Ķepatiņa — Supabase database setup.
-- Safe to run MORE THAN ONCE: Supabase Dashboard → SQL Editor → New query → paste everything → Run.

-- 1) Personal data (one JSON row per signed-in user)
CREATE TABLE IF NOT EXISTS public.user_state (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_state TO authenticated;
GRANT ALL ON public.user_state TO service_role;
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own state select" ON public.user_state;
DROP POLICY IF EXISTS "own state insert" ON public.user_state;
DROP POLICY IF EXISTS "own state update" ON public.user_state;
DROP POLICY IF EXISTS "own state delete" ON public.user_state;
CREATE POLICY "own state select" ON public.user_state FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own state insert" ON public.user_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own state update" ON public.user_state FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own state delete" ON public.user_state FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2) Family sharing
-- Invite codes: 12 random characters (hex). Older 8-character codes keep working.
CREATE OR REPLACE FUNCTION public.gen_invite_code()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
$$;

CREATE TABLE IF NOT EXISTS public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT public.gen_invite_code(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.families ALTER COLUMN invite_code SET DEFAULT public.gen_invite_code();

CREATE TABLE IF NOT EXISTS public.family_members (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  email text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, user_id)
);

-- Failed "join with a code" attempts (to slow down code guessing). Only the functions below touch it.
CREATE TABLE IF NOT EXISTS public.join_attempts (
  user_id uuid NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS join_attempts_user_idx ON public.join_attempts (user_id, at);
ALTER TABLE public.join_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.join_attempts FROM anon, authenticated;
GRANT ALL ON public.join_attempts TO service_role;

GRANT SELECT, DELETE ON public.families TO authenticated;
GRANT SELECT, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.families TO service_role;
GRANT ALL ON public.family_members TO service_role;
-- Members may change ONLY the shared data. They can never change owner_id or invite_code directly.
REVOKE UPDATE ON public.families FROM authenticated, anon;
GRANT UPDATE (data, updated_at) ON public.families TO authenticated;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_family_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT family_id FROM public.family_members WHERE user_id = auth.uid() LIMIT 1
$$;

DROP POLICY IF EXISTS "members read family" ON public.families;
DROP POLICY IF EXISTS "members update family" ON public.families;
DROP POLICY IF EXISTS "owner deletes family" ON public.families;
DROP POLICY IF EXISTS "members read members" ON public.family_members;
DROP POLICY IF EXISTS "leave or owner removes" ON public.family_members;
CREATE POLICY "members read family" ON public.families FOR SELECT TO authenticated USING (id = public.my_family_id());
CREATE POLICY "members update family" ON public.families FOR UPDATE TO authenticated USING (id = public.my_family_id()) WITH CHECK (id = public.my_family_id());
CREATE POLICY "owner deletes family" ON public.families FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "members read members" ON public.family_members FOR SELECT TO authenticated USING (family_id = public.my_family_id());
-- The owner can remove OTHER members. A regular member can remove only themselves.
-- The owner leaves through leave_family() so that the family is handed over, never left without an owner.
CREATE POLICY "leave or owner removes" ON public.family_members FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.families f
    WHERE f.id = family_id
      AND (
        (f.owner_id = auth.uid() AND user_id <> auth.uid())
        OR (user_id = auth.uid() AND f.owner_id <> auth.uid())
      )
  )
);

CREATE OR REPLACE FUNCTION public.create_family(initial jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'already in a family'; END IF;
  INSERT INTO families (owner_id, data) VALUES (auth.uid(), COALESCE(initial, '{}'::jsonb)) RETURNING id INTO fid;
  INSERT INTO family_members (family_id, user_id, email) VALUES (fid, auth.uid(), auth.jwt() ->> 'email');
  RETURN fid;
END $$;

-- Join with a code. A wrong code returns NULL (and is counted); at most 10 wrong codes per 15 minutes.
-- A family has at most 8 members.
CREATE OR REPLACE FUNCTION public.join_family(code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fid uuid; clean text; recent int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'already in a family'; END IF;

  DELETE FROM join_attempts WHERE at < now() - interval '1 day';
  SELECT count(*) INTO recent FROM join_attempts WHERE user_id = auth.uid() AND at > now() - interval '15 minutes';
  IF recent >= 10 THEN RAISE EXCEPTION 'too many attempts'; END IF;

  clean := upper(regexp_replace(COALESCE(code, ''), '[^A-Za-z0-9]', '', 'g'));
  SELECT id INTO fid FROM families WHERE invite_code = clean;
  IF fid IS NULL THEN
    INSERT INTO join_attempts (user_id) VALUES (auth.uid());
    RETURN NULL;
  END IF;

  PERFORM 1 FROM families WHERE id = fid FOR UPDATE;  -- two people joining at once cannot exceed the limit
  IF (SELECT count(*) FROM family_members WHERE family_id = fid) >= 8 THEN RAISE EXCEPTION 'family full'; END IF;

  INSERT INTO family_members (family_id, user_id, email) VALUES (fid, auth.uid(), auth.jwt() ->> 'email');
  RETURN fid;
END $$;

-- Internal: remove a person from their family. If they were the owner, the longest-standing member
-- becomes the owner; if nobody is left, the family is deleted.
CREATE OR REPLACE FUNCTION public._leave_family(uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fid uuid; fam_owner uuid; next_owner uuid;
BEGIN
  SELECT family_id INTO fid FROM family_members WHERE user_id = uid;
  IF fid IS NULL THEN RETURN; END IF;
  SELECT owner_id INTO fam_owner FROM families WHERE id = fid FOR UPDATE;
  DELETE FROM family_members WHERE user_id = uid;
  IF fam_owner = uid THEN
    SELECT user_id INTO next_owner FROM family_members WHERE family_id = fid ORDER BY joined_at LIMIT 1;
    IF next_owner IS NULL THEN
      DELETE FROM families WHERE id = fid;
    ELSE
      UPDATE families SET owner_id = next_owner WHERE id = fid;
    END IF;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._leave_family(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.leave_family()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  PERFORM public._leave_family(auth.uid());
END $$;

-- Owner only: replace the invite code (the old one stops working; members stay).
CREATE OR REPLACE FUNCTION public.regenerate_invite_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  UPDATE families SET invite_code = public.gen_invite_code() WHERE owner_id = auth.uid() RETURNING invite_code INTO c;
  IF c IS NULL THEN RAISE EXCEPTION 'not the owner'; END IF;
  RETURN c;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_family(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_family(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_family() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.regenerate_invite_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_family_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_family(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_family() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_family_id() TO authenticated;

-- Live updates for family sharing (skipped if already enabled)
ALTER TABLE public.families REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'families'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.families;
  END IF;
END $$;

-- 3) Delete my account (called from the app: Profile → Delete account)
-- If the person owns a family with other members, the family is handed over to the next member.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  PERFORM public._leave_family(uid);
  DELETE FROM public.join_attempts WHERE user_id = uid;
  DELETE FROM public.user_state WHERE user_id = uid;
  DELETE FROM auth.users WHERE id = uid;
END $$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
