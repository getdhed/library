package storage

import (
	"bytes"
	"errors"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type failingMultipartFile struct {
	reader *bytes.Reader
}

func (f *failingMultipartFile) Read(_ []byte) (int, error) {
	return 0, errors.New("forced read failure")
}

func (f *failingMultipartFile) ReadAt(p []byte, off int64) (int, error) {
	return f.reader.ReadAt(p, off)
}

func (f *failingMultipartFile) Seek(offset int64, whence int) (int64, error) {
	return f.reader.Seek(offset, whence)
}

func (f *failingMultipartFile) Close() error { return nil }

func TestSavePDFAlwaysUsesPDFExtension(t *testing.T) {
	store := New(t.TempDir())
	if err := store.Ensure(); err != nil {
		t.Fatalf("Ensure() error = %v", err)
	}

	file, err := os.CreateTemp(t.TempDir(), "upload-*.tmp")
	if err != nil {
		t.Fatalf("CreateTemp() error = %v", err)
	}
	if _, err := file.WriteString("%PDF-1.7\n%%EOF"); err != nil {
		t.Fatalf("WriteString() error = %v", err)
	}
	if _, err := file.Seek(0, 0); err != nil {
		t.Fatalf("Seek() error = %v", err)
	}

	relative, _, err := store.SavePDF(file, &multipart.FileHeader{Filename: "report.html"})
	if err != nil {
		t.Fatalf("SavePDF() error = %v", err)
	}
	if !strings.HasSuffix(relative, ".pdf") {
		t.Fatalf("expected .pdf path, got %q", relative)
	}
}

func TestSavePDFRemovesPartialFileAfterFailure(t *testing.T) {
	basePath := t.TempDir()
	store := New(basePath)
	if err := store.Ensure(); err != nil {
		t.Fatalf("Ensure() error = %v", err)
	}

	file := &failingMultipartFile{reader: bytes.NewReader([]byte("%PDF-1.7"))}
	if _, _, err := store.SavePDF(file, &multipart.FileHeader{Filename: "report.pdf"}); err == nil {
		t.Fatal("expected SavePDF() to fail")
	}

	partials, err := filepath.Glob(filepath.Join(basePath, "pdfs", "*.part"))
	if err != nil {
		t.Fatalf("Glob() error = %v", err)
	}
	if len(partials) != 0 {
		t.Fatalf("expected partial upload cleanup, found %#v", partials)
	}
}

func TestBootstrapMarkerPersistsInStorage(t *testing.T) {
	store := New(t.TempDir())
	if err := store.Ensure(); err != nil {
		t.Fatalf("Ensure() error = %v", err)
	}

	completed, err := store.BootstrapCompleted()
	if err != nil {
		t.Fatalf("BootstrapCompleted() error = %v", err)
	}
	if completed {
		t.Fatal("new storage unexpectedly has a bootstrap marker")
	}

	if err := store.MarkBootstrapCompleted(); err != nil {
		t.Fatalf("MarkBootstrapCompleted() error = %v", err)
	}
	completed, err = store.BootstrapCompleted()
	if err != nil {
		t.Fatalf("BootstrapCompleted() after mark error = %v", err)
	}
	if !completed {
		t.Fatal("bootstrap marker was not persisted")
	}
}
