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

func TestSplitFilterTerms(t *testing.T) {
	terms := splitFilterTerms(" devops, pdf; DevOps  сеть ")
	expected := []string{"devops", "pdf", "сеть"}
	if len(terms) != len(expected) {
		t.Fatalf("expected %d terms, got %d: %#v", len(expected), len(terms), terms)
	}
	for index, expectedTerm := range expected {
		if terms[index] != expectedTerm {
			t.Fatalf("expected term %d to be %q, got %q", index, expectedTerm, terms[index])
		}
	}
}

func TestCreateAndApproveAdminImportSubmission(t *testing.T) {
	adminDSN := os.Getenv("TEST_DATABASE_URL")
	if strings.TrimSpace(adminDSN) == "" {
		adminDSN = "postgres://library:library@localhost:5433/library?sslmode=disable"
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

	var adminID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO users(username, password_hash, full_name, role)
		VALUES ('admin', 'hash', 'Admin', 'admin')
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
		Title:       "Imported Draft",
		Author:      "Admin",
		Year:        2026,
		Type:        "Методичка",
		Description: "Queued from import folder",
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

	if err := repo.CreateAuditEvent(ctx, domain.CreateAuditEventInput{
		Action:        "approve",
		ActorID:       adminID,
		DocumentID:    document.ID,
		SubmissionID:  submission.ID,
		DocumentTitle: document.Title,
		FileName:      document.FileName,
		Details: map[string]any{
			"source": domain.SubmissionSourceAdminImport,
		},
	}); err != nil {
		t.Fatalf("CreateAuditEvent() error = %v", err)
	}
	events, err := repo.ListDocumentAuditEvents(ctx, document.ID)
	if err != nil {
		t.Fatalf("ListDocumentAuditEvents() error = %v", err)
	}
	if len(events) != 1 || events[0].ActorUsername != "admin" || events[0].Action != "approve" {
		t.Fatalf("unexpected audit events: %#v", events)
	}

	types, err := repo.ListDocumentTypes(ctx)
	if err != nil {
		t.Fatalf("ListDocumentTypes() error = %v", err)
	}
	if len(types) != 1 || types[0] != "Методичка" {
		t.Fatalf("unexpected document types: %#v", types)
	}

	createdUser, err := repo.CreateAdminUser(ctx, domain.AdminUserInput{
		Username: "reader",
		FullName: "Reader",
		Role:     domain.RoleUser,
	}, "hash")
	if err != nil {
		t.Fatalf("CreateAdminUser() error = %v", err)
	}
	if !createdUser.IsActive {
		t.Fatal("expected created user to be active")
	}
	inactiveUser, err := repo.SetUserActive(ctx, createdUser.ID, false, "")
	if err != nil {
		t.Fatalf("SetUserActive() error = %v", err)
	}
	if inactiveUser.IsActive {
		t.Fatal("expected user to be inactive")
	}
	filteredUsers, err := repo.ListUsers(ctx, domain.UserFilters{Status: "inactive"})
	if err != nil {
		t.Fatalf("ListUsers() error = %v", err)
	}
	if len(filteredUsers.Items) != 1 || filteredUsers.Items[0].Username != "reader" {
		t.Fatalf("unexpected filtered users: %#v", filteredUsers)
	}
}

func TestEnsureSeedDataUpsertsAdminCredentials(t *testing.T) {
	adminDSN := os.Getenv("TEST_DATABASE_URL")
	if strings.TrimSpace(adminDSN) == "" {
		adminDSN = "postgres://library:library@localhost:5433/library?sslmode=disable"
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
		INSERT INTO users(username, password_hash, full_name, role)
		VALUES ('admin', $1, 'Legacy Admin', 'admin')
	`, oldHash); err != nil {
		t.Fatalf("insert legacy admin: %v", err)
	}

	newHash, err := auth.HashPassword("admin12345")
	if err != nil {
		t.Fatalf("HashPassword(new) error = %v", err)
	}

	if err := repo.EnsureSeedData(ctx, "admin", "Администратор", newHash); err != nil {
		t.Fatalf("EnsureSeedData() error = %v", err)
	}

	var passwordHash string
	var fullName string
	var role string
	if err := db.QueryRowContext(ctx, `
		SELECT password_hash, full_name, role
		FROM users
		WHERE username = 'admin'
	`).Scan(&passwordHash, &fullName, &role); err != nil {
		t.Fatalf("load admin after EnsureSeedData: %v", err)
	}

	if err := auth.ComparePassword(passwordHash, "admin12345"); err != nil {
		t.Fatalf("expected admin password to be updated to configured value: %v", err)
	}

	if fullName != "Администратор" {
		t.Fatalf("expected full name to be updated, got %q", fullName)
	}

	if role != "superadmin" {
		t.Fatalf("expected role superadmin, got %q", role)
	}
}

func TestListDocumentsSupportsEmptyAndTextSearch(t *testing.T) {
	adminDSN := os.Getenv("TEST_DATABASE_URL")
	if strings.TrimSpace(adminDSN) == "" {
		adminDSN = "postgres://library:library@localhost:5433/library?sslmode=disable"
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

	var userID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO users(username, password_hash, full_name, role)
		VALUES ('user@example.com', 'hash', 'User', 'user')
		RETURNING id
	`).Scan(&userID); err != nil {
		t.Fatalf("insert user: %v", err)
	}

	if _, err := repo.CreateDocument(ctx, domain.UpsertDocumentInput{
		Title:       "Распределенные системы",
		Author:      "Таненбаум",
		Year:        2026,
		Type:        "Учебник",
		Description: "Базовый курс",
		Tags:        []string{"распределенные", "сети"},
		FileName:    "ds.pdf",
		FilePath:    "pdfs/ds.pdf",
		FileSize:    1024,
		MimeType:    "application/pdf",
		CoverPath:   "covers/ds.png",
		IsLocal:     true,
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

	authorFilter, err := repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		Author:   "Танен",
		Page:     1,
		PageSize: 10,
		Sort:     "relevance",
	}, false)
	if err != nil {
		t.Fatalf("ListDocuments() by author filter error = %v", err)
	}
	if authorFilter.Total != 1 || len(authorFilter.Items) != 1 {
		t.Fatalf("expected author filter to find one document, got total=%d items=%d", authorFilter.Total, len(authorFilter.Items))
	}

	tagsFilter, err := repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		TagsQuery: "нет сети",
		Page:      1,
		PageSize:  10,
		Sort:      "relevance",
	}, false)
	if err != nil {
		t.Fatalf("ListDocuments() by tags filter error = %v", err)
	}
	if tagsFilter.Total != 1 || len(tagsFilter.Items) != 1 {
		t.Fatalf("expected tags filter to find one document, got total=%d items=%d", tagsFilter.Total, len(tagsFilter.Items))
	}

	tagSearch, err := repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		Query:    "сети",
		Page:     1,
		PageSize: 10,
		Sort:     "relevance",
	}, false)
	if err != nil {
		t.Fatalf("ListDocuments() by tag query error = %v", err)
	}
	if tagSearch.Total != 1 || len(tagSearch.Items) != 1 {
		t.Fatalf("expected tag query to find one document, got total=%d items=%d", tagSearch.Total, len(tagSearch.Items))
	}

	trueVal := true
	isLocalFilter, err := repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		IsLocal:  &trueVal,
		Page:     1,
		PageSize: 10,
	}, false)
	if err != nil {
		t.Fatalf("ListDocuments() by isLocal=true filter error = %v", err)
	}
	if isLocalFilter.Total != 1 || len(isLocalFilter.Items) != 1 {
		t.Fatalf("expected isLocal filter to find one document, got total=%d items=%d", isLocalFilter.Total, len(isLocalFilter.Items))
	}

	falseVal := false
	isLocalFalseFilter, err := repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		IsLocal:  &falseVal,
		Page:     1,
		PageSize: 10,
	}, false)
	if err != nil {
		t.Fatalf("ListDocuments() by isLocal=false filter error = %v", err)
	}
	if isLocalFalseFilter.Total != 0 || len(isLocalFalseFilter.Items) != 0 {
		t.Fatalf("expected isLocal false filter to find zero documents, got total=%d items=%d", isLocalFalseFilter.Total, len(isLocalFalseFilter.Items))
	}
}

func TestListSubmissionsByUserOrdersByUpdatedAtDesc(t *testing.T) {
	adminDSN := os.Getenv("TEST_DATABASE_URL")
	if strings.TrimSpace(adminDSN) == "" {
		adminDSN = "postgres://library:library@localhost:5433/library?sslmode=disable"
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
		INSERT INTO users(username, password_hash, full_name, role)
		VALUES ('reviewer@example.com', 'hash', 'Reviewer', 'admin')
		RETURNING id
	`).Scan(&reviewerID); err != nil {
		t.Fatalf("insert reviewer: %v", err)
	}

	var userID int64
	if err := db.QueryRowContext(ctx, `
		INSERT INTO users(username, password_hash, full_name, role)
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

func setupTestRepo(t *testing.T) (*Repository, *sql.DB, context.Context, context.CancelFunc) {
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
	dbName := fmt.Sprintf("library_repo_test_%d", time.Now().UnixNano())
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
	
	return New(db), db, ctx, cleanup
}

func TestDocumentCRUD(t *testing.T) {
	repo, db, ctx, cleanup := setupTestRepo(t)
	defer cleanup()

	var adminID int64
	err := db.QueryRowContext(ctx, "INSERT INTO users(username, password_hash, full_name, role) VALUES ('admin', 'hash', 'Admin', 'admin') RETURNING id").Scan(&adminID)
	if err != nil {
		t.Fatalf("insert admin: %v", err)
	}

	doc, err := repo.CreateDocument(ctx, domain.UpsertDocumentInput{
		Title:       "Test Book",
		Author:      "Test Author",
		Year:        2025,
		Type:        "Book",
		Description: "Test Desc",
		Tags:        []string{"test", "crud"},
		FileName:    "test.pdf",
		FilePath:    "pdfs/test.pdf",
		FileSize:    100,
		MimeType:    "application/pdf",
	})
	if err != nil {
		t.Fatalf("CreateDocument: %v", err)
	}
	if doc.ID == 0 {
		t.Fatal("expected valid ID")
	}

	fetched, err := repo.GetDocumentByID(ctx, adminID, doc.ID, true)
	if err != nil {
		t.Fatalf("GetDocument: %v", err)
	}
	if fetched.Title != "Test Book" {
		t.Fatalf("expected Title 'Test Book', got %q", fetched.Title)
	}

	updated, err := repo.UpdateDocument(ctx, doc.ID, domain.UpsertDocumentInput{
		Title:       "Updated Book",
		Author:      "Updated Author",
		Year:        2026,
		Type:        "Book",
		Description: "Test Desc",
		Tags:        []string{"updated"},
	})
	if err != nil {
		t.Fatalf("UpdateDocument: %v", err)
	}
	if updated.Title != "Updated Book" || len(updated.Tags) != 1 || updated.Tags[0] != "updated" {
		t.Fatalf("Update failed, got: %+v", updated)
	}

	err = repo.DeleteDocument(ctx, doc.ID)
	if err != nil {
		t.Fatalf("DeleteDocument: %v", err)
	}

	_, err = repo.GetDocumentByID(ctx, adminID, doc.ID, false)
	if err == nil || !strings.Contains(err.Error(), "not found") {
		t.Fatalf("expected not found error for regular mode, got: %v", err)
	}
}

func TestFavorites(t *testing.T) {
	repo, db, ctx, cleanup := setupTestRepo(t)
	defer cleanup()

	var userID int64
	db.QueryRowContext(ctx, "INSERT INTO users(username, password_hash, full_name, role) VALUES ('user1', 'hash', 'User1', 'user') RETURNING id").Scan(&userID)

	doc, _ := repo.CreateDocument(ctx, domain.UpsertDocumentInput{
		Title: "Fav Book", Author: "A", Year: 2026, Type: "B", FileName: "f.pdf", FilePath: "p/f.pdf",
	})

	err := repo.UpsertFavorite(ctx, userID, doc.ID, true)
	if err != nil {
		t.Fatalf("UpsertFavorite 1: %v", err)
	}

	favs, err := repo.ListFavorites(ctx, userID, 10)
	if err != nil {
		t.Fatalf("ListFavorites: %v", err)
	}
	if len(favs) != 1 || favs[0].ID != doc.ID {
		t.Fatalf("expected 1 favorite")
	}

	err = repo.UpsertFavorite(ctx, userID, doc.ID, false)
	if err != nil {
		t.Fatalf("UpsertFavorite 2: %v", err)
	}

	favs, _ = repo.ListFavorites(ctx, userID, 10)
	if len(favs) != 0 {
		t.Fatalf("expected 0 favorites")
	}
}
