package logging

import (
	"io"
	"log/slog"
	"os"
	"strings"

	"library-backend/internal/config"
)

func New(cfg config.Config) *slog.Logger {
	return NewWithWriter(cfg, os.Stdout)
}

func NewWithWriter(cfg config.Config, writer io.Writer) *slog.Logger {
	level := parseLevel(cfg.LogLevel)

	options := &slog.HandlerOptions{
		Level: level,
	}

	switch strings.ToLower(cfg.LogFormat) {
	case "json":
		return slog.New(slog.NewJSONHandler(writer, options))
	default:
		return slog.New(slog.NewTextHandler(writer, options))
	}
}

func parseLevel(raw string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
