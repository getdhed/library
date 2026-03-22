package main

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type Document struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Type       string    `json:"type"`
	Category   string    `json:"category"`
	Faculty    string    `json:"faculty"`
	Department string    `json:"department"`
	Year       int       `json:"year"`
	Visible    bool      `json:"visible"`
	SizeMB     float64   `json:"sizeMb"`
	Tags       []string  `json:"tags"`
	URL        string    `json:"url"`
	CreatedAt  time.Time `json:"createdAt"`
}

type PagedDocumentsResponse struct {
	Items      []Document `json:"items"`
	Total      int        `json:"total"`
	Page       int        `json:"page"`
	PageSize   int        `json:"pageSize"`
	HasNext    bool       `json:"hasNext"`
	HasPrev    bool       `json:"hasPrev"`
	SortBy     string     `json:"sortBy"`
	SortOrder  string     `json:"sortOrder"`
	SearchTerm string     `json:"searchTerm"`
}

var documents = []Document{
	{
		ID:         "1",
		Title:      "Алгоритмы и структуры данных",
		Type:       "Учебник",
		Category:   "ФКТИ > Кафедра программной инженерии > 2 курс",
		Faculty:    "ФКТИ",
		Department: "Кафедра программной инженерии",
		Year:       2022,
		Visible:    true,
		SizeMB:     12.3,
		Tags:       []string{"алгоритмы", "структуры данных", "программирование"},
		URL:        "https://example.com/docs/algorithms.pdf",
		CreatedAt:  time.Date(2022, 9, 1, 0, 0, 0, 0, time.UTC),
	},
	{
		ID:         "2",
		Title:      "Математический анализ. Конспект лекций",
		Type:       "Конспект",
		Category:   "ФМиКН > Кафедра высшей математики > 1 курс",
		Faculty:    "ФМиКН",
		Department: "Кафедра высшей математики",
		Year:       2021,
		Visible:    true,
		SizeMB:     5.8,
		Tags:       []string{"матан", "лекции"},
		URL:        "https://example.com/docs/math-analysis.pdf",
		CreatedAt:  time.Date(2021, 9, 1, 0, 0, 0, 0, time.UTC),
	},
	{
		ID:         "3",
		Title:      "Методичка по базам данных",
		Type:       "Методичка",
		Category:   "ФКТИ > Кафедра информационных систем > 3 курс",
		Faculty:    "ФКТИ",
		Department: "Кафедра информационных систем",
		Year:       2023,
		Visible:    true,
		SizeMB:     9.1,
		Tags:       []string{"sql", "postgres", "базы данных"},
		URL:        "https://example.com/docs/databases.pdf",
		CreatedAt:  time.Date(2023, 2, 10, 0, 0, 0, 0, time.UTC),
	},
}

func main() {
	router := gin.Default()
	router.Use(corsMiddleware())

	api := router.Group("/api")
	{
		api.GET("/documents", listDocuments)
		api.GET("/documents/:id", getDocument)
		api.GET("/search", searchDocuments)

		admin := api.Group("/admin")
		{
			admin.GET("/documents", adminListDocuments)
			admin.POST("/documents", adminCreateDocument)
			admin.PUT("/documents/:id", adminUpdateDocument)
			admin.DELETE("/documents/:id", adminDeleteDocument)
		}
	}

	router.Run(":8080")
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func listDocuments(c *gin.Context) {
	page, pageSize := parsePaging(c)
	q := strings.TrimSpace(c.Query("q"))
	docType := c.Query("type")
	category := c.Query("category")
	sortBy := c.DefaultQuery("sortBy", "relevance")
	sortOrder := c.DefaultQuery("sortOrder", "desc")

	filtered := filterDocuments(q, docType, category)
	// для прототипа сортировку можно не реализовывать детально
	paged, total := paginateDocuments(filtered, page, pageSize)

	response := PagedDocumentsResponse{
		Items:      paged,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		HasNext:    page*pageSize < total,
		HasPrev:    page > 1,
		SortBy:     sortBy,
		SortOrder:  sortOrder,
		SearchTerm: q,
	}

	c.JSON(http.StatusOK, response)
}

func getDocument(c *gin.Context) {
	id := c.Param("id")
	for _, d := range documents {
		if d.ID == id {
			c.JSON(http.StatusOK, d)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "document_not_found"})
}

func searchDocuments(c *gin.Context) {
	// для фронта можно использовать тот же формат, что и listDocuments
	listDocuments(c)
}

func adminListDocuments(c *gin.Context) {
	c.JSON(http.StatusOK, documents)
}

func adminCreateDocument(c *gin.Context) {
	var input Document
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_payload"})
		return
	}
	input.ID = generateID()
	input.CreatedAt = time.Now()
	documents = append(documents, input)
	c.JSON(http.StatusCreated, input)
}

func adminUpdateDocument(c *gin.Context) {
	id := c.Param("id")
	var input Document
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_payload"})
		return
	}

	for i, d := range documents {
		if d.ID == id {
			input.ID = d.ID
			input.CreatedAt = d.CreatedAt
			documents[i] = input
			c.JSON(http.StatusOK, input)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "document_not_found"})
}

func adminDeleteDocument(c *gin.Context) {
	id := c.Param("id")
	for i, d := range documents {
		if d.ID == id {
			documents = append(documents[:i], documents[i+1:]...)
			c.Status(http.StatusNoContent)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "document_not_found"})
}

func parsePaging(c *gin.Context) (int, int) {
	const (
		defaultPage     = 1
		defaultPageSize = 10
		maxPageSize     = 100
	)

	page := defaultPage
	pageSize := defaultPageSize

	if v := c.Query("page"); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			page = p
		}
	}

	if v := c.Query("pageSize"); v != "" {
		if ps, err := strconv.Atoi(v); err == nil && ps > 0 && ps <= maxPageSize {
			pageSize = ps
		}
	}

	return page, pageSize
}

func filterDocuments(q, docType, category string) []Document {
	qLower := strings.ToLower(q)
	docTypeLower := strings.ToLower(docType)
	categoryLower := strings.ToLower(category)

	result := make([]Document, 0, len(documents))
	for _, d := range documents {
		if !d.Visible {
			continue
		}

		if docTypeLower != "" && strings.ToLower(d.Type) != docTypeLower {
			continue
		}

		if categoryLower != "" && !strings.Contains(strings.ToLower(d.Category), categoryLower) {
			continue
		}

		if qLower != "" && !matchesQuery(d.Title, qLower) {
			continue
		}

		result = append(result, d)
	}
	return result
}

func matchesQuery(title, qLower string) bool {
	if qLower == "" {
		return true
	}

	titleLower := strings.ToLower(title)

	// простейший "умный" поиск: все слова запроса должны встречаться в названии
	parts := strings.Fields(qLower)
	for _, part := range parts {
		if !strings.Contains(titleLower, part) {
			return false
		}
	}
	return true
}

func paginateDocuments(items []Document, page, pageSize int) ([]Document, int) {
	total := len(items)
	if total == 0 {
		return []Document{}, 0
	}

	start := (page - 1) * pageSize
	if start >= total {
		return []Document{}, total
	}

	end := start + pageSize
	if end > total {
		end = total
	}

	return items[start:end], total
}

func generateID() string {
	// для прототипа достаточно времени в наносекундах
	return strconv.FormatInt(time.Now().UnixNano(), 10)
}
