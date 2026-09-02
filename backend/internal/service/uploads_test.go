package service

import (
	"mime/multipart"
	"net/textproto"
	"os"
	"path/filepath"
	"testing"

	"library-backend/internal/apperror"
	"library-backend/internal/storage"
)

func uploadFile(t *testing.T, contents string) multipart.File {
	t.Helper()
	file, err := os.CreateTemp(t.TempDir(), "upload-*.tmp")
	if err != nil {
		t.Fatalf("CreateTemp() error = %v", err)
	}
	if _, err := file.WriteString(contents); err != nil {
		t.Fatalf("WriteString() error = %v", err)
	}
	if _, err := file.Seek(0, 0); err != nil {
		t.Fatalf("Seek() error = %v", err)
	}
	return file
}

func TestSaveMultipartFileRejectsNonPDF(t *testing.T) {
	files := storage.New(t.TempDir())
	if err := files.Ensure(); err != nil {
		t.Fatalf("Ensure() error = %v", err)
	}
	svc := &Service{files: files}

	file := uploadFile(t, "<html>not a pdf</html>")
	_, _, _, err := svc.SaveMultipartFile(file, &multipart.FileHeader{Filename: "payload.pdf"})
	if err != apperror.ErrInvalidInput {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestSaveMultipartFileForcesSafeMetadata(t *testing.T) {
	files := storage.New(t.TempDir())
	if err := files.Ensure(); err != nil {
		t.Fatalf("Ensure() error = %v", err)
	}
	svc := &Service{files: files}

	file := uploadFile(t, "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF")
	header := &multipart.FileHeader{Filename: "REPORT.PDF", Header: textproto.MIMEHeader{"Content-Type": {"text/html"}}}
	relative, _, contentType, err := svc.SaveMultipartFile(file, header)
	if err != nil {
		t.Fatalf("SaveMultipartFile() error = %v", err)
	}
	if filepath.Ext(relative) != ".pdf" {
		t.Fatalf("expected .pdf path, got %q", relative)
	}
	if contentType != "application/pdf" {
		t.Fatalf("expected application/pdf, got %q", contentType)
	}
}
