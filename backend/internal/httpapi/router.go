package httpapi

import (
	"errors"
	"log/slog"
	"mime"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"library-backend/internal/apperror"
	"library-backend/internal/config"
	"library-backend/internal/domain"
	"library-backend/internal/service"
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

func NewRouter(cfg config.Config, svc *service.Service, logger *slog.Logger) *gin.Engine {
	handler := &Handler{service: svc, config: cfg, logger: logger}

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.MaxMultipartMemory = cfg.MaxUploadSizeBytes()
	router.Use(requestLogger(logger))
	router.Use(recoveryLogger(logger))
	router.Use(corsMiddleware(cfg.CORSOrigins))

	api := router.Group("/api")
	{
		api.POST("/auth/register", handler.register)
		api.POST("/auth/login", handler.login)
		api.GET("/catalog/document-types", handler.listDocumentTypes)

		authenticated := api.Group("/")
		authenticated.Use(handler.requireAuth())
		{
			authenticated.GET("/me", handler.me)
			authenticated.GET("/home", handler.home)
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
		admin.Use(handler.requireAuth(), handler.requireRole(domain.RoleAdmin))
		{
			admin.GET("/documents", handler.adminListDocuments)
			admin.POST("/documents", handler.adminCreateDocument)
			admin.PUT("/documents/:id", handler.adminUpdateDocument)
			admin.DELETE("/documents/:id", handler.adminDeleteDocument)
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
		}
	}

	return router
}

func corsMiddleware(origins []string) gin.HandlerFunc {
	allowed := map[string]struct{}{}
	for _, origin := range origins {
		allowed[origin] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if _, ok := allowed["*"]; ok {
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			} else if _, ok := allowed[origin]; ok {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Set("Vary", "Origin")
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func (h *Handler) requireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := strings.TrimSpace(c.GetHeader("Authorization"))
		token := ""
		if strings.HasPrefix(header, "Bearer ") {
			token = strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		} else {
			token = strings.TrimSpace(c.Query("token"))
		}

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

		c.Set(contextUserIDKey, claims.Sub)
		c.Set(contextUserRoleKey, string(claims.Role))
		c.Next()
	}
}

func (h *Handler) requireRole(role domain.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		currentRole := c.GetString(contextUserRoleKey)
		if currentRole != string(role) {
			h.logger.Warn("forbidden request", "path", c.FullPath(), "method", c.Request.Method, "remote_addr", c.ClientIP(), "required_role", role)
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			c.Abort()
			return
		}
		c.Next()
	}
}

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

func (h *Handler) me(c *gin.Context) {
	user, err := h.service.Me(c.Request.Context(), currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) home(c *gin.Context) {
	payload, err := h.service.Home(c.Request.Context(), currentUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, payload)
}

func (h *Handler) suggest(c *gin.Context) {
	items, err := h.service.Suggest(c.Request.Context(), currentUserID(c), c.Query("q"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) listDocuments(c *gin.Context) {
	payload, err := h.service.ListDocuments(c.Request.Context(), currentUserID(c), parseFilters(c), false)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, payload)
}

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
	c.Header("Cache-Control", "no-store, no-cache, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

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

	h.serveStoredFile(c, document.FilePath, document.FileName, document.MimeType, dispositionType)
}

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

	h.serveStoredFile(c, submission.FilePath, submission.FileName, submission.MimeType, dispositionType)
}

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
	c.Header("Cache-Control", "no-cache, max-age=0")
	c.File(path)
}

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

func (h *Handler) listDocumentTypes(c *gin.Context) {
	items, err := h.service.DocumentTypes(c.Request.Context())
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
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

func (h *Handler) adminListDocuments(c *gin.Context) {
	payload, err := h.service.ListDocuments(c.Request.Context(), currentUserID(c), parseFilters(c), true)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, payload)
}

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

	user, password, err := h.service.CreateAdminUser(c.Request.Context(), input)
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

	user, err := h.service.UpdateUser(c.Request.Context(), currentUserID(c), userID, domain.AdminUserInput{
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

	user, err := h.service.SetUserActive(c.Request.Context(), currentUserID(c), userID, input.IsActive)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) adminResetUserPassword(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	user, password, err := h.service.ResetUserPassword(c.Request.Context(), userID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user, "temporaryPassword": password})
}

func parseFilters(c *gin.Context) domain.DocumentFilters {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	yearFrom, _ := strconv.Atoi(c.DefaultQuery("yearFrom", "0"))
	yearTo, _ := strconv.Atoi(c.DefaultQuery("yearTo", "0"))

	return domain.DocumentFilters{
		Query:      strings.TrimSpace(c.Query("q")),
		Type:       strings.TrimSpace(c.Query("type")),
		Author:     strings.TrimSpace(c.Query("author")),
		TagsQuery:  strings.TrimSpace(c.Query("tags")),
		Sort:       strings.TrimSpace(c.DefaultQuery("sort", "relevance")),
		Page:       page,
		PageSize:   pageSize,
		YearFrom:   yearFrom,
		YearTo:     yearTo,
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
	switch err {
	case apperror.ErrInvalidInput:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case apperror.ErrUnauthorized, apperror.ErrInvalidToken:
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case apperror.ErrForbidden:
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case apperror.ErrConflict:
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case apperror.ErrNotFound:
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		if errors.Is(err, apperror.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
	}
}
