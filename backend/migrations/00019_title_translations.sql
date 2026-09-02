-- +goose Up
ALTER TABLE documents
ADD COLUMN title_translations JSONB DEFAULT '{}'::jsonb;

ALTER TABLE document_submissions
ADD COLUMN title_translations JSONB DEFAULT '{}'::jsonb;

-- +goose Down
ALTER TABLE documents
DROP COLUMN title_translations;

ALTER TABLE document_submissions
DROP COLUMN title_translations;
