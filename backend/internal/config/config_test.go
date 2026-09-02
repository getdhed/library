package config

import (
	"os"
	"reflect"
	"testing"
	"time"
)

func TestLoadUsesDefaults(t *testing.T) {
	t.Setenv("LISTEN_HOST", "")
	t.Setenv("APP_PORT", "")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("JWT_SECRET", "")
	t.Setenv("STORAGE_PATH", "")
	t.Setenv("MAX_UPLOAD_SIZE_MB", "")
	t.Setenv("MULTIPART_MEMORY_MB", "")
	t.Setenv("TOKEN_TTL_HOURS", "")
	t.Setenv("CORS_ORIGINS", "")
	t.Setenv("TRUSTED_PROXIES", "")
	t.Setenv("SEED_ADMIN_USERNAME", "")
	t.Setenv("SEED_ADMIN_NAME", "")
	t.Setenv("SEED_ADMIN_PASSWORD", "")
	t.Setenv("LOG_LEVEL", "")
	t.Setenv("LOG_FORMAT", "")

	cfg := Load()

	if cfg.Address() != "127.0.0.1:8080" {
		t.Fatalf("unexpected default address: %q", cfg.Address())
	}
	if cfg.Port != "8080" {
		t.Fatalf("expected default port, got %q", cfg.Port)
	}
	if cfg.LogLevel != "info" {
		t.Fatalf("expected default log level info, got %q", cfg.LogLevel)
	}
	if cfg.LogFormat != "text" {
		t.Fatalf("expected default log format text, got %q", cfg.LogFormat)
	}
	if cfg.TokenTTL != 24*time.Hour {
		t.Fatalf("expected default token ttl, got %v", cfg.TokenTTL)
	}
	if cfg.MaxUploadSizeBytes() != 100*1024*1024 {
		t.Fatalf("unexpected max upload bytes: %d", cfg.MaxUploadSizeBytes())
	}
	if cfg.MultipartMemoryBytes() != 8*1024*1024 {
		t.Fatalf("unexpected multipart memory bytes: %d", cfg.MultipartMemoryBytes())
	}
	expectedProxies := []string{"127.0.0.1", "::1"}
	if !reflect.DeepEqual(cfg.TrustedProxies, expectedProxies) {
		t.Fatalf("unexpected trusted proxies: %#v", cfg.TrustedProxies)
	}
}

func TestLoadParsesCustomValues(t *testing.T) {
	t.Setenv("LISTEN_HOST", "0.0.0.0")
	t.Setenv("APP_PORT", "9000")
	t.Setenv("DATABASE_URL", "postgres://custom")
	t.Setenv("JWT_SECRET", "top-secret")
	t.Setenv("STORAGE_PATH", "/tmp/storage")
	t.Setenv("MAX_UPLOAD_SIZE_MB", "12")
	t.Setenv("MULTIPART_MEMORY_MB", "4")
	t.Setenv("TOKEN_TTL_HOURS", "24")
	t.Setenv("CORS_ORIGINS", "http://one.local, http://two.local")
	t.Setenv("TRUSTED_PROXIES", "127.0.0.1, 10.0.0.0/8")
	t.Setenv("SEED_ADMIN_USERNAME", "admin2")
	t.Setenv("SEED_ADMIN_NAME", "Admin")
	t.Setenv("SEED_ADMIN_PASSWORD", "pass")
	t.Setenv("LOG_LEVEL", "WARN")
	t.Setenv("LOG_FORMAT", "JSON")

	cfg := Load()

	if cfg.Address() != "0.0.0.0:9000" {
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
	if cfg.MultipartMemoryBytes() != 4*1024*1024 {
		t.Fatalf("unexpected multipart memory bytes: %d", cfg.MultipartMemoryBytes())
	}
	if cfg.TokenTTL != 24*time.Hour {
		t.Fatalf("unexpected token ttl: %v", cfg.TokenTTL)
	}
	expectedOrigins := []string{"http://one.local", "http://two.local"}
	if !reflect.DeepEqual(cfg.CORSOrigins, expectedOrigins) {
		t.Fatalf("unexpected cors origins: %#v", cfg.CORSOrigins)
	}
	expectedProxies := []string{"127.0.0.1", "10.0.0.0/8"}
	if !reflect.DeepEqual(cfg.TrustedProxies, expectedProxies) {
		t.Fatalf("unexpected trusted proxies: %#v", cfg.TrustedProxies)
	}
}

func TestValidateSecurity(t *testing.T) {
	valid := Config{JWTSecret: "0123456789abcdef0123456789abcdef", MaxUploadSizeMB: 1}
	if err := valid.ValidateSecurity(); err != nil {
		t.Fatalf("ValidateSecurity() error = %v", err)
	}

	for _, secret := range []string{"", "change-me-in-production", "replace-with-an-independent-random-secret-at-least-32-characters", "too-short"} {
		cfg := Config{JWTSecret: secret, MaxUploadSizeMB: 1}
		if err := cfg.ValidateSecurity(); err == nil {
			t.Fatalf("expected JWT secret %q to be rejected", secret)
		}
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
