-- +goose Up
ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);

-- +goose Down
DROP INDEX IF EXISTS idx_documents_deleted_at;
ALTER TABLE documents DROP COLUMN deleted_at;
