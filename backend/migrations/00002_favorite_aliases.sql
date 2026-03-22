-- +goose Up
CREATE TABLE IF NOT EXISTS favorite_aliases (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_aliases_user_alias_trgm
    ON favorite_aliases
    USING gin (alias gin_trgm_ops);

-- +goose Down
DROP INDEX IF EXISTS idx_favorite_aliases_user_alias_trgm;
DROP TABLE IF EXISTS favorite_aliases;
