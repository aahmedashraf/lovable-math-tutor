-- Add sort_order for proper question ordering and file_url to documents for displaying original
ALTER TABLE public.questions ADD COLUMN sort_order integer DEFAULT 0;

ALTER TABLE public.documents ADD COLUMN file_url text;