package app

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
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
	db           *sql.DB
	server       *http.Server
	cfg          config.Config
	logger       *slog.Logger
	svc          *service.Service
	cancel       context.CancelFunc
	backgroundWg sync.WaitGroup
	closeOnce    sync.Once
	closeErr     error
}

func New(ctx context.Context, cfg config.Config, logger *slog.Logger) (*App, error) {
	appCtx, cancel := context.WithCancel(ctx)
	db, err := database.Open(appCtx, cfg.DatabaseURL)
	if err != nil {
		cancel()
		return nil, err
	}
	initialized := false
	defer func() {
		if !initialized {
			cancel()
			_ = db.Close()
		}
	}()

	if err := database.Migrate(appCtx, db, logger); err != nil {
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
	bootstrapCompleted, err := files.BootstrapCompleted()
	if err != nil {
		return nil, err
	}
	passwordHash, err := auth.HashPassword(cfg.SeedAdminPass)
	if err != nil {
		return nil, err
	}
	logger.Info("ensuring an active superadmin exists", "bootstrap_allowed", !bootstrapCompleted)
	if _, err := repo.EnsureSystemUser(appCtx, cfg.SeedAdminUsername, cfg.SeedAdminName, passwordHash, !bootstrapCompleted); err != nil {
		return nil, err
	}
	if !bootstrapCompleted {
		if err := files.MarkBootstrapCompleted(); err != nil {
			return nil, err
		}
	}
	tokens := auth.NewTokenManager(cfg.JWTSecret, cfg.TokenTTL)
	svc := service.New(repo, tokens, files, renderer)
	router := httpapi.NewRouter(cfg, svc, logger)
	server := &http.Server{
		Addr:              cfg.Address(),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       10 * time.Minute,
		WriteTimeout:      30 * time.Minute,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	application := &App{
		db:     db,
		server: server,
		cfg:    cfg,
		logger: logger,
		svc:    svc,
		cancel: cancel,
	}

	application.startArchiver(appCtx)
	initialized = true

	return application, nil
}

func (a *App) Run() error {
	a.logger.Info("starting http server", "address", a.cfg.Address())
	err := a.server.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func (a *App) Close() error {
	a.closeOnce.Do(func() {
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer shutdownCancel()

		var shutdownErr error
		if a.server != nil {
			shutdownErr = a.server.Shutdown(shutdownCtx)
			if shutdownErr != nil {
				shutdownErr = errors.Join(shutdownErr, a.server.Close())
			}
		}
		if a.cancel != nil {
			a.cancel()
		}
		a.backgroundWg.Wait()

		var dbErr error
		if a.db != nil {
			dbErr = a.db.Close()
		}
		a.closeErr = errors.Join(shutdownErr, dbErr)
	})
	return a.closeErr
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
