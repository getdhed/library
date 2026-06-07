-- +goose Up

-- Remove department_id from documents (drop FK constraint first)
ALTER TABLE documents DROP COLUMN IF EXISTS department_id;

-- Remove department_id from document_submissions
ALTER TABLE document_submissions DROP COLUMN IF EXISTS department_id;

-- Drop departments and faculties tables (CASCADE removes FK references and indexes)
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS faculties CASCADE;

-- +goose Down
-- This migration is intentionally irreversible.
-- To restore, recreate the tables manually and re-add department_id columns.
