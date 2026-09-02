package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"

	"library-backend/internal/app"
	"library-backend/internal/config"
	"library-backend/internal/logging"
)

// @title Library API
// @version 1.0
// @description Backend API for the Library application.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@library.local

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

// @host localhost:8080
// @BasePath /api

func main() {
	os.Exit(run())
}

func run() int {
	_ = godotenv.Load()

	cfg := config.Load()
	logger := logging.New(cfg)
	if err := cfg.ValidateSecurity(); err != nil {
		logger.Error("invalid security configuration", "error", err)
		return 1
	}
	logger.Info("starting library-backend", "port", cfg.Port, "log_level", cfg.LogLevel, "log_format", cfg.LogFormat)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	application, err := app.New(ctx, cfg, logger)
	if err != nil {
		logger.Error("failed to start application", "error", err)
		return 1
	}

	runErr := make(chan error, 1)
	go func() {
		runErr <- application.Run()
	}()

	exitCode := 0
	select {
	case err := <-runErr:
		if err != nil {
			logger.Error("server exited with error", "error", err)
			exitCode = 1
		}
	case <-ctx.Done():
		logger.Info("shutdown signal received")
	}

	if err := application.Close(); err != nil {
		logger.Error("failed to shut down application cleanly", "error", err)
		exitCode = 1
	}
	return exitCode
}
