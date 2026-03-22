package database

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
)

func TestMigrateAppliesSchemaAndIsIdempotent(t *testing.T) {
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

	dbName := fmt.Sprintf("library_test_%d", time.Now().UnixNano())
	if _, err := adminDB.ExecContext(ctx, `CREATE DATABASE `+dbName); err != nil {
		t.Fatalf("create test database: %v", err)
	}
	defer adminDB.ExecContext(context.Background(), `DROP DATABASE IF EXISTS `+dbName)

	testDSN := withDatabaseName(t, adminDSN, dbName)
	db, err := Open(ctx, testDSN)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	if err := Migrate(ctx, db, logger); err != nil {
		t.Fatalf("first Migrate() error = %v", err)
	}
	if err := Migrate(ctx, db, logger); err != nil {
		t.Fatalf("second Migrate() error = %v", err)
	}

	assertRelationExists(t, db, "users")
	assertRelationExists(t, db, "documents")
	assertRelationExists(t, db, "document_submissions")
	assertRelationExists(t, db, "goose_db_version")
	assertRelationExists(t, db, "idx_documents_title_trgm")
	assertRelationExists(t, db, "idx_document_submissions_user_created")
	assertRelationExists(t, db, "idx_document_submissions_status_created")
	assertColumnExists(t, db, "document_submissions", "source")
	assertRelationMissing(t, db, "favorite_aliases")
	assertRelationMissing(t, db, "idx_favorite_aliases_user_alias_trgm")
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

func assertRelationExists(t *testing.T, db *sql.DB, relation string) {
	t.Helper()

	var actual sql.NullString
	if err := db.QueryRow(`SELECT to_regclass($1)`, "public."+relation).Scan(&actual); err != nil {
		t.Fatalf("QueryRow() error = %v", err)
	}
	if !actual.Valid || actual.String == "" {
		t.Fatalf("expected relation %q to exist", relation)
	}
}

func assertRelationMissing(t *testing.T, db *sql.DB, relation string) {
	t.Helper()

	var actual sql.NullString
	if err := db.QueryRow(`SELECT to_regclass($1)`, "public."+relation).Scan(&actual); err != nil {
		t.Fatalf("QueryRow() error = %v", err)
	}
	if actual.Valid && actual.String != "" {
		t.Fatalf("expected relation %q to be missing", relation)
	}
}

func assertColumnExists(t *testing.T, db *sql.DB, table, column string) {
	t.Helper()

	var exists bool
	if err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
		)
	`, table, column).Scan(&exists); err != nil {
		t.Fatalf("QueryRow() error = %v", err)
	}
	if !exists {
		t.Fatalf("expected column %q.%q to exist", table, column)
	}
}
