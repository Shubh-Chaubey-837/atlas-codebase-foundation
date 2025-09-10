-- Full-text search for file_content without external APIs
-- 1) Add tsvector column
ALTER TABLE public.file_content
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2) Backfill existing rows
UPDATE public.file_content
SET search_vector = to_tsvector('english', COALESCE(indexed_text, ''))
WHERE search_vector IS NULL;

-- 3) Index for fast search
CREATE INDEX IF NOT EXISTS idx_file_content_search_vector
ON public.file_content USING GIN (search_vector);

-- 4) Trigger to keep vector updated on changes
DROP TRIGGER IF EXISTS trg_file_content_tsvector_update ON public.file_content;
CREATE TRIGGER trg_file_content_tsvector_update
BEFORE INSERT OR UPDATE OF indexed_text ON public.file_content
FOR EACH ROW EXECUTE FUNCTION tsvector_update_trigger('search_vector', 'pg_catalog.english', 'indexed_text');