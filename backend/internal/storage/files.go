package storage

import (
	"fmt"
	"io"
	"mime"
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
	if err := os.MkdirAll(filepath.Join(s.basePath, "import", "skipped"), 0o755); err != nil {
		return err
	}
	return nil
}

func (s *FileStorage) SavePDF(file multipart.File, header *multipart.FileHeader) (string, int64, error) {
	defer file.Close()

	relativePath, absolutePath := s.newPDFPath(header.Filename)

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

func (s *FileStorage) IngestPDF(sourcePath string) (string, int64, string, error) {
	source, err := os.Open(sourcePath)
	if err != nil {
		return "", 0, "", err
	}
	defer source.Close()

	relativePath, absolutePath := s.newPDFPath(filepath.Base(sourcePath))
	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return "", 0, "", err
	}

	target, err := os.Create(absolutePath)
	if err != nil {
		return "", 0, "", err
	}
	defer target.Close()

	size, err := io.Copy(target, source)
	if err != nil {
		return "", 0, "", err
	}

	contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(sourcePath)))
	if contentType == "" {
		contentType = "application/pdf"
	}

	return filepath.ToSlash(relativePath), size, contentType, nil
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

func (s *FileStorage) MoveImportFileToSkipped(sourcePath string) (string, error) {
	targetDir := filepath.Join(s.basePath, "import", "skipped")
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return "", err
	}

	fileName := filepath.Base(sourcePath)
	targetPath := filepath.Join(targetDir, fmt.Sprintf("%d-%s", time.Now().UnixNano(), fileName))
	if err := os.Rename(sourcePath, targetPath); err == nil {
		return targetPath, nil
	}

	source, err := os.Open(sourcePath)
	if err != nil {
		return "", err
	}
	defer source.Close()

	target, err := os.Create(targetPath)
	if err != nil {
		return "", err
	}
	defer target.Close()

	if _, err := io.Copy(target, source); err != nil {
		return "", err
	}
	if err := os.Remove(sourcePath); err != nil {
		return "", err
	}

	return targetPath, nil
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

func (s *FileStorage) newPDFPath(fileName string) (string, string) {
	filename := sanitizeName(strings.TrimSuffix(fileName, filepath.Ext(fileName)))
	ext := strings.ToLower(filepath.Ext(fileName))
	if ext == "" {
		ext = ".pdf"
	}

	relativePath := filepath.Join("pdfs", fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), filename, ext))
	return relativePath, filepath.Join(s.basePath, relativePath)
}
