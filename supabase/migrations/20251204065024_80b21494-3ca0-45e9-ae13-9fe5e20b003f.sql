-- Change question_number from integer to text to support sub-question numbering like "1a", "2ii", etc.
ALTER TABLE public.questions 
ALTER COLUMN question_number TYPE text USING question_number::text;