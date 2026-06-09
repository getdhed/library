-- +goose Up
ALTER TABLE document_submissions
    ADD COLUMN year INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN type TEXT NOT NULL DEFAULT '',
    ADD COLUMN description TEXT NOT NULL DEFAULT '',
    ADD COLUMN tags TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE document_submissions
    DROP COLUMN year,
    DROP COLUMN type,
    DROP COLUMN description,
    DROP COLUMN tags;
