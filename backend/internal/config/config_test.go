package config

import (
	"os"
	"reflect"
	"testing"
	"time"
)

func TestLoadUsesDefaults(t *testing.T) {
	t.Setenv("APP_PORT", "")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("JWT_SECRET", "")
	t.Setenv("STORAGE_PATH", "")
	t.Setenv("IMPORT_PATH", "")
	t.Setenv("MAX_UPLOAD_SIZE_MB", "")
	t.Setenv("TOKEN_TTL_HOURS", "")
	t.Setenv("CORS_ORIGINS", "")
	t.Setenv("SEED_ADMIN_EMAIL", "")
	t.Setenv("SEED_ADMIN_NAME", "")
	t.Setenv("SEED_ADMIN_PASSWORD", "")
	t.Setenv("LOG_LEVEL", "")
	t.Setenv("LOG_FORMAT", "")

	cfg := Load()

	if cfg.Port != "8080" {
		t.Fatalf("expected default port, got %q", cfg.Port)
	}
	if cfg.LogLevel != "info" {
		t.Fatalf("expected default log level info, got %q", cfg.LogLevel)
	}
	if cfg.LogFormat != "text" {
		t.Fatalf("expected default log format text, got %q", cfg.LogFormat)
	}
	if cfg.TokenTTL != 72*time.Hour {
		t.Fatalf("expected default token ttl, got %v", cfg.TokenTTL)
	}
	if cfg.MaxUploadSizeBytes() != 100*1024*1024 {
		t.Fatalf("unexpected max upload bytes: %d", cfg.MaxUploadSizeBytes())
	}
}

func TestLoadParsesCustomValues(t *testing.T) {
	t.Setenv("APP_PORT", "9000")
	t.Setenv("DATABASE_URL", "postgres://custom")
	t.Setenv("JWT_SECRET", "top-secret")
	t.Setenv("STORAGE_PATH", "/tmp/storage")
	t.Setenv("IMPORT_PATH", "/tmp/import")
	t.Setenv("MAX_UPLOAD_SIZE_MB", "12")
	t.Setenv("TOKEN_TTL_HOURS", "24")
	t.Setenv("CORS_ORIGINS", "http://one.local, http://two.local")
	t.Setenv("SEED_ADMIN_EMAIL", "admin@example.com")
	t.Setenv("SEED_ADMIN_NAME", "Admin")
	t.Setenv("SEED_ADMIN_PASSWORD", "pass")
	t.Setenv("LOG_LEVEL", "WARN")
	t.Setenv("LOG_FORMAT", "JSON")

	cfg := Load()

	if cfg.Address() != ":9000" {
		t.Fatalf("unexpected address: %q", cfg.Address())
	}
	if cfg.DatabaseURL != "postgres://custom" {
		t.Fatalf("unexpected database url: %q", cfg.DatabaseURL)
	}
	if cfg.LogLevel != "warn" || cfg.LogFormat != "json" {
		t.Fatalf("unexpected logging config: %q / %q", cfg.LogLevel, cfg.LogFormat)
	}
	if cfg.MaxUploadSizeMB != 12 {
		t.Fatalf("unexpected max upload size mb: %d", cfg.MaxUploadSizeMB)
	}
	if cfg.TokenTTL != 24*time.Hour {
		t.Fatalf("unexpected token ttl: %v", cfg.TokenTTL)
	}
	expectedOrigins := []string{"http://one.local", "http://two.local"}
	if !reflect.DeepEqual(cfg.CORSOrigins, expectedOrigins) {
		t.Fatalf("unexpected cors origins: %#v", cfg.CORSOrigins)
	}
}

func TestGetEnvInt64PanicsOnInvalidValue(t *testing.T) {
	t.Setenv("BROKEN_INT", "abc")

	defer func() {
		if recover() == nil {
			t.Fatal("expected panic for invalid integer env")
		}
	}()

	_ = getEnvInt64("BROKEN_INT", 1)
}

func TestGetEnvPrefersFallbackForWhitespace(t *testing.T) {
	if err := os.Setenv("EMPTY_VALUE", "   "); err != nil {
		t.Fatalf("Setenv() error = %v", err)
	}
	defer os.Unsetenv("EMPTY_VALUE")

	if value := getEnv("EMPTY_VALUE", "fallback"); value != "fallback" {
		t.Fatalf("expected fallback, got %q", value)
	}
}
