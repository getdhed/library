-- +goose Up
ALTER TABLE documents
    ADD COLUMN executor TEXT NOT NULL DEFAULT '',
    ADD COLUMN scientific_advisor TEXT NOT NULL DEFAULT '',
    ADD COLUMN place_of_publication TEXT NOT NULL DEFAULT '',
    ADD COLUMN publisher TEXT NOT NULL DEFAULT '',
    ADD COLUMN periodical_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN volume TEXT NOT NULL DEFAULT '';

ALTER TABLE document_submissions
    ADD COLUMN executor TEXT NOT NULL DEFAULT '',
    ADD COLUMN scientific_advisor TEXT NOT NULL DEFAULT '',
    ADD COLUMN place_of_publication TEXT NOT NULL DEFAULT '',
    ADD COLUMN publisher TEXT NOT NULL DEFAULT '',
    ADD COLUMN periodical_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN volume TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE document_submissions
    DROP COLUMN executor,
    DROP COLUMN scientific_advisor,
    DROP COLUMN place_of_publication,
    DROP COLUMN publisher,
    DROP COLUMN periodical_name,
    DROP COLUMN volume;

ALTER TABLE documents
    DROP COLUMN executor,
    DROP COLUMN scientific_advisor,
    DROP COLUMN place_of_publication,
    DROP COLUMN publisher,
    DROP COLUMN periodical_name,
    DROP COLUMN volume;
