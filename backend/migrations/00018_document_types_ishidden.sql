-- +goose Up
ALTER TABLE document_types ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
ALTER TABLE document_types DROP COLUMN is_hidden;
