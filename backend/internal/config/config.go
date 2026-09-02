package config

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	ListenHost             string
	Port                   string
	DatabaseURL            string
	JWTSecret              string
	StoragePath            string
	MaxUploadSizeMB        int64
	MultipartMemoryMB      int64
	TokenTTL               time.Duration
	CORSOrigins            []string
	TrustedProxies         []string
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
		ListenHost:             getEnv("LISTEN_HOST", "127.0.0.1"),
		Port:                   getEnv("APP_PORT", "8080"),
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://library:library@localhost:5432/library?sslmode=disable"),
		JWTSecret:              getEnv("JWT_SECRET", ""),
		StoragePath:            getEnv("STORAGE_PATH", "./storage"),
		MaxUploadSizeMB:        getEnvInt64("MAX_UPLOAD_SIZE_MB", 100),
		MultipartMemoryMB:      getEnvInt64("MULTIPART_MEMORY_MB", 8),
		TokenTTL:               time.Duration(getEnvInt64("TOKEN_TTL_HOURS", 24)) * time.Hour,
		CORSOrigins:            getEnvSlice("CORS_ORIGINS", "http://localhost:5173"),
		TrustedProxies:         getEnvSlice("TRUSTED_PROXIES", "127.0.0.1,::1"),
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
	return net.JoinHostPort(c.ListenHost, c.Port)
}

func (c Config) MaxUploadSizeBytes() int64 {
	return c.MaxUploadSizeMB * 1024 * 1024
}

func (c Config) MultipartMemoryBytes() int64 {
	memoryMB := c.MultipartMemoryMB
	if memoryMB <= 0 {
		memoryMB = 8
	}
	if c.MaxUploadSizeMB > 0 && memoryMB > c.MaxUploadSizeMB {
		memoryMB = c.MaxUploadSizeMB
	}
	return memoryMB * 1024 * 1024
}

// ValidateSecurity rejects configurations that make authentication forgeable.
// The bootstrap admin credentials are intentionally validated separately by the
// deployment procedure because they are changed immediately after first login.
func (c Config) ValidateSecurity() error {
	secret := strings.TrimSpace(c.JWTSecret)
	if secret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	if secret == "change-me-in-production" || strings.HasPrefix(strings.ToLower(secret), "replace-with") || len(secret) < 32 {
		return fmt.Errorf("JWT_SECRET must contain at least 32 characters and must not use the default value")
	}
	if c.MaxUploadSizeMB <= 0 {
		return fmt.Errorf("MAX_UPLOAD_SIZE_MB must be greater than zero")
	}
	return nil
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
