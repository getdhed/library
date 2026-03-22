-- +goose Up
ALTER TABLE document_submissions
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user_upload';

UPDATE document_submissions
SET source = 'user_upload'
WHERE source IS NULL OR source = '';

ALTER TABLE document_submissions
    DROP CONSTRAINT IF EXISTS document_submissions_source_check;

ALTER TABLE document_submissions
    ADD CONSTRAINT document_submissions_source_check
    CHECK (source IN ('user_upload', 'admin_import'));

-- +goose Down
ALTER TABLE document_submissions
    DROP CONSTRAINT IF EXISTS document_submissions_source_check;

ALTER TABLE document_submissions
    DROP COLUMN IF EXISTS source;
