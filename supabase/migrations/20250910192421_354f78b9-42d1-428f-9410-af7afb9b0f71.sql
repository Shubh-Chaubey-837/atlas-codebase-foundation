-- Add foreign key relationships for proper joins
ALTER TABLE file_content 
ADD CONSTRAINT fk_file_content_file_id 
FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;

ALTER TABLE file_tags 
ADD CONSTRAINT fk_file_tags_file_id 
FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;

ALTER TABLE file_tags 
ADD CONSTRAINT fk_file_tags_tag_id 
FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;