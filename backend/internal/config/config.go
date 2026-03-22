package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                      string
	DatabaseURL               string
	JWTSecret                 string
	StoragePath               string
	ImportPath                string
	ImportScanIntervalSeconds int64
	MaxUploadSizeMB           int64
	TokenTTL                  time.Duration
	CORSOrigins               []string
	SeedAdminEmail            string
	SeedAdminName             string
	SeedAdminPass             string
	SystemImportEmail         string
	SystemImportName          string
	LogLevel                  string
	LogFormat                 string
}

func Load() Config {
	return Config{
		Port:                      getEnv("APP_PORT", "8080"),
		DatabaseURL:               getEnv("DATABASE_URL", "postgres://library:library@localhost:5432/library?sslmode=disable"),
		JWTSecret:                 getEnv("JWT_SECRET", "change-me-in-production"),
		StoragePath:               getEnv("STORAGE_PATH", "./storage"),
		ImportPath:                getEnv("IMPORT_PATH", "./storage/import"),
		ImportScanIntervalSeconds: getEnvInt64("IMPORT_SCAN_INTERVAL_SECONDS", 10),
		MaxUploadSizeMB:           getEnvInt64("MAX_UPLOAD_SIZE_MB", 100),
		TokenTTL:                  time.Duration(getEnvInt64("TOKEN_TTL_HOURS", 72)) * time.Hour,
		CORSOrigins:               getEnvSlice("CORS_ORIGINS", "http://localhost:5173"),
		SeedAdminEmail:            getEnv("SEED_ADMIN_EMAIL", "admin@library.local"),
		SeedAdminName:             getEnv("SEED_ADMIN_NAME", "Администратор"),
		SeedAdminPass:             getEnv("SEED_ADMIN_PASSWORD", "admin12345"),
		SystemImportEmail:         getEnv("SYSTEM_IMPORT_EMAIL", "system-import@library.local"),
		SystemImportName:          getEnv("SYSTEM_IMPORT_NAME", "System Import"),
		LogLevel:                  strings.ToLower(getEnv("LOG_LEVEL", "info")),
		LogFormat:                 strings.ToLower(getEnv("LOG_FORMAT", "text")),
	}
}

func (c Config) Address() string {
	return ":" + c.Port
}

func (c Config) MaxUploadSizeBytes() int64 {
	return c.MaxUploadSizeMB * 1024 * 1024
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		panic(fmt.Sprintf("invalid int env %s=%q", key, value))
	}
	return parsed
}

func getEnvSlice(key, fallback string) []string {
	raw := getEnv(key, fallback)
	parts := strings.Split(raw, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			items = append(items, part)
		}
	}
	return items
}
