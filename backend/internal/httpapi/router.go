package httpapi

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"library-backend/internal/apperror"
	"library-backend/internal/config"
	"library-backend/internal/domain"
	"library-backend/internal/service"

	_ "library-backend/docs"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

const (
	contextUserIDKey   = "userID"
	contextUserRoleKey = "userRole"
)

type Handler struct {
	service *service.Service
	config  config.Config
	logger  *slog.Logger
}

func (h *Handler) changeMyPassword(c *gin.Context) {
	var input domain.ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.ChangeMyPassword(c.Request.Context(), currentUserID(c), input); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) adminResetUserPassword(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	var input domain.ResetPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.ResetUserPassword(c.Request.Context(), currentUserID(c), currentUserRole(c), userID, input); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func NewRouter(cfg config.Config, svc *service.Service, logger *slog.Logger) *gin.Engine {
	handler := &Handler{service: svc, config: cfg, logger: logger}

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		logger.Error("invalid trusted proxy configuration; proxy headers disabled", "error", err)
		_ = router.SetTrustedProxies(nil)
	}
	router.MaxMultipartMemory = cfg.MultipartMemoryBytes()
	router.Use(bodySizeMiddleware(cfg.MaxUploadSizeBytes()))
	router.Use(requestLogger(logger))
	router.Use(recoveryLogger(logger))
	router.Use(corsMiddleware(cfg.CORSOrigins))

	router.GET("/health", handler.health)

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Buffered channel for async API request logging (bounded concurrency).
	// A single background worker processes log entries sequentially to avoid
	// spawning unbounded goroutines that can exhaust the DB connection pool.
	type apiLogEntry struct {
		method   string
		path     string
		status   int
		duration int
	}
	logCh := make(chan apiLogEntry, 256)
	go func() {
		for entry := range logCh {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			_ = handler.service.LogAPIRequest(ctx, entry.method, entry.path, entry.status, entry.duration)
			cancel()
		}
	}()

	// Middleware to log API requests for application load tracking
	router.Use(func(c *gin.Context) {
		start := time.Now()
		c.Next()
		durationMs := int(time.Since(start).Milliseconds())

		select {
		case logCh <- apiLogEntry{
			method:   c.Request.Method,
			path:     c.Request.URL.Path,
			status:   c.Writer.Status(),
			duration: durationMs,
		}:
		default:
			// Channel full — drop the log entry to protect the server
		}
	})

	api := router.Group("/api")
	{
		api.POST("/auth/register", rateLimitMiddleware(1.0, 3), handler.register)
		api.POST("/auth/login", rateLimitMiddleware(2.0, 5), handler.login)
		api.POST("/stats/visit", rateLimitMiddleware(0.1, 2), handler.logVisit)
		api.GET("/catalog/document-types", handler.listDocumentTypes)
		api.GET("/catalog/languages", handler.listLanguages)
		api.GET("/public/background", handler.serveBackground)

		authenticated := api.Group("/")
		authenticated.Use(rateLimitMiddleware(20.0, 50), handler.requireAuth())
		{
			authenticated.GET("/me", handler.me)
			authenticated.GET("/home", handler.home)
			authenticated.POST("/auth/change-password", handler.changeMyPassword)
			authenticated.GET("/search/suggest", handler.suggest)
			authenticated.GET("/documents", handler.listDocuments)
			authenticated.GET("/documents/:id", handler.getDocument)
			authenticated.GET("/documents/:id/cover", handler.serveDocumentCover)
			authenticated.POST("/documents/:id/open", handler.openDocument)
			authenticated.GET("/documents/:id/file", handler.serveDocument)
			authenticated.POST("/submissions", handler.createSubmission)
			authenticated.GET("/submissions/:id", handler.getSubmission)
			authenticated.GET("/submissions/:id/file", handler.serveSubmissionFile)
			authenticated.POST("/documents/:id/favorite", handler.favoriteDocument)
			authenticated.DELETE("/documents/:id/favorite", handler.unfavoriteDocument)
			authenticated.GET("/profile/recent", handler.profileRecent)
			authenticated.GET("/profile/favorites", handler.profileFavorites)
			authenticated.GET("/profile/search-history", handler.profileSearchHistory)
			authenticated.GET("/profile/submissions", handler.profileSubmissions)
		}

		admin := api.Group("/admin")
		admin.Use(rateLimitMiddleware(30.0, 100), handler.requireAuth(), handler.requireRole(domain.RoleAdmin))
		{
			admin.GET("/documents", handler.adminListDocuments)
			admin.POST("/documents", handler.adminCreateDocument)
			admin.PUT("/documents/:id", handler.adminUpdateDocument)
			admin.DELETE("/documents/:id", handler.adminDeleteDocument)
			admin.DELETE("/documents/:id/hard", handler.requireRole(domain.RoleSuperAdmin), handler.adminHardDeleteDocument)
			admin.POST("/documents/:id/restore", handler.adminRestoreDocument)
			admin.GET("/documents/:id/audit", handler.adminDocumentAudit)
			admin.GET("/audit", handler.adminAudit)
			admin.GET("/submissions", handler.adminListSubmissions)
			admin.POST("/submissions/:id/approve", handler.adminApproveSubmission)
			admin.POST("/submissions/:id/reject", handler.adminRejectSubmission)
			admin.GET("/stats", handler.adminStats)
			admin.GET("/users", handler.adminListUsers)
			admin.POST("/users", handler.adminCreateUser)
			admin.PUT("/users/:id", handler.adminUpdateUser)
			admin.PUT("/users", handler.adminUpdateUser)
			admin.PATCH("/users/:id/status", handler.adminSetUserStatus)
			admin.POST("/users/:id/reset-password", handler.adminResetUserPassword)

			admin.GET("/backup/db", handler.requireRole(domain.RoleSuperAdmin), handler.adminDownloadDBBackup)

			admin.GET("/document-types", handler.adminListDocumentTypes)
			admin.POST("/document-types", handler.adminCreateDocumentType)
			admin.PUT("/document-types/:id", handler.adminUpdateDocumentType)
			admin.PATCH("/document-types/:id/visibility", handler.adminToggleDocumentTypeVisibility)
			admin.DELETE("/document-types/:id", handler.adminDeleteDocumentType)

			admin.GET("/languages", handler.adminListLanguages)
			admin.POST("/languages", handler.adminCreateLanguage)
			admin.PUT("/languages/:id", handler.adminUpdateLanguage)
			admin.PATCH("/languages/:id/visibility", handler.adminToggleLanguageVisibility)
			admin.DELETE("/languages/:id", handler.adminDeleteLanguage)

			admin.POST("/settings/background", handler.requireRole(domain.RoleSuperAdmin), handler.uploadBackground)

			admin.DELETE("/users/:id", handler.adminDeleteUser)
			admin.DELETE("/users/:id/hard", handler.requireRole(domain.RoleSuperAdmin), handler.adminHardDeleteUser)
			admin.POST("/users/:id/restore", handler.adminRestoreUser)
		}
	}

	return router
}

func (h *Handler) health(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	if err := h.service.Health(ctx); err != nil {
		h.logger.Warn("health check failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func corsMiddleware(origins []string) gin.HandlerFunc {
	allowed := map[string]struct{}{}
	for _, origin := range origins {
		allowed[origin] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowCreds := false
		if origin != "" {
			if _, ok := allowed["*"]; ok {
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			} else if _, ok := allowed[origin]; ok {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Set("Vary", "Origin")
				allowCreds = true
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if allowCreds {
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func bodySizeMiddleware(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		limit := int64(1 * 1024 * 1024)
		if strings.HasPrefix(strings.ToLower(c.GetHeader("Content-Type")), "multipart/form-data") {
			limit = maxBytes
		} else if maxBytes < limit {
			limit = maxBytes
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)
		c.Next()
	}
}

// @Summary Log a site visit
// @Description Logs a new unique visit from a user to the site
// @Tags stats
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string "status"
// @Router /stats/visit [post]
func (h *Handler) logVisit(c *gin.Context) {
	if err := h.service.LogVisit(c.Request.Context()); err != nil {
		h.logger.Error("failed to log visit", "error", err)
		// We don't fail the request since this is just a background stat
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) requireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := authorizationBearerToken(c.Request)

		if token == "" {
			h.logger.Warn("missing auth token", "path", c.FullPath(), "method", c.Request.Method, "remote_addr", c.ClientIP())
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing_token"})
			c.Abort()
			return
		}

		claims, err := h.service.ParseToken(token)
		if err != nil {
			h.logger.Warn("invalid auth token", "path", c.FullPath(), "method", c.Request.Method, "remote_addr", c.ClientIP())
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			c.Abort()
			return
		}

		user, err := h.service.Me(c.Request.Context(), claims.Sub)
		if err != nil {
			h.logger.Warn("user not found for token", "user_id", claims.Sub, "path", c.FullPath(), "error", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			c.Abort()
			return
		}

		if !user.IsActive || user.DeletedAt != nil {
			h.logger.Warn("inactive user attempted access", "user_id", claims.Sub, "path", c.FullPath())
			c.JSON(http.StatusUnauthorized, gin.H{"error": "account_deactivated"})
			c.Abort()
			return
		}
		if claims.TokenVersion != user.TokenVersion {
			h.logger.Warn("revoked auth token", "user_id", claims.Sub, "path", c.FullPath())
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			c.Abort()
			return
		}

		c.Set(contextUserIDKey, claims.Sub)
		c.Set(contextUserRoleKey, string(user.Role))
		c.Next()
	}
}

func authorizationBearerToken(request *http.Request) string {
	header := strings.TrimSpace(request.Header.Get("Authorization"))
	if !strings.HasPrefix(header, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
}

func (h *Handler) requireRole(role domain.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		currentRole := c.GetString(contextUserRoleKey)

		hasAccess := false
		if currentRole == string(role) {
			hasAccess = true
		} else if role == domain.RoleAdmin && currentRole == string(domain.RoleSuperAdmin) {
			hasAccess = true // SuperAdmin has all Admin permissions
		}

		if !hasAccess {
			h.logger.Warn("forbidden request", "path", c.FullPath(), "method", c.Request.Method, "remote_addr", c.ClientIP(), "required_role", role)
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// @Summary Register new user
// @Description Register a new user in the system
// @Tags auth
// @Accept json
// @Produce json
// @Param input body domain.RegisterInput true "Registration info"
// @Success 201 {object} domain.AuthPayload
// @Failure 400 {object} map[string]string "error"
// @Router /auth/register [post]
func (h *Handler) register(c *gin.Context) {
	var input domain.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	payload, err := h.service.Register(c.Request.Context(), input)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, payload)
}

// @Summary Login user
// @Description Authenticate a user and return JWT
// @Tags auth
// @Accept json
// @Produce json
// @Param input body domain.LoginInput true "Login credentials"
// @Success 200 {object} domain.AuthPayload
// @Failure 400,401 {object} map[string]string "error"
// @Router /auth/login [post]
func (h *Handler) login(c *gin.Context) {
	var input domain.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	payload, err := h.service.Login(c.Request.Context(), input)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, payload)
}

// @Summary Get current user
// @Description Retrieve the currently authenticated user
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} domain.User
// @Failure 401 {object} map[string]string "error"
// @Router /me [get]
func (h *Handler) me(c *gin.Context) {
	user, err := h.service.Me(c.Request.Context(), currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, user)
}

// @Summary Get homepage data
// @Description Retrieves recent documents, favorites, and search history for the user
// @Tags public
// @Produce json
// @Security BearerAuth
// @Success 200 {object} domain.HomePayload
// @Failure 401 {object} map[string]string "error"
// @Router /home [get]
func (h *Handler) home(c *gin.Context) {
	payload, err := h.service.Home(c.Request.Context(), currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, payload)
}

// @Summary Search suggestions
// @Description Get auto-complete suggestions based on query
// @Tags public
// @Produce json
// @Param q query string true "Search query"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 400,401 {object} map[string]string "error"
// @Router /catalog/suggest [get]
func (h *Handler) suggest(c *gin.Context) {
	items, err := h.service.Suggest(c.Request.Context(), currentUserID(c), c.Query("q"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// @Summary List documents
// @Description Retrieve a paginated list of documents with filters
// @Tags documents
// @Produce json
// @Param query query string false "Search query"
// @Param type query string false "Document type"
// @Param page query int false "Page number"
// @Param pageSize query int false "Page size"
// @Security BearerAuth
// @Success 200 {object} domain.PagedDocuments
// @Failure 400,401 {object} map[string]string "error"
// @Router /catalog/documents [get]
func (h *Handler) listDocuments(c *gin.Context) {
	payload, err := h.service.ListDocuments(c.Request.Context(), currentUserID(c), parseFilters(c), false)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, payload)
}

// @Summary Get document details
// @Description Retrieve details of a specific document by ID
// @Tags documents
// @Produce json
// @Param id path int true "Document ID"
// @Security BearerAuth
// @Success 200 {object} domain.Document
// @Failure 400,401,404 {object} map[string]string "error"
// @Router /catalog/documents/{id} [get]
func (h *Handler) getDocument(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	document, err := h.service.GetDocument(c.Request.Context(), currentUserID(c), documentID, false)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, document)
}

// @Summary Submit a new document
// @Description Upload a file and submit it for moderation
// @Tags documents
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "Document file (PDF)"
// @Param title formData string true "Document title"
// @Param type formData string true "Document type"
// @Security BearerAuth
// @Success 201 {object} domain.DocumentSubmission
// @Failure 400,401 {object} map[string]string "error"
// @Router /catalog/submissions [post]
func (h *Handler) createSubmission(c *gin.Context) {
	input, err := h.service.ParseSubmissionInput(c.PostForm)
	if err != nil {
		writeError(c, err)
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	relative, size, mimeType, err := h.service.SaveMultipartFile(file, header)
	if err != nil {
		writeError(c, err)
		return
	}

	input.FilePath = relative
	input.FileName = header.Filename
	input.FileSize = size
	input.MimeType = mimeType

	submission, err := h.service.CreateSubmission(c.Request.Context(), currentUserID(c), input)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusCreated, submission)
}

// @Summary Get submission details
// @Description Retrieve details of a document submission by ID
// @Tags documents
// @Produce json
// @Param id path int true "Submission ID"
// @Security BearerAuth
// @Success 200 {object} domain.DocumentSubmission
// @Failure 400,401,404 {object} map[string]string "error"
// @Router /catalog/submissions/{id} [get]
func (h *Handler) getSubmission(c *gin.Context) {
	submissionID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	submission, err := h.service.GetSubmission(
		c.Request.Context(),
		currentUserID(c),
		currentUserRole(c),
		submissionID,
	)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, submission)
}

func (h *Handler) openDocument(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.TrackOpen(c.Request.Context(), currentUserID(c), documentID); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) serveStoredFile(c *gin.Context, relativePath, fileName, contentType, dispositionType string) {
	path := h.service.StoragePath(relativePath)
	if _, err := os.Stat(path); err != nil {
		writeError(c, apperror.ErrNotFound)
		return
	}

	if strings.TrimSpace(contentType) == "" {
		contentType = "application/pdf"
	}

	contentDisposition := mime.FormatMediaType(dispositionType, map[string]string{
		"filename": fileName,
	})
	if contentDisposition != "" {
		c.Header("Content-Disposition", contentDisposition)
	}
	c.Header("Content-Type", contentType)
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Referrer-Policy", "no-referrer")
	if contentType == "application/pdf" {
		c.Header("Content-Security-Policy", "sandbox")
	}
	if dispositionType == "attachment" {
		c.Header("X-Frame-Options", "DENY")
	}
	// Use a private cache for the file to improve PDF viewer performance and allow proper Range requests
	c.Header("Cache-Control", "private, max-age=86400")

	file, err := os.Open(path)
	if err != nil {
		writeError(c, apperror.ErrNotFound)
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Content-Length", strconv.FormatInt(info.Size(), 10))
	http.ServeContent(c.Writer, c.Request, fileName, time.Time{}, file)
}

// @Summary Download/View document file
// @Description Get the raw PDF file for a document
// @Tags documents
// @Produce application/pdf
// @Param id path int true "Document ID"
// @Param download query int false "Set to 1 to force download"
// @Security BearerAuth
// @Success 200 {file} file
// @Failure 400,401,404,409 {object} map[string]string "error"
// @Router /catalog/documents/{id}/file [get]
func (h *Handler) serveDocument(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	document, err := h.service.GetDocument(c.Request.Context(), currentUserID(c), documentID, false)
	if err != nil {
		writeError(c, err)
		return
	}
	if err := h.service.ValidateStoredPDF(document.FilePath); err != nil {
		h.logger.Warn("document file failed validation", "document_id", documentID, "error", err)
		c.JSON(http.StatusConflict, gin.H{"error": "document_file_invalid"})
		return
	}

	dispositionType := "inline"
	if c.Query("download") == "1" {
		dispositionType = "attachment"
		userID := currentUserID(c)
		if err := h.service.TrackDownload(c.Request.Context(), &userID, documentID); err != nil {
			h.logger.Warn("failed to track document download", "document_id", documentID, "error", err)
		}
	}

	h.serveStoredFile(c, document.FilePath, document.FileName, "application/pdf", dispositionType)
}

// @Summary Download/View submission file
// @Description Get the raw PDF file for a submission
// @Tags documents
// @Produce application/pdf
// @Param id path int true "Submission ID"
// @Param download query int false "Set to 1 to force download"
// @Security BearerAuth
// @Success 200 {file} file
// @Failure 400,401,404,409 {object} map[string]string "error"
// @Router /catalog/submissions/{id}/file [get]
func (h *Handler) serveSubmissionFile(c *gin.Context) {
	submissionID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	submission, err := h.service.GetSubmission(
		c.Request.Context(),
		currentUserID(c),
		currentUserRole(c),
		submissionID,
	)
	if err != nil {
		writeError(c, err)
		return
	}
	if err := h.service.ValidateStoredPDF(submission.FilePath); err != nil {
		h.logger.Warn("submission file failed validation", "submission_id", submissionID, "error", err)
		c.JSON(http.StatusConflict, gin.H{"error": "submission_file_invalid"})
		return
	}

	dispositionType := "inline"
	if c.Query("download") == "1" {
		dispositionType = "attachment"
	}

	h.serveStoredFile(c, submission.FilePath, submission.FileName, "application/pdf", dispositionType)
}

// @Summary Get document cover image
// @Description Retrieve the generated cover image for a document
// @Tags documents
// @Produce image/png
// @Param id path int true "Document ID"
// @Security BearerAuth
// @Success 200 {file} file
// @Failure 400,401,404,409 {object} map[string]string "error"
// @Router /catalog/documents/{id}/cover [get]
func (h *Handler) serveDocumentCover(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	document, err := h.service.GetDocument(c.Request.Context(), currentUserID(c), documentID, false)
	if err != nil {
		writeError(c, err)
		return
	}

	coverPath, err := h.service.EnsureDocumentCover(c.Request.Context(), document)
	if err != nil {
		if strings.Contains(err.Error(), "pdf file is empty") || strings.Contains(err.Error(), "invalid pdf header") {
			c.JSON(http.StatusConflict, gin.H{"error": "document_file_invalid"})
			return
		}
		writeError(c, err)
		return
	}

	path := h.service.StoragePath(coverPath)
	if _, err := os.Stat(path); err != nil {
		writeError(c, apperror.ErrNotFound)
		return
	}

	c.Header("Content-Type", "image/png")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Referrer-Policy", "no-referrer")
	c.Header("X-Frame-Options", "DENY")
	c.Header("Cache-Control", "no-cache, max-age=0")
	c.File(path)
}

// @Summary Favorite a document
// @Description Add a document to favorites
// @Tags profile
// @Param id path int true "Document ID"
// @Security BearerAuth
// @Success 204
// @Failure 400,401 {object} map[string]string "error"
// @Router /catalog/documents/{id}/favorite [post]
func (h *Handler) favoriteDocument(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.SetFavorite(c.Request.Context(), currentUserID(c), documentID, true); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// @Summary Unfavorite a document
// @Description Remove a document from favorites
// @Tags profile
// @Param id path int true "Document ID"
// @Security BearerAuth
// @Success 204
// @Failure 400,401 {object} map[string]string "error"
// @Router /catalog/documents/{id}/favorite [delete]
func (h *Handler) unfavoriteDocument(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.SetFavorite(c.Request.Context(), currentUserID(c), documentID, false); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// @Summary List document types
// @Description Get available document types
// @Tags public
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string "error"
// @Router /catalog/document-types [get]
func (h *Handler) listDocumentTypes(c *gin.Context) {
	items, err := h.service.DocumentTypes(c.Request.Context())
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) adminListDocumentTypes(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit < 1 {
		limit = 50
	}
	items, total, err := h.service.ListDocumentTypesFull(c.Request.Context(), page, limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "limit": limit})
}

func (h *Handler) adminCreateDocumentType(c *gin.Context) {
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	item, err := h.service.CreateDocumentType(c.Request.Context(), input.Name)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) adminUpdateDocumentType(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.UpdateDocumentType(c.Request.Context(), id, input.Name); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) adminDeleteDocumentType(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.DeleteDocumentType(c.Request.Context(), id); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// @Summary List languages
// @Tags settings
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string "error"
// @Router /catalog/languages [get]
func (h *Handler) listLanguages(c *gin.Context) {
	items, err := h.service.Languages(c.Request.Context())
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) adminListLanguages(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	items, total, err := h.service.ListLanguagesFull(c.Request.Context(), page, limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": total,
	})
}

func (h *Handler) adminCreateLanguage(c *gin.Context) {
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	item, err := h.service.CreateLanguage(c.Request.Context(), input.Name)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) adminUpdateLanguage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.UpdateLanguage(c.Request.Context(), id, input.Name); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusOK)
}

func (h *Handler) adminToggleLanguageVisibility(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	var input struct {
		IsHidden bool `json:"isHidden"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.ToggleLanguageVisibility(c.Request.Context(), id, input.IsHidden); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusOK)
}

func (h *Handler) adminDeleteLanguage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.DeleteLanguage(c.Request.Context(), id); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) adminToggleDocumentTypeVisibility(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	var input struct {
		IsHidden bool `json:"isHidden"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.ToggleDocumentTypeVisibility(c.Request.Context(), id, input.IsHidden); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) profileRecent(c *gin.Context) {
	items, err := h.service.Recent(c.Request.Context(), currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) profileFavorites(c *gin.Context) {
	items, err := h.service.Favorites(c.Request.Context(), currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) profileSearchHistory(c *gin.Context) {
	items, err := h.service.SearchHistory(c.Request.Context(), currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) profileSubmissions(c *gin.Context) {
	items, err := h.service.UserSubmissions(c.Request.Context(), currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// @Summary List documents (Admin)
// @Description Retrieve a paginated list of all documents including unapproved ones
// @Tags admin
// @Produce json
// @Param query query string false "Search query"
// @Param type query string false "Document type"
// @Param page query int false "Page number"
// @Param pageSize query int false "Page size"
// @Security BearerAuth
// @Success 200 {object} domain.PagedDocuments
// @Failure 401,403 {object} map[string]string "error"
// @Router /admin/documents [get]
func (h *Handler) adminListDocuments(c *gin.Context) {
	payload, err := h.service.ListDocuments(c.Request.Context(), currentUserID(c), parseFilters(c), true)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, payload)
}

// @Summary Create document (Admin)
// @Description Upload a file and create a document directly bypassing moderation
// @Tags admin
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "Document file (PDF)"
// @Param title formData string true "Document title"
// @Param type formData string true "Document type"
// @Security BearerAuth
// @Success 201 {object} domain.Document
// @Failure 400,401,403 {object} map[string]string "error"
// @Router /admin/documents [post]
func (h *Handler) adminCreateDocument(c *gin.Context) {
	input, err := h.service.ParseDocumentInput(c.PostForm)
	if err != nil {
		writeError(c, err)
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	relative, size, mimeType, err := h.service.SaveMultipartFile(file, header)
	if err != nil {
		writeError(c, err)
		return
	}

	input.FilePath = relative
	input.FileName = header.Filename
	input.FileSize = size
	input.MimeType = mimeType

	document, err := h.service.CreateDocument(c.Request.Context(), input, currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusCreated, document)
}

func (h *Handler) adminUpdateDocument(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	input, err := h.service.ParseDocumentInput(c.PostForm)
	if err != nil {
		writeError(c, err)
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err == nil {
		relative, size, mimeType, saveErr := h.service.SaveMultipartFile(file, header)
		if saveErr != nil {
			writeError(c, saveErr)
			return
		}
		input.FilePath = relative
		input.FileName = header.Filename
		input.FileSize = size
		input.MimeType = mimeType
	}

	document, err := h.service.UpdateDocument(c.Request.Context(), documentID, input, currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, document)
}

func (h *Handler) adminDeleteDocument(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.DeleteDocument(c.Request.Context(), documentID, currentUserID(c)); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) adminRestoreDocument(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.RestoreDocument(c.Request.Context(), documentID, currentUserID(c)); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) adminHardDeleteDocument(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if err := h.service.HardDeleteDocument(c.Request.Context(), documentID, currentUserID(c), currentUserRole(c)); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) adminDocumentAudit(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	items, err := h.service.DocumentAuditEvents(c.Request.Context(), documentID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) adminAudit(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	dateFrom, err := parseQueryDate(c.Query("dateFrom"))
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	dateTo, err := parseQueryDate(c.Query("dateTo"))
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if !dateTo.IsZero() {
		dateTo = dateTo.AddDate(0, 0, 1)
	}

	result, err := h.service.AuditEvents(c.Request.Context(), domain.AuditFilters{
		Query:    strings.TrimSpace(c.Query("q")),
		Action:   strings.TrimSpace(c.Query("action")),
		DateFrom: dateFrom,
		DateTo:   dateTo,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) adminListSubmissions(c *gin.Context) {
	items, err := h.service.AdminSubmissions(c.Request.Context(), c.Query("status"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) adminApproveSubmission(c *gin.Context) {
	submissionID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	input, err := h.service.ParseDocumentInput(c.PostForm)
	if err != nil {
		writeError(c, err)
		return
	}

	document, err := h.service.ApproveSubmission(c.Request.Context(), submissionID, currentUserID(c), input)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, document)
}

func (h *Handler) adminRejectSubmission(c *gin.Context) {
	submissionID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	var input struct {
		ModerationNote string `json:"moderationNote"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	submission, err := h.service.RejectSubmission(c.Request.Context(), submissionID, currentUserID(c), input.ModerationNote)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, submission)
}

func (h *Handler) adminStats(c *gin.Context) {
	dateFrom, err := parseQueryDate(c.Query("dateFrom"))
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	dateTo, err := parseQueryDate(c.Query("dateTo"))
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	if !dateTo.IsZero() {
		dateTo = dateTo.AddDate(0, 0, 1)
	}

	stats, err := h.service.Stats(c.Request.Context(), domain.StatsFilters{
		DateFrom: dateFrom,
		DateTo:   dateTo,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *Handler) adminListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))

	result, err := h.service.Users(c.Request.Context(), domain.UserFilters{
		Query:    strings.TrimSpace(c.Query("q")),
		Role:     domain.UserRole(strings.TrimSpace(c.Query("role"))),
		Status:   strings.TrimSpace(c.Query("status")),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) adminCreateUser(c *gin.Context) {
	var input domain.AdminUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	user, password, err := h.service.CreateAdminUser(c.Request.Context(), currentUserID(c), currentUserRole(c), input)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"user": user, "temporaryPassword": password})
}

func (h *Handler) adminUpdateUser(c *gin.Context) {
	var input struct {
		ID       int64           `json:"id"`
		Username string          `json:"username"`
		FullName string          `json:"fullName"`
		Role     domain.UserRole `json:"role"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	userID := input.ID
	if rawID := strings.TrimSpace(c.Param("id")); rawID != "" {
		parsed, err := strconv.ParseInt(rawID, 10, 64)
		if err != nil {
			writeError(c, apperror.ErrInvalidInput)
			return
		}
		userID = parsed
	}
	if userID <= 0 {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	user, err := h.service.UpdateUser(c.Request.Context(), currentUserID(c), currentUserRole(c), userID, domain.AdminUserInput{
		Username: input.Username,
		FullName: input.FullName,
		Role:     input.Role,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) adminSetUserStatus(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	var input domain.UserStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	user, err := h.service.SetUserActive(c.Request.Context(), currentUserID(c), currentUserRole(c), userID, input)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) adminDeleteUser(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	err = h.service.DeleteUser(c.Request.Context(), currentUserID(c), currentUserRole(c), userID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) adminHardDeleteUser(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	err = h.service.HardDeleteUser(c.Request.Context(), currentUserID(c), currentUserRole(c), userID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) adminRestoreUser(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	err = h.service.RestoreUser(c.Request.Context(), currentUserID(c), currentUserRole(c), userID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func parseFilters(c *gin.Context) domain.DocumentFilters {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	yearFrom, _ := strconv.Atoi(c.DefaultQuery("yearFrom", "0"))
	yearTo, _ := strconv.Atoi(c.DefaultQuery("yearTo", "0"))

	var isLocal *bool
	isLocalQuery := c.Query("isLocal")
	if isLocalQuery == "true" {
		val := true
		isLocal = &val
	} else if isLocalQuery == "false" {
		val := false
		isLocal = &val
	}

	var hasTranslation *bool
	hasTranslationQuery := c.Query("hasTranslation")
	if hasTranslationQuery == "true" {
		val := true
		hasTranslation = &val
	}

	return domain.DocumentFilters{
		Query:          strings.TrimSpace(c.Query("q")),
		Type:           strings.TrimSpace(c.Query("type")),
		Author:         strings.TrimSpace(c.Query("author")),
		TagsQuery:      strings.TrimSpace(c.Query("tags")),
		Sort:           strings.TrimSpace(c.DefaultQuery("sort", "relevance")),
		IncludeDeleted: c.Query("includeDeleted") == "1",
		IsLocal:        isLocal,
		HasTranslation: hasTranslation,
		Page:           page,
		PageSize:       pageSize,
		YearFrom:       yearFrom,
		YearTo:         yearTo,
	}
}

func parseQueryDate(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, nil
	}
	return time.Parse("2006-01-02", value)
}

func currentUserID(c *gin.Context) int64 {
	value, _ := c.Get(contextUserIDKey)
	id, _ := value.(int64)
	return id
}

func currentUserRole(c *gin.Context) domain.UserRole {
	value, _ := c.Get(contextUserRoleKey)
	role, _ := value.(string)
	return domain.UserRole(role)
}

func writeError(c *gin.Context, err error) {
	path := c.FullPath()
	switch err {
	case apperror.ErrInvalidInput:
		msg := "Некорректные данные запроса"
		if path == "/api/auth/register" {
			msg = "Некорректные данные регистрации: укажите логин, ФИО и пароль (не короче 6 символов)"
		} else if strings.HasPrefix(path, "/api/admin/users") {
			msg = "Некорректные данные пользователя: укажите логин, ФИО и роль; пароль не короче 6 символов при создании"
		} else if path == "/api/auth/change-password" {
			msg = "Некорректные данные: укажите текущий пароль и новый пароль (не короче 6 символов)"
		} else if strings.HasSuffix(path, "/reset-password") {
			msg = "Некорректные данные: укажите новый пароль (не короче 6 символов)"
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
	case apperror.ErrUnauthorized, apperror.ErrInvalidToken:
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case apperror.ErrForbidden:
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case apperror.ErrConflict:
		msg := "Конфликт данных"
		if path == "/api/auth/register" || strings.HasPrefix(path, "/api/admin/users") {
			msg = "Пользователь с таким логином уже существует"
		} else if strings.HasPrefix(path, "/api/admin/submissions") {
			msg = "Операция недоступна для текущего статуса заявки"
		} else if strings.HasPrefix(path, "/api/admin/document-types") {
			msg = "Тип документа с таким названием уже существует"
		} else if strings.HasPrefix(path, "/api/admin/languages") {
			msg = "Язык с таким названием уже существует"
		}
		c.JSON(http.StatusConflict, gin.H{"error": msg})
	case apperror.ErrNotFound:
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		if errors.Is(err, apperror.ErrConflict) {
			msg := "Конфликт данных"
			if path == "/api/auth/register" || strings.HasPrefix(path, "/api/admin/users") {
				msg = "Пользователь с таким логином уже существует"
			} else if strings.HasPrefix(path, "/api/admin/submissions") {
				msg = "Операция недоступна для текущего статуса заявки"
			}
			c.JSON(http.StatusConflict, gin.H{"error": msg})
			return
		}
		if strings.HasPrefix(err.Error(), "account_deactivated:") || strings.HasPrefix(err.Error(), "account_deactivated_reason:") || strings.HasPrefix(err.Error(), "Ваш аккаунт удален") || strings.HasPrefix(err.Error(), "Аккаунт не активен") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
	}
}

// @Summary Download DB Backup
// @Description Creates a pg_dump archive format backup of the database and streams it
// @Tags admin
// @Produce application/octet-stream
// @Security ApiKeyAuth
// @Success 200 {file} file "backup.bak"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /api/admin/backup/db [get]
func (h *Handler) adminDownloadDBBackup(c *gin.Context) {
	dbURL := h.config.DatabaseURL
	if dbURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
		return
	}

	tempFile, err := os.CreateTemp("", "library-backup-*.dump")
	if err != nil {
		h.logger.Error("failed to create temporary db backup file", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
		return
	}
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)
	if err := tempFile.Close(); err != nil {
		h.logger.Error("failed to close temporary db backup file", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Minute)
	defer cancel()

	var stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, "pg_dump", "-d", dbURL, "-F", "c", "-f", tempPath)
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		h.logger.Error("failed to generate db backup", "error", err, "stderr", limitedCommandOutput(stderr.String()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
		return
	}

	info, err := os.Stat(tempPath)
	if err != nil || info.Size() == 0 {
		h.logger.Error("pg_dump produced an empty db backup", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
		return
	}

	stderr.Reset()
	validate := exec.CommandContext(ctx, "pg_restore", "--list", tempPath)
	validate.Stdout = io.Discard
	validate.Stderr = &stderr
	if err := validate.Run(); err != nil {
		h.logger.Error("generated db backup failed validation", "error", err, "stderr", limitedCommandOutput(stderr.String()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=\"library_backup.bak\"")
	c.Header("Content-Type", "application/octet-stream")
	c.File(tempPath)
}

func limitedCommandOutput(value string) string {
	const maxLength = 4096
	value = strings.TrimSpace(value)
	if len(value) <= maxLength {
		return value
	}
	return value[:maxLength] + "..."
}
