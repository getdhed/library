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
		api.GET("/catalog/faculties", handler.listFaculties)
		api.GET("/catalog/faculties/:id/departments", handler.listDepartments)

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
			authenticated.POST("/documents/:id/favorite", handler.favoriteDocument)
			authenticated.DELETE("/documents/:id/favorite", handler.unfavoriteDocument)
			authenticated.PUT("/documents/:id/favorite-alias", handler.setFavoriteAlias)
			authenticated.GET("/profile/recent", handler.profileRecent)
			authenticated.GET("/profile/favorites", handler.profileFavorites)
			authenticated.GET("/profile/search-history", handler.profileSearchHistory)
		}

		admin := api.Group("/admin")
		admin.Use(handler.requireAuth(), handler.requireRole(domain.RoleAdmin))
		{
			admin.GET("/documents", handler.adminListDocuments)
			admin.POST("/documents", handler.adminCreateDocument)
			admin.PUT("/documents/:id", handler.adminUpdateDocument)
			admin.DELETE("/documents/:id", handler.adminDeleteDocument)
			admin.POST("/documents/import", handler.adminImportDocuments)
			admin.GET("/faculties", handler.listFaculties)
			admin.GET("/departments", handler.adminListDepartments)
			admin.GET("/stats", handler.adminStats)
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

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
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

	path := h.service.StoragePath(document.FilePath)
	if _, err := os.Stat(path); err != nil {
		writeError(c, apperror.ErrNotFound)
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

	contentType := strings.TrimSpace(document.MimeType)
	if contentType == "" {
		contentType = "application/pdf"
	}

	contentDisposition := mime.FormatMediaType(dispositionType, map[string]string{
		"filename": document.FileName,
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
	http.ServeContent(c.Writer, c.Request, document.FileName, time.Time{}, file)
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

func (h *Handler) setFavoriteAlias(c *gin.Context) {
	documentID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	var input struct {
		Alias string `json:"alias"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	if err := h.service.SetFavoriteAlias(c.Request.Context(), currentUserID(c), documentID, input.Alias); err != nil {
		writeError(c, err)
		return
	}

	document, err := h.service.GetDocument(c.Request.Context(), currentUserID(c), documentID, false)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, document)
}

func (h *Handler) listFaculties(c *gin.Context) {
	items, err := h.service.Faculties(c.Request.Context())
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) listDepartments(c *gin.Context) {
	facultyID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}
	items, err := h.service.Departments(c.Request.Context(), facultyID)
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

	document, err := h.service.CreateDocument(c.Request.Context(), input)
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

	document, err := h.service.UpdateDocument(c.Request.Context(), documentID, input)
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
	if err := h.service.DeleteDocument(c.Request.Context(), documentID); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) adminImportDocuments(c *gin.Context) {
	departmentID, err := strconv.ParseInt(strings.TrimSpace(c.PostForm("departmentId")), 10, 64)
	if err != nil {
		writeError(c, apperror.ErrInvalidInput)
		return
	}

	imported, err := h.service.ImportFolder(
		c.Request.Context(),
		h.config.ImportPath,
		departmentID,
		strings.TrimSpace(c.PostForm("author")),
		strings.TrimSpace(c.PostForm("type")),
		strings.TrimSpace(c.PostForm("description")),
	)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"imported": imported})
}

func (h *Handler) adminListDepartments(c *gin.Context) {
	var facultyID int64
	if raw := strings.TrimSpace(c.Query("facultyId")); raw != "" {
		value, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			writeError(c, apperror.ErrInvalidInput)
			return
		}
		facultyID = value
	}

	items, err := h.service.Departments(c.Request.Context(), facultyID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) adminStats(c *gin.Context) {
	stats, err := h.service.Stats(c.Request.Context())
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func parseFilters(c *gin.Context) domain.DocumentFilters {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	facultyID, _ := strconv.ParseInt(c.DefaultQuery("facultyId", "0"), 10, 64)
	departmentID, _ := strconv.ParseInt(c.DefaultQuery("departmentId", "0"), 10, 64)

	return domain.DocumentFilters{
		Query:        strings.TrimSpace(c.Query("q")),
		FacultyID:    facultyID,
		DepartmentID: departmentID,
		Type:         strings.TrimSpace(c.Query("type")),
		Sort:         strings.TrimSpace(c.DefaultQuery("sort", "relevance")),
		Page:         page,
		PageSize:     pageSize,
		Visibility:   strings.TrimSpace(c.Query("visibility")),
	}
}

func currentUserID(c *gin.Context) int64 {
	value, _ := c.Get(contextUserIDKey)
	id, _ := value.(int64)
	return id
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
