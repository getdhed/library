-- +goose Up
CREATE TABLE api_requests_log (
    id BIGSERIAL PRIMARY KEY,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    status_code INT NOT NULL,
    duration_ms INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_requests_log_created_at ON api_requests_log(created_at);

-- +goose Down
DROP TABLE api_requests_log;
