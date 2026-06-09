package service

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"library-backend/internal/auth"
	"library-backend/internal/database"
	"library-backend/internal/domain"
	"library-backend/internal/preview"
	"library-backend/internal/repository"
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

func setupTestService(t *testing.T) (*Service, *sql.DB, context.Context, context.CancelFunc) {
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
	dbName := fmt.Sprintf("library_svc_test_%d", time.Now().UnixNano())
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
	// We can use a mock pdfService and previewRenderer or pass nil if they are not strictly needed
	// for the methods we test (ProposeSubmission and ApproveSubmission only use repository)
	fileStorage := storage.New(t.TempDir())
	renderer, _ := preview.New()
	tokenManager := auth.NewTokenManager("testsecret", 24*time.Hour)
	svc := New(repo, tokenManager, fileStorage, renderer)
	return svc, db, ctx, cleanup
}

func TestService_SubmissionFlow(t *testing.T) {
	svc, db, ctx, cleanup := setupTestService(t)
	defer cleanup()

	var adminID int64
	err := db.QueryRowContext(ctx, "INSERT INTO users(username, password_hash, full_name, role) VALUES ('admin', 'hash', 'Admin', 'admin') RETURNING id").Scan(&adminID)
	if err != nil {
		t.Fatalf("insert admin: %v", err)
	}

	var userID int64
	err = db.QueryRowContext(ctx, "INSERT INTO users(username, password_hash, full_name, role) VALUES ('user', 'hash', 'User', 'user') RETURNING id").Scan(&userID)
	if err != nil {
		t.Fatalf("insert user: %v", err)
	}

	submission, err := svc.CreateSubmission(ctx, userID, domain.CreateSubmissionInput{
		Title:     "Proposed Document",
		FileName:  "prop.pdf",
		FilePath:  "", // skip generating cover
		FileSize:  1024,
		MimeType:  "application/pdf",
		CoverPath: "",
	})
	if err != nil {
		t.Fatalf("CreateSubmission: %v", err)
	}
	if submission.Status != domain.SubmissionStatusPending {
		t.Fatalf("expected pending status")
	}

	doc, err := svc.ApproveSubmission(ctx, submission.ID, adminID, domain.UpsertDocumentInput{
		Title:       "Approved Document",
		Author:      "Author",
		Year:        2026,
		Type:        "Book",
		Description: "A proposed book",
		FileName:    "prop.pdf",
		FilePath:    "pdfs/prop.pdf",
	})
	if err != nil {
		t.Fatalf("ApproveSubmission: %v", err)
	}
	if doc.Title != "Approved Document" {
		t.Fatalf("unexpected title: %s", doc.Title)
	}

	updatedSub, err := svc.GetSubmission(ctx, adminID, domain.RoleAdmin, submission.ID)
	if err != nil {
		t.Fatalf("GetSubmissionByID: %v", err)
	}
	if updatedSub.Status != domain.SubmissionStatusApproved {
		t.Fatalf("expected approved status")
	}
	if updatedSub.ApprovedDocumentID != doc.ID {
		t.Fatalf("expected approved document ID to be set")
	}
}
