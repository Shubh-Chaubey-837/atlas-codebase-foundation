-- Enable Row Level Security (RLS) on all public tables
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- No permissive policies are added by default to keep data secure.
-- The Edge Function uses the service role key which bypasses RLS for inserts/uploads.
-- We can later add fine-grained policies once authentication/user mapping is defined.

-- Harden function: set a stable search_path and run as SECURITY DEFINER to avoid search_path hijacking
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;