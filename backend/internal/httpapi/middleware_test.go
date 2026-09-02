package httpapi

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestLoggerLogsSuccessfulRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var output bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&output, nil))
	router := gin.New()
	router.Use(requestLogger(logger))
	router.GET("/health", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", recorder.Code)
	}
	if !strings.Contains(output.String(), "request completed") {
		t.Fatalf("expected request log output, got %q", output.String())
	}
}

func TestRecoveryLoggerReturns500AndLogsPanic(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var output bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&output, nil))
	router := gin.New()
	router.Use(recoveryLogger(logger))
	router.GET("/panic", func(c *gin.Context) {
		panic("boom")
	})

	request := httptest.NewRequest(http.MethodGet, "/panic", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", recorder.Code)
	}
	if !strings.Contains(output.String(), "panic recovered") {
		t.Fatalf("expected panic log output, got %q", output.String())
	}
}

func TestBodySizeMiddlewareUsesSmallerLimitForJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(bodySizeMiddleware(3 * 1024 * 1024))
	router.POST("/upload", func(c *gin.Context) {
		if _, err := io.ReadAll(c.Request.Body); err != nil {
			c.Status(http.StatusRequestEntityTooLarge)
			return
		}
		c.Status(http.StatusNoContent)
	})

	payload := bytes.Repeat([]byte("x"), 2*1024*1024)
	jsonRequest := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewReader(payload))
	jsonRequest.Header.Set("Content-Type", "application/json")
	jsonResponse := httptest.NewRecorder()
	router.ServeHTTP(jsonResponse, jsonRequest)
	if jsonResponse.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected JSON body to be limited, got %d", jsonResponse.Code)
	}

	multipartRequest := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewReader(payload))
	multipartRequest.Header.Set("Content-Type", "multipart/form-data; boundary=test")
	multipartResponse := httptest.NewRecorder()
	router.ServeHTTP(multipartResponse, multipartRequest)
	if multipartResponse.Code != http.StatusNoContent {
		t.Fatalf("expected multipart body below upload limit to pass, got %d", multipartResponse.Code)
	}
}

func TestAuthorizationBearerTokenIgnoresQueryParameter(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/documents/1/file?token=query-secret", nil)
	if token := authorizationBearerToken(request); token != "" {
		t.Fatalf("expected query token to be ignored, got %q", token)
	}

	request.Header.Set("Authorization", "Bearer header-secret")
	if token := authorizationBearerToken(request); token != "header-secret" {
		t.Fatalf("expected bearer token from Authorization header, got %q", token)
	}
}
