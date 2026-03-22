package logging

import (
	"bytes"
	"strings"
	"testing"

	"library-backend/internal/config"
)

func TestNewWithWriterUsesJSONFormat(t *testing.T) {
	var output bytes.Buffer
	logger := NewWithWriter(config.Config{LogLevel: "debug", LogFormat: "json"}, &output)

	logger.Debug("hello", "key", "value")

	if !strings.Contains(output.String(), `"msg":"hello"`) {
		t.Fatalf("expected json output, got %q", output.String())
	}
}

func TestNewWithWriterFallsBackToText(t *testing.T) {
	var output bytes.Buffer
	logger := NewWithWriter(config.Config{LogLevel: "info", LogFormat: "unknown"}, &output)

	logger.Info("hello")

	if !strings.Contains(output.String(), "msg=hello") {
		t.Fatalf("expected text output, got %q", output.String())
	}
}
