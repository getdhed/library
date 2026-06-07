-- +goose Up
DROP INDEX IF EXISTS idx_documents_is_visible;
ALTER TABLE documents DROP COLUMN IF EXISTS is_visible;

-- +goose Down
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_documents_is_visible ON documents(is_visible);
