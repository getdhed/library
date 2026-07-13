package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                   string
	DatabaseURL            string
	JWTSecret              string
	StoragePath            string
	MaxUploadSizeMB        int64
	TokenTTL               time.Duration
	CORSOrigins            []string
	SeedAdminUsername      string
	SeedAdminName          string
	SeedAdminPass          string
	LogLevel               string
	LogFormat              string
	EnableArchiveRetention bool
	ArchiveRetentionDays   int
}

func Load() Config {
	return Config{
		Port:                   getEnv("APP_PORT", "8080"),
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://library:library@localhost:5432/library?sslmode=disable"),
		JWTSecret:              getEnv("JWT_SECRET", "change-me-in-production"),
		StoragePath:            getEnv("STORAGE_PATH", "./storage"),
		MaxUploadSizeMB:        getEnvInt64("MAX_UPLOAD_SIZE_MB", 100),
		TokenTTL:               time.Duration(getEnvInt64("TOKEN_TTL_HOURS", 24)) * time.Hour,
		CORSOrigins:            getEnvSlice("CORS_ORIGINS", "http://localhost:5173"),
		SeedAdminUsername:      getEnv("SEED_ADMIN_USERNAME", "admin"),
		SeedAdminName:          getEnv("SEED_ADMIN_NAME", "Администратор"),
		SeedAdminPass:          getEnv("SEED_ADMIN_PASSWORD", "admin12345"),
		LogLevel:               strings.ToLower(getEnv("LOG_LEVEL", "info")),
		LogFormat:              strings.ToLower(getEnv("LOG_FORMAT", "text")),
		EnableArchiveRetention: getEnvBool("ENABLE_ARCHIVE_RETENTION", false),
		ArchiveRetentionDays:   int(getEnvInt64("ARCHIVE_RETENTION_DAYS", 365)),
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

func getEnvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	switch strings.ToLower(value) {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		panic(fmt.Sprintf("invalid bool env %s=%q", key, value))
	}
}
