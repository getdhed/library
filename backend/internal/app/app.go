package app

import (
	"context"
	"database/sql"
	"log/slog"
	"sync"
	"time"

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
	svc          *service.Service
	cancel       context.CancelFunc
	backgroundWg sync.WaitGroup
}

func New(ctx context.Context, cfg config.Config, logger *slog.Logger) (*App, error) {
	_, cancel := context.WithCancel(ctx)
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
	logger.Info("ensuring seed admin user", "username", cfg.SeedAdminUsername)
	if err := repo.EnsureSeedData(ctx, cfg.SeedAdminUsername, cfg.SeedAdminName, passwordHash); err != nil {
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
		svc:    svc,
		cancel: cancel,
	}

	application.startArchiver(ctx)

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

func (a *App) startArchiver(ctx context.Context) {
	a.backgroundWg.Add(1)
	go func() {
		defer a.backgroundWg.Done()
		
		// Run once on startup
		if err := a.svc.ArchiveOldLogs(ctx); err != nil {
			a.logger.Error("failed to archive old logs on startup", "error", err)
		} else {
			a.logger.Info("successfully executed old logs archiver")
		}
		if err := a.svc.CleanOldArchives(ctx, a.cfg.EnableArchiveRetention, a.cfg.ArchiveRetentionDays); err != nil {
			a.logger.Error("failed to clean old archives on startup", "error", err)
		}
		if err := a.svc.CleanupDeletedItems(ctx); err != nil {
			a.logger.Error("failed to cleanup deleted items on startup", "error", err)
		}
		if err := a.svc.DeactivateInactiveUsers(ctx); err != nil {
			a.logger.Error("failed to deactivate inactive users on startup", "error", err)
		}

		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := a.svc.ArchiveOldLogs(ctx); err != nil {
					a.logger.Error("failed to archive old logs", "error", err)
				} else {
					a.logger.Info("successfully executed old logs archiver")
				}
				if err := a.svc.CleanOldArchives(ctx, a.cfg.EnableArchiveRetention, a.cfg.ArchiveRetentionDays); err != nil {
					a.logger.Error("failed to clean old archives", "error", err)
				}
				if err := a.svc.CleanupDeletedItems(ctx); err != nil {
					a.logger.Error("failed to cleanup deleted items", "error", err)
				}
				if err := a.svc.DeactivateInactiveUsers(ctx); err != nil {
					a.logger.Error("failed to deactivate inactive users", "error", err)
				}
			}
		}
	}()
}

