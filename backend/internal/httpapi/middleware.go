package httpapi

import (
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
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

func rateLimitMiddleware(limitRequestsPerSecond float64, burst int) gin.HandlerFunc {
	type client struct {
		limiter  *rate.Limiter
		lastSeen time.Time
	}

	var (
		mu      sync.Mutex
		clients = make(map[string]*client)
	)

	go func() {
		for {
			time.Sleep(time.Minute)
			mu.Lock()
			for ip, cli := range clients {
				if time.Since(cli.lastSeen) > 3*time.Minute {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		mu.Lock()
		if _, found := clients[ip]; !found {
			clients[ip] = &client{limiter: rate.NewLimiter(rate.Limit(limitRequestsPerSecond), burst)}
		}
		clients[ip].lastSeen = time.Now()
		limiter := clients[ip].limiter
		mu.Unlock()

		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "too_many_requests"})
			c.Abort()
			return
		}
		c.Next()
	}
}
