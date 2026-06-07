-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS document_audit_events (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL,
    submission_id BIGINT REFERENCES document_submissions(id) ON DELETE SET NULL,
    document_title TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL DEFAULT '',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_audit_events_document_created
    ON document_audit_events(document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_audit_events_submission_created
    ON document_audit_events(submission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_audit_events_actor_created
    ON document_audit_events(actor_id, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_document_audit_events_actor_created;
DROP INDEX IF EXISTS idx_document_audit_events_submission_created;
DROP INDEX IF EXISTS idx_document_audit_events_document_created;
DROP TABLE IF EXISTS document_audit_events;

ALTER TABLE users
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS is_active;
