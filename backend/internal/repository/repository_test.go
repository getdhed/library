package repository

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
)

func TestCreateAndApproveAdminImportSubmission(t *testing.T) {
	adminDSN := os.Getenv("TEST_DATABASE_URL")
	if strings.TrimSpace(adminDSN) == "" {
		adminDSN = "postgres://library:library@localhost:5432/postgres?sslmode=disable"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	adminDB, err := sql.Open("postgres", adminDSN)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer adminDB.Close()

	if err := adminDB.PingContext(ctx); err != nil {
		t.Skipf("skipping integration test, postgres unavailable: %v", err)
	}

	dbName := fmt.Sprintf("library_repo_test_%d", time.Now().UnixNano())
	if _, err := adminDB.ExecContext(ctx, `CREATE DATABASE `+dbName); err != nil {
		t.Fatalf("create test database: %v", err)
	}
	defer adminDB.ExecContext(context.Background(), `DROP DATABASE IF EXISTS `+dbName)

	testDSN := withDatabaseName(t, adminDSN, dbName)
	db, err := database.Open(ctx, testDSN)
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	if err := database.Migrate(ctx, db, logger); err != nil {
		t.Fatalf("database.Migrate() error = %v", err)
	}

	repo := New(db)

	var facultyID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO faculties(name, slug)
		VALUES ('Test Faculty', 'test-faculty')
		RETURNING id
	`).Scan(&facultyID); err != nil {
		t.Fatalf("insert faculty: %v", err)
	}

	var departmentID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO departments(faculty_id, name, slug)
		VALUES ($1, 'Test Department', 'test-department')
		RETURNING id
	`, facultyID).Scan(&departmentID); err != nil {
		t.Fatalf("insert department: %v", err)
	}

	var adminID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO users(email, password_hash, full_name, role)
		VALUES ('admin@example.com', 'hash', 'Admin', 'admin')
		RETURNING id
	`).Scan(&adminID); err != nil {
		t.Fatalf("insert admin: %v", err)
	}

	submission, err := repo.CreateSubmission(ctx, adminID, domain.CreateSubmissionInput{
		Title:     "Imported Draft",
		FileName:  "draft.pdf",
		FilePath:  "pdfs/draft.pdf",
		FileSize:  4096,
		MimeType:  "application/pdf",
		CoverPath: "covers/draft.png",
		Source:    domain.SubmissionSourceAdminImport,
	})
	if err != nil {
		t.Fatalf("CreateSubmission() error = %v", err)
	}

	if submission.Source != domain.SubmissionSourceAdminImport {
		t.Fatalf("expected admin_import source, got %q", submission.Source)
	}

	hasPendingDuplicate, err := repo.HasPendingSubmissionByFileName(ctx, "draft.pdf")
	if err != nil {
		t.Fatalf("HasPendingSubmissionByFileName() error = %v", err)
	}
	if !hasPendingDuplicate {
		t.Fatal("expected pending duplicate to be detected")
	}

	document, err := repo.ApproveSubmission(ctx, submission.ID, adminID, domain.UpsertDocumentInput{
		Title:        "Imported Draft",
		Author:       "Admin",
		Year:         2026,
		Type:         "Методичка",
		Description:  "Queued from import folder",
		DepartmentID: departmentID,
		IsVisible:    true,
	})
	if err != nil {
		t.Fatalf("ApproveSubmission() error = %v", err)
	}

	if document.ID == 0 {
		t.Fatal("expected approved document to have an id")
	}

	updatedSubmission, err := repo.GetSubmissionByID(ctx, submission.ID)
	if err != nil {
		t.Fatalf("GetSubmissionByID() error = %v", err)
	}

	if updatedSubmission.Status != domain.SubmissionStatusApproved {
		t.Fatalf("expected approved status, got %q", updatedSubmission.Status)
	}
	if updatedSubmission.ApprovedDocumentID != document.ID {
		t.Fatalf("expected approved document id %d, got %d", document.ID, updatedSubmission.ApprovedDocumentID)
	}
	if updatedSubmission.Source != domain.SubmissionSourceAdminImport {
		t.Fatalf("expected source to be preserved, got %q", updatedSubmission.Source)
	}

	hasPendingDuplicate, err = repo.HasPendingSubmissionByFileName(ctx, "draft.pdf")
	if err != nil {
		t.Fatalf("HasPendingSubmissionByFileName() after approve error = %v", err)
	}
	if hasPendingDuplicate {
		t.Fatal("expected no pending duplicate after approve")
	}

	hasCatalogDuplicate, err := repo.HasDocumentByFileName(ctx, "draft.pdf")
	if err != nil {
		t.Fatalf("HasDocumentByFileName() error = %v", err)
	}
	if !hasCatalogDuplicate {
		t.Fatal("expected catalog duplicate to be detected")
	}
}

func TestEnsureSeedDataUpsertsAdminCredentials(t *testing.T) {
	adminDSN := os.Getenv("TEST_DATABASE_URL")
	if strings.TrimSpace(adminDSN) == "" {
		adminDSN = "postgres://library:library@localhost:5432/postgres?sslmode=disable"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	adminDB, err := sql.Open("postgres", adminDSN)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer adminDB.Close()

	if err := adminDB.PingContext(ctx); err != nil {
		t.Skipf("skipping integration test, postgres unavailable: %v", err)
	}

	dbName := fmt.Sprintf("library_repo_test_%d", time.Now().UnixNano())
	if _, err := adminDB.ExecContext(ctx, `CREATE DATABASE `+dbName); err != nil {
		t.Fatalf("create test database: %v", err)
	}
	defer adminDB.ExecContext(context.Background(), `DROP DATABASE IF EXISTS `+dbName)

	testDSN := withDatabaseName(t, adminDSN, dbName)
	db, err := database.Open(ctx, testDSN)
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	if err := database.Migrate(ctx, db, logger); err != nil {
		t.Fatalf("database.Migrate() error = %v", err)
	}

	repo := New(db)

	oldHash, err := auth.HashPassword("legacy-pass")
	if err != nil {
		t.Fatalf("HashPassword(old) error = %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO users(email, password_hash, full_name, role)
		VALUES ('admin@library.local', $1, 'Legacy Admin', 'admin')
	`, oldHash); err != nil {
		t.Fatalf("insert legacy admin: %v", err)
	}

	newHash, err := auth.HashPassword("admin12345")
	if err != nil {
		t.Fatalf("HashPassword(new) error = %v", err)
	}

	if err := repo.EnsureSeedData(ctx, "admin@library.local", "Администратор", newHash); err != nil {
		t.Fatalf("EnsureSeedData() error = %v", err)
	}

	var passwordHash string
	var fullName string
	var role string
	if err := db.QueryRowContext(ctx, `
		SELECT password_hash, full_name, role
		FROM users
		WHERE email = 'admin@library.local'
	`).Scan(&passwordHash, &fullName, &role); err != nil {
		t.Fatalf("load admin after EnsureSeedData: %v", err)
	}

	if err := auth.ComparePassword(passwordHash, "admin12345"); err != nil {
		t.Fatalf("expected admin password to be updated to configured value: %v", err)
	}

	if fullName != "Администратор" {
		t.Fatalf("expected full name to be updated, got %q", fullName)
	}

	if role != "admin" {
		t.Fatalf("expected role admin, got %q", role)
	}
}

func TestListDocumentsSupportsEmptyAndTextSearch(t *testing.T) {
	adminDSN := os.Getenv("TEST_DATABASE_URL")
	if strings.TrimSpace(adminDSN) == "" {
		adminDSN = "postgres://library:library@localhost:5432/postgres?sslmode=disable"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	adminDB, err := sql.Open("postgres", adminDSN)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer adminDB.Close()

	if err := adminDB.PingContext(ctx); err != nil {
		t.Skipf("skipping integration test, postgres unavailable: %v", err)
	}

	dbName := fmt.Sprintf("library_repo_test_%d", time.Now().UnixNano())
	if _, err := adminDB.ExecContext(ctx, `CREATE DATABASE `+dbName); err != nil {
		t.Fatalf("create test database: %v", err)
	}
	defer adminDB.ExecContext(context.Background(), `DROP DATABASE IF EXISTS `+dbName)

	testDSN := withDatabaseName(t, adminDSN, dbName)
	db, err := database.Open(ctx, testDSN)
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	if err := database.Migrate(ctx, db, logger); err != nil {
		t.Fatalf("database.Migrate() error = %v", err)
	}

	repo := New(db)

	var facultyID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO faculties(name, slug)
		VALUES ('Search Faculty', 'search-faculty')
		RETURNING id
	`).Scan(&facultyID); err != nil {
		t.Fatalf("insert faculty: %v", err)
	}

	var departmentID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO departments(faculty_id, name, slug)
		VALUES ($1, 'Кафедра информационных систем', 'search-department')
		RETURNING id
	`, facultyID).Scan(&departmentID); err != nil {
		t.Fatalf("insert department: %v", err)
	}

	var userID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO users(email, password_hash, full_name, role)
		VALUES ('user@example.com', 'hash', 'User', 'user')
		RETURNING id
	`).Scan(&userID); err != nil {
		t.Fatalf("insert user: %v", err)
	}

	if _, err := repo.CreateDocument(ctx, domain.UpsertDocumentInput{
		Title:        "Распределенные системы",
		Author:       "Таненбаум",
		Year:         2026,
		Type:         "Учебник",
		Description:  "Базовый курс",
		DepartmentID: departmentID,
		FileName:     "ds.pdf",
		FilePath:     "pdfs/ds.pdf",
		FileSize:     1024,
		MimeType:     "application/pdf",
		CoverPath:    "covers/ds.png",
		IsVisible:    true,
	}); err != nil {
		t.Fatalf("CreateDocument() error = %v", err)
	}

	allDocuments, err := repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		Page:     1,
		PageSize: 10,
		Sort:     "relevance",
	}, false)
	if err != nil {
		t.Fatalf("ListDocuments() without query error = %v", err)
	}
	if allDocuments.Total != 1 || len(allDocuments.Items) != 1 {
		t.Fatalf("expected one visible document, got total=%d items=%d", allDocuments.Total, len(allDocuments.Items))
	}

	authorSearch, err := repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		Query:    "Таненбаум",
		Page:     1,
		PageSize: 10,
		Sort:     "relevance",
	}, false)
	if err != nil {
		t.Fatalf("ListDocuments() by author error = %v", err)
	}
	if authorSearch.Total != 1 || len(authorSearch.Items) != 1 {
		t.Fatalf("expected author search to find one document, got total=%d items=%d", authorSearch.Total, len(authorSearch.Items))
	}

	departmentSearch, err := repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		Query:    "информационных систем",
		Page:     1,
		PageSize: 10,
		Sort:     "relevance",
	}, false)
	if err != nil {
		t.Fatalf("ListDocuments() by department error = %v", err)
	}
	if departmentSearch.Total != 1 || len(departmentSearch.Items) != 1 {
		t.Fatalf("expected department search to find one document, got total=%d items=%d", departmentSearch.Total, len(departmentSearch.Items))
	}
}

func TestListSubmissionsByUserOrdersByUpdatedAtDesc(t *testing.T) {
	adminDSN := os.Getenv("TEST_DATABASE_URL")
	if strings.TrimSpace(adminDSN) == "" {
		adminDSN = "postgres://library:library@localhost:5432/postgres?sslmode=disable"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	adminDB, err := sql.Open("postgres", adminDSN)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer adminDB.Close()

	if err := adminDB.PingContext(ctx); err != nil {
		t.Skipf("skipping integration test, postgres unavailable: %v", err)
	}

	dbName := fmt.Sprintf("library_repo_test_%d", time.Now().UnixNano())
	if _, err := adminDB.ExecContext(ctx, `CREATE DATABASE `+dbName); err != nil {
		t.Fatalf("create test database: %v", err)
	}
	defer adminDB.ExecContext(context.Background(), `DROP DATABASE IF EXISTS `+dbName)

	testDSN := withDatabaseName(t, adminDSN, dbName)
	db, err := database.Open(ctx, testDSN)
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	if err := database.Migrate(ctx, db, logger); err != nil {
		t.Fatalf("database.Migrate() error = %v", err)
	}

	repo := New(db)

	var reviewerID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO users(email, password_hash, full_name, role)
		VALUES ('reviewer@example.com', 'hash', 'Reviewer', 'admin')
		RETURNING id
	`).Scan(&reviewerID); err != nil {
		t.Fatalf("insert reviewer: %v", err)
	}

	var userID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO users(email, password_hash, full_name, role)
		VALUES ('submitter@example.com', 'hash', 'Submitter', 'user')
		RETURNING id
	`).Scan(&userID); err != nil {
		t.Fatalf("insert submitter: %v", err)
	}

	firstSubmission, err := repo.CreateSubmission(ctx, userID, domain.CreateSubmissionInput{
		Title:     "First draft",
		FileName:  "first.pdf",
		FilePath:  "pdfs/first.pdf",
		FileSize:  1024,
		MimeType:  "application/pdf",
		CoverPath: "covers/first.png",
		Source:    domain.SubmissionSourceUserUpload,
	})
	if err != nil {
		t.Fatalf("CreateSubmission(first) error = %v", err)
	}

	time.Sleep(10 * time.Millisecond)

	secondSubmission, err := repo.CreateSubmission(ctx, userID, domain.CreateSubmissionInput{
		Title:     "Second draft",
		FileName:  "second.pdf",
		FilePath:  "pdfs/second.pdf",
		FileSize:  2048,
		MimeType:  "application/pdf",
		CoverPath: "covers/second.png",
		Source:    domain.SubmissionSourceUserUpload,
	})
	if err != nil {
		t.Fatalf("CreateSubmission(second) error = %v", err)
	}

	time.Sleep(10 * time.Millisecond)

	if _, err := repo.RejectSubmission(ctx, firstSubmission.ID, reviewerID, "Нужны правки"); err != nil {
		t.Fatalf("RejectSubmission() error = %v", err)
	}

	items, err := repo.ListSubmissionsByUser(ctx, userID)
	if err != nil {
		t.Fatalf("ListSubmissionsByUser() error = %v", err)
	}

	if len(items) != 2 {
		t.Fatalf("expected two submissions, got %d", len(items))
	}

	if items[0].ID != firstSubmission.ID {
		t.Fatalf("expected rejected submission %d first after update, got %d", firstSubmission.ID, items[0].ID)
	}

	if items[1].ID != secondSubmission.ID {
		t.Fatalf("expected untouched submission %d second, got %d", secondSubmission.ID, items[1].ID)
	}
}

func withDatabaseName(t *testing.T, dsn, dbName string) string {
	t.Helper()

	parsed, err := url.Parse(dsn)
	if err != nil {
		t.Fatalf("url.Parse() error = %v", err)
	}

	parsed.Path = "/" + dbName
	return parsed.String()
}
