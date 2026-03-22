package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"

	"github.com/pressly/goose/v3"

	"library-backend/migrations"
)

func Migrate(ctx context.Context, db *sql.DB, logger *slog.Logger) error {
	goose.SetBaseFS(migrations.FS)

	logger.Info("running database migrations")
	if err := goose.UpContext(ctx, db, "."); err != nil {
		logger.Error("database migrations failed", "error", err)
		return fmt.Errorf("run goose migrations: %w", err)
	}
	logger.Info("database migrations completed")

	return nil
}
