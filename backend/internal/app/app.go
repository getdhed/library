package app

import (
	"context"
	"database/sql"
	"log/slog"
	"sync"

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
	cfg          config.Config
	logger       *slog.Logger
	cancel       context.CancelFunc
	backgroundWg sync.WaitGroup
}

func New(ctx context.Context, cfg config.Config, logger *slog.Logger) (*App, error) {
	appCtx, cancel := context.WithCancel(ctx)
	db, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		cancel()
		return nil, err
	}

	if err := database.Migrate(ctx, db, logger); err != nil {
		cancel()
		return nil, err
	}

	files := storage.New(cfg.StoragePath)
	if err := files.Ensure(); err != nil {
		cancel()
		return nil, err
	}
	renderer, err := preview.New()
	if err != nil {
		cancel()
		return nil, err
	}

	repo := repository.New(db)
	passwordHash, err := auth.HashPassword(cfg.SeedAdminPass)
	if err != nil {
		cancel()
		return nil, err
	}
	logger.Info("ensuring seed admin user", "email", cfg.SeedAdminEmail)
	if err := repo.EnsureSeedData(ctx, cfg.SeedAdminEmail, cfg.SeedAdminName, passwordHash); err != nil {
		cancel()
		return nil, err
	}
	systemUser, err := repo.EnsureSystemUser(ctx, cfg.SystemImportEmail, cfg.SystemImportName, passwordHash)
	if err != nil {
		cancel()
		return nil, err
	}

	tokens := auth.NewTokenManager(cfg.JWTSecret, cfg.TokenTTL)
	svc := service.New(repo, tokens, files, renderer)
	router := httpapi.NewRouter(cfg, svc, logger)

	application := &App{
		db:     db,
		server: router,
		cfg:    cfg,
		logger: logger,
		cancel: cancel,
	}
	application.startImportWatcher(appCtx, svc, systemUser.ID)

	return application, nil
}

func (a *App) Run() error {
	a.logger.Info("starting http server", "address", a.cfg.Address())
	return a.server.Run(a.cfg.Address())
}

func (a *App) Close() error {
	if a.cancel != nil {
		a.cancel()
	}
	a.backgroundWg.Wait()
	if a.db != nil {
		return a.db.Close()
	}
	return nil
}
