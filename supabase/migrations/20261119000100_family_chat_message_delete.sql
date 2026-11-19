GRANT DELETE ON public.family_messages TO authenticated;

DROP POLICY IF EXISTS "senders delete own chat messages" ON public.family_messages;
CREATE POLICY "senders delete own chat messages" ON public.family_messages
  FOR DELETE TO authenticated USING (
    family_id = public.my_family_id() AND sender_id = auth.uid()
  );
