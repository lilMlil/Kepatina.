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
CREATE TABLE IF NOT EXISTS public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.family_members (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  email text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, user_id)
);
GRANT SELECT, UPDATE, DELETE ON public.families TO authenticated;
GRANT SELECT, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.families TO service_role;
GRANT ALL ON public.family_members TO service_role;
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
CREATE POLICY "leave or owner removes" ON public.family_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = family_id AND f.owner_id = auth.uid())
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

CREATE OR REPLACE FUNCTION public.join_family(code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'already in a family'; END IF;
  SELECT id INTO fid FROM families WHERE invite_code = upper(trim(code));
  IF fid IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;
  INSERT INTO family_members (family_id, user_id, email) VALUES (fid, auth.uid(), auth.jwt() ->> 'email');
  RETURN fid;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_family(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_family(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_family_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_family(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family(text) TO authenticated;
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
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  DELETE FROM public.families WHERE owner_id = uid;
  DELETE FROM public.family_members WHERE user_id = uid;
  DELETE FROM public.user_state WHERE user_id = uid;
  DELETE FROM auth.users WHERE id = uid;
END $$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
