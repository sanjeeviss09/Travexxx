ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_pic TEXT;

-- Create the public storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- Optional: Allow public access to the avatars bucket files
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Allow Uploads"
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow Updates"
ON storage.objects FOR UPDATE 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow Deletes"
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars');
