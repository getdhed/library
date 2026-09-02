package httpapi

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"

	"library-backend/internal/apperror"
)

const maxBackgroundSize int64 = 10 << 20

func detectBackgroundContentType(file io.ReadSeeker) (string, error) {
	probe := make([]byte, 512)
	readBytes, err := io.ReadFull(file, probe)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		return "", err
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	if readBytes == 0 {
		return "", apperror.ErrInvalidInput
	}

	contentType := http.DetectContentType(probe[:readBytes])
	switch contentType {
	case "image/png", "image/jpeg", "image/webp":
		return contentType, nil
	default:
		return "", apperror.ErrInvalidInput
	}
}

// serveBackground serves only a verified raster background image.
func (h *Handler) serveBackground(c *gin.Context) {
	bgPath := h.service.StoragePath("settings/background")
	file, err := os.Open(bgPath)
	if err != nil {
		if !os.IsNotExist(err) {
			h.logger.Error("failed to open background image", "error", err)
		}
		c.Status(http.StatusNotFound)
		return
	}
	defer file.Close()

	contentType, err := detectBackgroundContentType(file)
	if err != nil {
		h.logger.Warn("refusing to serve invalid background image", "error", err)
		c.Status(http.StatusNotFound)
		return
	}
	info, err := file.Stat()
	if err != nil {
		h.logger.Error("failed to stat background image", "error", err)
		c.Status(http.StatusInternalServerError)
		return
	}

	c.Header("Cache-Control", "no-cache")
	c.Header("Content-Type", contentType)
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Content-Security-Policy", "default-src 'none'; sandbox")
	http.ServeContent(c.Writer, c.Request, "background", info.ModTime(), file)
}

// uploadBackground allows the super-admin to upload a new background image.
func (h *Handler) uploadBackground(c *gin.Context) {
	header, err := c.FormFile("image")
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if header.Size <= 0 || header.Size > maxBackgroundSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Размер файла превышает 10 МБ"})
		return
	}

	source, err := header.Open()
	if err != nil {
		h.logger.Error("failed to open uploaded background", "error", err)
		writeError(c, fmt.Errorf("open background upload: %w", err))
		return
	}
	defer source.Close()
	if _, err := detectBackgroundContentType(source); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Допустимые форматы: PNG, JPEG, WebP"})
		return
	}

	settingsDir := h.service.StoragePath("settings")
	if err := os.MkdirAll(settingsDir, 0o755); err != nil {
		h.logger.Error("failed to create settings dir", "error", err)
		writeError(c, fmt.Errorf("failed to save background: %w", err))
		return
	}

	temporary, err := os.CreateTemp(settingsDir, ".background-*.part")
	if err != nil {
		h.logger.Error("failed to create temporary background file", "error", err)
		writeError(c, fmt.Errorf("failed to save background: %w", err))
		return
	}
	temporaryPath := temporary.Name()
	committed := false
	defer func() {
		_ = temporary.Close()
		if !committed {
			_ = os.Remove(temporaryPath)
		}
	}()

	written, copyErr := io.Copy(temporary, io.LimitReader(source, maxBackgroundSize+1))
	if copyErr != nil || written > maxBackgroundSize {
		if copyErr == nil {
			copyErr = apperror.ErrInvalidInput
		}
		h.logger.Error("failed to save uploaded background", "error", copyErr)
		writeError(c, fmt.Errorf("failed to save background: %w", copyErr))
		return
	}
	if err := temporary.Sync(); err != nil {
		h.logger.Error("failed to sync uploaded background", "error", err)
		writeError(c, fmt.Errorf("failed to save background: %w", err))
		return
	}
	if err := temporary.Close(); err != nil {
		h.logger.Error("failed to close uploaded background", "error", err)
		writeError(c, fmt.Errorf("failed to save background: %w", err))
		return
	}

	bgPath := filepath.Join(settingsDir, "background")
	if err := os.Rename(temporaryPath, bgPath); err != nil {
		h.logger.Error("failed to publish uploaded background", "error", err)
		writeError(c, fmt.Errorf("failed to save background: %w", err))
		return
	}
	committed = true
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
