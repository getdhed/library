package httpapi

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"library-backend/internal/auth"
	"library-backend/internal/config"
	"library-backend/internal/database"
	"library-backend/internal/domain"
	"library-backend/internal/preview"
	"library-backend/internal/repository"
	"library-backend/internal/service"
	"library-backend/internal/storage"
)

func withDatabaseName(t *testing.T, dsn, dbName string) string {
	t.Helper()

	parsed, err := url.Parse(dsn)
	if err != nil {
		t.Fatalf("url.Parse() error = %v", err)
	}

	parsed.Path = "/" + dbName
	return parsed.String()
}

func setupTestRouter(t *testing.T) (*gin.Engine, *sql.DB, context.Context, context.CancelFunc) {
	t.Helper()
	adminDSN := os.Getenv("TEST_DATABASE_URL")
	if strings.TrimSpace(adminDSN) == "" {
		adminDSN = "postgres://library:library@localhost:5433/library?sslmode=disable"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	adminDB, err := sql.Open("postgres", adminDSN)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	if err := adminDB.PingContext(ctx); err != nil {
		t.Skipf("skipping integration test, postgres unavailable: %v", err)
	}
	dbName := fmt.Sprintf("library_http_test_%d", time.Now().UnixNano())
	if _, err := adminDB.ExecContext(ctx, "CREATE DATABASE "+dbName); err != nil {
		t.Fatalf("create test database: %v", err)
	}
	testDSN := withDatabaseName(t, adminDSN, dbName)
	db, err := database.Open(ctx, testDSN)
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	if err := database.Migrate(ctx, db, logger); err != nil {
		t.Fatalf("database.Migrate() error = %v", err)
	}

	cleanup := func() {
		db.Close()
		adminDB.ExecContext(context.Background(), "DROP DATABASE IF EXISTS "+dbName)
		adminDB.Close()
		cancel()
	}

	repo := repository.New(db)
	fileStorage := storage.New(t.TempDir())
	renderer, _ := preview.New()
	
	cfg := config.Config{
		JWTSecret: "test-secret",
		TokenTTL:  24 * time.Hour,
	}
	
	tokens := auth.NewTokenManager("test-secret", 24*time.Hour)
	
	svc := service.New(repo, tokens, fileStorage, renderer)
	router := NewRouter(cfg, svc, logger)

	return router, db, ctx, cleanup
}

func TestHTTP_AuthFlow(t *testing.T) {
	router, _, _, cleanup := setupTestRouter(t)
	defer cleanup()

	// 1. Register user
	registerInput := domain.RegisterInput{
		Username: "newuser",
		Password: "password123",
		FullName: "New User",
	}
	body, _ := json.Marshal(registerInput)
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d. body: %s", w.Code, w.Body.String())
	}

	var authResponse domain.AuthPayload
	if err := json.Unmarshal(w.Body.Bytes(), &authResponse); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if authResponse.Token == "" {
		t.Fatalf("expected token, got empty")
	}

	// 2. Access protected endpoint /api/me
	req2, _ := http.NewRequest(http.MethodGet, "/api/me", nil)
	req2.Header.Set("Authorization", "Bearer "+authResponse.Token)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d. body: %s", w2.Code, w2.Body.String())
	}
	
	var userResponse domain.User
	if err := json.Unmarshal(w2.Body.Bytes(), &userResponse); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if userResponse.Username != "newuser" {
		t.Fatalf("expected username 'newuser', got %s", userResponse.Username)
	}
}

func TestHTTP_Home(t *testing.T) {
	router, _, _, cleanup := setupTestRouter(t)
	defer cleanup()

	// Need to register and login first
	registerInput := domain.RegisterInput{
		Username: "homeuser",
		Password: "password123",
		FullName: "Home User",
	}
	body, _ := json.Marshal(registerInput)
	req1, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	
	var authResponse domain.AuthPayload
	json.Unmarshal(w1.Body.Bytes(), &authResponse)

	req, _ := http.NewRequest(http.MethodGet, "/api/home", nil)
	req.Header.Set("Authorization", "Bearer "+authResponse.Token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d. body: %s", w.Code, w.Body.String())
	}
}

func TestHTTP_AdminProtect(t *testing.T) {
	router, db, _, cleanup := setupTestRouter(t)
	defer cleanup()

	// Register normal user
	registerInput := domain.RegisterInput{
		Username: "normaluser",
		Password: "password123",
		FullName: "Normal User",
	}
	body, _ := json.Marshal(registerInput)
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	var authResponse domain.AuthPayload
	json.Unmarshal(w.Body.Bytes(), &authResponse)

	// Access admin endpoint
	req2, _ := http.NewRequest(http.MethodGet, "/api/admin/users", nil)
	req2.Header.Set("Authorization", "Bearer "+authResponse.Token)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 Forbidden, got %d", w2.Code)
	}

	// Register admin user directly via DB since API doesn't allow registering admins directly
	var adminID int64
	db.QueryRow("INSERT INTO users(username, password_hash, full_name, role) VALUES ('admin2', 'hash', 'Admin', 'admin') RETURNING id").Scan(&adminID)

	// Actually, easier to use auth.TokenManager to generate a token for admin2
	tokens := auth.NewTokenManager("test-secret", 24*time.Hour)
	adminToken, _ := tokens.Create(domain.User{ID: adminID, Role: domain.RoleAdmin})

	req3, _ := http.NewRequest(http.MethodGet, "/api/admin/users", nil)
	req3.Header.Set("Authorization", "Bearer "+adminToken)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)

	if w3.Code != http.StatusOK {
		t.Fatalf("expected status 200 OK for admin, got %d", w3.Code)
	}
}

func TestHTTP_DocumentTypes(t *testing.T) {
	router, _, _, cleanup := setupTestRouter(t)
	defer cleanup()

	req, _ := http.NewRequest(http.MethodGet, "/api/catalog/document-types", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 OK, got %d", w.Code)
	}
}

func TestHTTP_AdminStats(t *testing.T) {
	router, db, _, cleanup := setupTestRouter(t)
	defer cleanup()

	var adminID int64
	db.QueryRow("INSERT INTO users(username, password_hash, full_name, role) VALUES ('admin3', 'hash', 'Admin', 'admin') RETURNING id").Scan(&adminID)

	tokens := auth.NewTokenManager("test-secret", 24*time.Hour)
	adminToken, _ := tokens.Create(domain.User{ID: adminID, Role: domain.RoleAdmin})

	req, _ := http.NewRequest(http.MethodGet, "/api/admin/stats", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 OK, got %d. body: %s", w.Code, w.Body.String())
	}
}

func TestHTTP_ListDocuments(t *testing.T) {
	router, db, _, cleanup := setupTestRouter(t)
	defer cleanup()

	var userID int64
	db.QueryRow("INSERT INTO users(username, password_hash, full_name, role) VALUES ('user4', 'hash', 'User', 'user') RETURNING id").Scan(&userID)

	tokens := auth.NewTokenManager("test-secret", 24*time.Hour)
	token, _ := tokens.Create(domain.User{ID: userID, Role: domain.RoleUser})

	req, _ := http.NewRequest(http.MethodGet, "/api/documents", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 OK, got %d. body: %s", w.Code, w.Body.String())
	}
}
