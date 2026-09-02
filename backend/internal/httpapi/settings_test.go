package httpapi

import (
	"bytes"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"

	"library-backend/internal/service"
	"library-backend/internal/storage"
)

func settingsTestHandler(t *testing.T) (*Handler, string) {
	t.Helper()
	basePath := t.TempDir()
	files := storage.New(basePath)
	if err := files.Ensure(); err != nil {
		t.Fatalf("ensure storage: %v", err)
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return &Handler{service: service.New(nil, nil, files, nil), logger: logger}, basePath
}

func backgroundUploadRequest(t *testing.T, contentType string, payload []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreatePart(textproto.MIMEHeader{
		"Content-Disposition": {`form-data; name="image"; filename="background.png"`},
		"Content-Type":        {contentType},
	})
	if err != nil {
		t.Fatalf("create multipart part: %v", err)
	}
	if _, err := part.Write(payload); err != nil {
		t.Fatalf("write multipart payload: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/background", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	return request
}

func TestBackgroundUploadRejectsSpoofedImageContentType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, basePath := settingsTestHandler(t)
	router := gin.New()
	router.POST("/background", handler.uploadBackground)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, backgroundUploadRequest(t, "image/png", []byte("<html><script>alert(1)</script></html>")))

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", response.Code)
	}
	if _, err := os.Stat(filepath.Join(basePath, "settings", "background")); !os.IsNotExist(err) {
		t.Fatalf("invalid background was stored: %v", err)
	}
}

func TestBackgroundUploadAndServeUseDetectedImageType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _ := settingsTestHandler(t)
	router := gin.New()
	router.POST("/background", handler.uploadBackground)
	router.GET("/background", handler.serveBackground)

	png := []byte{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0}
	uploadResponse := httptest.NewRecorder()
	router.ServeHTTP(uploadResponse, backgroundUploadRequest(t, "text/html", png))
	if uploadResponse.Code != http.StatusOK {
		t.Fatalf("expected upload status 200, got %d: %s", uploadResponse.Code, uploadResponse.Body.String())
	}

	serveResponse := httptest.NewRecorder()
	router.ServeHTTP(serveResponse, httptest.NewRequest(http.MethodGet, "/background", nil))
	if serveResponse.Code != http.StatusOK {
		t.Fatalf("expected serve status 200, got %d", serveResponse.Code)
	}
	if got := serveResponse.Header().Get("Content-Type"); got != "image/png" {
		t.Fatalf("expected image/png, got %q", got)
	}
	if got := serveResponse.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("expected nosniff header, got %q", got)
	}
	if !bytes.Equal(serveResponse.Body.Bytes(), png) {
		t.Fatal("served background differs from uploaded payload")
	}
}
