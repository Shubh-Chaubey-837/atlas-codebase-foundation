-- Drop duplicate FKs that cause ambiguous embeds
ALTER TABLE public.file_content DROP CONSTRAINT IF EXISTS fk_file_content_file_id;
ALTER TABLE public.file_tags DROP CONSTRAINT IF EXISTS fk_file_tags_file_id;
ALTER TABLE public.file_tags DROP CONSTRAINT IF EXISTS fk_file_tags_tag_id;