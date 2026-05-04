
INSERT INTO storage.buckets (id, name, public) VALUES ('home-photos','home-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read home photos" ON storage.objects FOR SELECT USING (bucket_id = 'home-photos');
CREATE POLICY "Admin upload home photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'home-photos' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update home photos" ON storage.objects FOR UPDATE USING (bucket_id = 'home-photos' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete home photos" ON storage.objects FOR DELETE USING (bucket_id = 'home-photos' AND has_role(auth.uid(),'admin'));
