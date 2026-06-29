
-- Lock down SECURITY DEFINER trigger function
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- Storage policies for the private 'papers' bucket
CREATE POLICY "Users read own papers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own papers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own papers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own papers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);
