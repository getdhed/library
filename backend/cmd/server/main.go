package main

import (
	"context"
	"fmt"
	"os"

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

func pauseAndExit() {
	fmt.Println("\nНажмите Enter для выхода...")
	fmt.Scanln()
	os.Exit(1)
}

func main() {
	_ = godotenv.Load()
	
	cfg := config.Load()
	logger := logging.New(cfg)
	logger.Info("starting library-backend", "port", cfg.Port, "log_level", cfg.LogLevel, "log_format", cfg.LogFormat)

	application, err := app.New(context.Background(), cfg, logger)
	if err != nil {
		logger.Error("failed to start application", "error", err)
		pauseAndExit()
	}
	defer application.Close()

	if err := application.Run(); err != nil {
		logger.Error("server exited with error", "error", err)
		pauseAndExit()
	}
}
