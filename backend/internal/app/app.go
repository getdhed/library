package app

import (
	"context"
	"database/sql"
	"log/slog"

	"library-backend/internal/auth"
	"library-backend/internal/config"
	"library-backend/internal/database"
	"library-backend/internal/httpapi"
	"library-backend/internal/preview"
	"library-backend/internal/repository"
	"library-backend/internal/service"
	"library-backend/internal/storage"
)

type App struct {
	db     *sql.DB
	server interface {
		Run(addr ...string) error
	}
	cfg    config.Config
	logger *slog.Logger
}

func New(ctx context.Context, cfg config.Config, logger *slog.Logger) (*App, error) {
	db, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	if err := database.Migrate(ctx, db, logger); err != nil {
		return nil, err
	}

	files := storage.New(cfg.StoragePath)
	if err := files.Ensure(); err != nil {
		return nil, err
	}
	renderer, err := preview.New()
	if err != nil {
		return nil, err
	}

	repo := repository.New(db)
	passwordHash, err := auth.HashPassword(cfg.SeedAdminPass)
	if err != nil {
		return nil, err
	}
	logger.Info("ensuring seed admin user", "email", cfg.SeedAdminEmail)
	if err := repo.EnsureSeedData(ctx, cfg.SeedAdminEmail, cfg.SeedAdminName, passwordHash); err != nil {
		return nil, err
	}

	tokens := auth.NewTokenManager(cfg.JWTSecret, cfg.TokenTTL)
	svc := service.New(repo, tokens, files, renderer)
	router := httpapi.NewRouter(cfg, svc, logger)

	return &App{
		db:     db,
		server: router,
		cfg:    cfg,
		logger: logger,
	}, nil
}

func (a *App) Run() error {
	a.logger.Info("starting http server", "address", a.cfg.Address())
	return a.server.Run(a.cfg.Address())
}

func (a *App) Close() error {
	if a.db != nil {
		return a.db.Close()
	}
	return nil
}
