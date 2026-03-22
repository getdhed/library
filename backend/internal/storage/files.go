package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type FileStorage struct {
	basePath string
}

func New(basePath string) *FileStorage {
	return &FileStorage{basePath: basePath}
}

func (s *FileStorage) Ensure() error {
	if err := os.MkdirAll(filepath.Join(s.basePath, "pdfs"), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(s.basePath, "covers"), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(s.basePath, "import"), 0o755); err != nil {
		return err
	}
	return nil
}

func (s *FileStorage) SavePDF(file multipart.File, header *multipart.FileHeader) (string, int64, error) {
	defer file.Close()

	filename := sanitizeName(strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename)))
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".pdf"
	}

	relativePath := filepath.Join("pdfs", fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), filename, ext))
	absolutePath := filepath.Join(s.basePath, relativePath)

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return "", 0, err
	}

	dst, err := os.Create(absolutePath)
	if err != nil {
		return "", 0, err
	}
	defer dst.Close()

	size, err := io.Copy(dst, file)
	if err != nil {
		return "", 0, err
	}

	return filepath.ToSlash(relativePath), size, nil
}

func (s *FileStorage) Resolve(relativePath string) string {
	return filepath.Join(s.basePath, filepath.FromSlash(relativePath))
}

func (s *FileStorage) CoverPathFor(relativePDFPath string) string {
	base := strings.TrimSuffix(filepath.Base(relativePDFPath), filepath.Ext(relativePDFPath))
	return filepath.ToSlash(filepath.Join("covers", base+".png"))
}

func (s *FileStorage) Delete(relativePath string) error {
	if strings.TrimSpace(relativePath) == "" {
		return nil
	}
	err := os.Remove(s.Resolve(relativePath))
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *FileStorage) ListImportPDFs(importPath string) ([]string, error) {
	items := []string{}
	err := filepath.Walk(importPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if strings.EqualFold(filepath.Ext(info.Name()), ".pdf") {
			items = append(items, path)
		}
		return nil
	})
	return items, err
}

func sanitizeName(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	replacer := strings.NewReplacer(" ", "-", "_", "-", ".", "-", ",", "-", "/", "-", "\\", "-")
	value = replacer.Replace(value)
	if value == "" {
		return "document"
	}
	return value
}
