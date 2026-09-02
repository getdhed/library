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

const bootstrapMarkerName = ".superadmin-bootstrap-complete"

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
	if err := os.MkdirAll(filepath.Join(s.basePath, "archives"), 0o755); err != nil {
		return err
	}
	return nil
}

func (s *FileStorage) BootstrapCompleted() (bool, error) {
	info, err := os.Stat(filepath.Join(s.basePath, bootstrapMarkerName))
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if info.IsDir() {
		return false, fmt.Errorf("bootstrap marker is a directory")
	}
	return true, nil
}

func (s *FileStorage) MarkBootstrapCompleted() error {
	markerPath := filepath.Join(s.basePath, bootstrapMarkerName)
	marker, err := os.OpenFile(markerPath, os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	return marker.Close()
}

func (s *FileStorage) SavePDF(file multipart.File, header *multipart.FileHeader) (string, int64, error) {
	defer file.Close()

	relativePath, absolutePath := s.newPDFPath(header.Filename)

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return "", 0, err
	}

	tmpPath := absolutePath + ".part"
	dst, err := os.Create(tmpPath)
	if err != nil {
		return "", 0, err
	}
	committed := false
	defer func() {
		_ = dst.Close()
		if !committed {
			_ = os.Remove(tmpPath)
		}
	}()

	size, err := io.Copy(dst, file)
	if err != nil {
		return "", 0, err
	}

	if err := dst.Sync(); err != nil {
		return "", 0, err
	}
	if err := dst.Close(); err != nil {
		return "", 0, err
	}

	if err := os.Rename(tmpPath, absolutePath); err != nil {
		return "", 0, err
	}
	committed = true

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
	relativePath := filepath.Join("pdfs", fmt.Sprintf("%d-%s.pdf", time.Now().UnixNano(), filename))
	return relativePath, filepath.Join(s.basePath, relativePath)
}

func (s *FileStorage) Archive(relativePath string) error {
	if strings.TrimSpace(relativePath) == "" {
		return nil
	}
	src := s.Resolve(relativePath)
	dst := filepath.Join(s.basePath, "archives", filepath.FromSlash(relativePath))

	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}

	err := os.Rename(src, dst)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *FileStorage) Restore(relativePath string) error {
	if strings.TrimSpace(relativePath) == "" {
		return nil
	}
	src := filepath.Join(s.basePath, "archives", filepath.FromSlash(relativePath))
	dst := s.Resolve(relativePath)

	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}

	err := os.Rename(src, dst)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
