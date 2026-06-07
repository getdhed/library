-- +goose Up
ALTER TABLE users RENAME COLUMN email TO username;

-- +goose Down
ALTER TABLE users RENAME COLUMN username TO email;
