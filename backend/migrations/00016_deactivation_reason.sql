-- +goose Up
ALTER TABLE users ADD COLUMN deactivation_reason TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE users DROP COLUMN deactivation_reason;
