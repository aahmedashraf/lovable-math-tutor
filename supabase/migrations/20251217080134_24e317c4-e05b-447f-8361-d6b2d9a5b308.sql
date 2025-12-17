-- Add user_id column to documents table
ALTER TABLE public.documents ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can read documents" ON public.documents;

-- Create user-scoped policies
CREATE POLICY "Users can insert own documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() = user_id);

-- Update questions policy to allow users to see questions from their documents
DROP POLICY IF EXISTS "Authenticated users can read questions" ON public.questions;
CREATE POLICY "Users can read questions from own documents" 
ON public.questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = questions.document_id 
    AND documents.user_id = auth.uid()
  )
);