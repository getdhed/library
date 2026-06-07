package demopdf

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteDemoPDFsCreatesTwentyFiles(t *testing.T) {
	targetDir := t.TempDir()

	count, err := WriteDemoPDFs(targetDir)
	if err != nil {
		t.Fatalf("WriteDemoPDFs() error = %v", err)
	}
	if count != 20 {
		t.Fatalf("expected 20 files, got %d", count)
	}

	items, err := os.ReadDir(targetDir)
	if err != nil {
		t.Fatalf("ReadDir() error = %v", err)
	}
	if len(items) != 20 {
		t.Fatalf("expected 20 generated files, got %d", len(items))
	}

	firstPath := filepath.Join(targetDir, items[0].Name())
	content, err := os.ReadFile(firstPath)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if !strings.HasPrefix(string(content), "%PDF-1.4") {
		t.Fatalf("expected valid PDF header, got %q", string(content[:8]))
	}
}

