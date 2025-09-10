-- Create the documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for the documents bucket
CREATE POLICY "Allow service role full access to documents bucket" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'documents');

-- Policy for authenticated users to access their own files
CREATE POLICY "Users can access their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);