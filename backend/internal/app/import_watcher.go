package app

import (
	"context"
	"time"

	"library-backend/internal/service"
)

func (a *App) startImportWatcher(ctx context.Context, svc *service.Service, systemUserID int64) {
	interval := time.Duration(a.cfg.ImportScanIntervalSeconds) * time.Second
	if interval <= 0 {
		interval = 10 * time.Second
	}

	a.backgroundWg.Add(1)
	go func() {
		defer a.backgroundWg.Done()

		a.runImportScan(ctx, svc, systemUserID)

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				a.runImportScan(ctx, svc, systemUserID)
			}
		}
	}()
}

func (a *App) runImportScan(ctx context.Context, svc *service.Service, systemUserID int64) {
	result, err := svc.ImportFolderSubmissions(ctx, systemUserID, a.cfg.ImportPath)
	if err != nil {
		a.logger.Error("import folder scan failed", "error", err, "path", a.cfg.ImportPath)
		return
	}

	if result.Queued > 0 || len(result.Errors) > 0 {
		a.logger.Info(
			"import folder scan completed",
			"path", a.cfg.ImportPath,
			"queued", result.Queued,
			"errors", len(result.Errors),
		)
	}
}
