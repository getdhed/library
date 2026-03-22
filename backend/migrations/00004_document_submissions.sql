-- +goose Up
CREATE TABLE IF NOT EXISTS document_submissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    comment TEXT NOT NULL DEFAULT '',
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    cover_path TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    moderation_note TEXT NOT NULL DEFAULT '',
    approved_document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL,
    reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT document_submissions_status_check
        CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_document_submissions_user_created
    ON document_submissions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_submissions_status_created
    ON document_submissions(status, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_document_submissions_status_created;
DROP INDEX IF EXISTS idx_document_submissions_user_created;
DROP TABLE IF EXISTS document_submissions;
