package httpapi

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func requestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		attrs := []any{
			"method", c.Request.Method,
			"path", c.FullPath(),
			"raw_path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"remote_addr", c.ClientIP(),
		}

		if c.Writer.Status() >= http.StatusInternalServerError {
			logger.Error("request completed with server error", attrs...)
			return
		}
		if c.Writer.Status() >= http.StatusBadRequest {
			logger.Warn("request completed with client error", attrs...)
			return
		}
		logger.Info("request completed", attrs...)
	}
}

func recoveryLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.Error(
					"panic recovered",
					"method", c.Request.Method,
					"path", c.FullPath(),
					"raw_path", c.Request.URL.Path,
					"remote_addr", c.ClientIP(),
					"panic", fmt.Sprint(recovered),
				)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
			}
		}()

		c.Next()
	}
}
