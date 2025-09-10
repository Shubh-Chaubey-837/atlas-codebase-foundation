-- Allow files.user_id to be optional so uploads without a user can succeed
ALTER TABLE public.files ALTER COLUMN user_id DROP NOT NULL;