package domain

import "time"

type UserRole string
type SubmissionStatus string
type SubmissionSource string

const (
	RoleUser  UserRole = "user"
	RoleAdmin UserRole = "admin"

	SubmissionStatusPending  SubmissionStatus = "pending"
	SubmissionStatusApproved SubmissionStatus = "approved"
	SubmissionStatusRejected SubmissionStatus = "rejected"

	SubmissionSourceUserUpload  SubmissionSource = "user_upload"
	SubmissionSourceAdminImport SubmissionSource = "admin_import"
)

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	FullName     string    `json:"fullName"`
	Role         UserRole  `json:"role"`
	AvatarURL    string    `json:"avatarUrl,omitempty"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Faculty struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type Department struct {
	ID        int64  `json:"id"`
	FacultyID int64  `json:"facultyId"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Faculty   string `json:"faculty,omitempty"`
}

type Document struct {
	ID            int64     `json:"id"`
	Title         string    `json:"title"`
	Author        string    `json:"author"`
	Year          int       `json:"year"`
	Type          string    `json:"type"`
	Description   string    `json:"description"`
	FilePath      string    `json:"-"`
	FileName      string    `json:"fileName"`
	FileSizeBytes int64     `json:"fileSizeBytes"`
	MimeType      string    `json:"mimeType"`
	CoverPath     string    `json:"coverPath,omitempty"`
	IsVisible     bool      `json:"isVisible"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	DepartmentID  int64     `json:"departmentId"`
	Department    string    `json:"department"`
	FacultyID     int64     `json:"facultyId"`
	Faculty       string    `json:"faculty"`
	Tags          []string  `json:"tags"`
	IsFavorite    bool      `json:"isFavorite"`
	Similarity    float64   `json:"similarity,omitempty"`
}

type DocumentSubmission struct {
	ID                 int64            `json:"id"`
	UserID             int64            `json:"userId"`
	Title              string           `json:"title"`
	Author             string           `json:"author,omitempty"`
	DepartmentID       int64            `json:"departmentId,omitempty"`
	Department         string           `json:"department,omitempty"`
	FacultyID          int64            `json:"facultyId,omitempty"`
	Faculty            string           `json:"faculty,omitempty"`
	Comment            string           `json:"comment,omitempty"`
	FilePath           string           `json:"-"`
	FileName           string           `json:"fileName"`
	FileSizeBytes      int64            `json:"fileSizeBytes"`
	MimeType           string           `json:"mimeType"`
	CoverPath          string           `json:"coverPath,omitempty"`
	Status             SubmissionStatus `json:"status"`
	Source             SubmissionSource `json:"source"`
	ModerationNote     string           `json:"moderationNote,omitempty"`
	ApprovedDocumentID int64            `json:"approvedDocumentId,omitempty"`
	ReviewedBy         int64            `json:"reviewedBy,omitempty"`
	ReviewedAt         *time.Time       `json:"reviewedAt,omitempty"`
	CreatedAt          time.Time        `json:"createdAt"`
	UpdatedAt          time.Time        `json:"updatedAt"`
	UploaderName       string           `json:"uploaderName,omitempty"`
	UploaderEmail      string           `json:"uploaderEmail,omitempty"`
}

type SearchHistoryItem struct {
	ID        int64     `json:"id"`
	Query     string    `json:"query"`
	CreatedAt time.Time `json:"createdAt"`
}

type Stats struct {
	DocumentsCount     int64            `json:"documentsCount"`
	ViewsToday         int64            `json:"viewsToday"`
	DownloadsToday     int64            `json:"downloadsToday"`
	SearchesToday      int64            `json:"searchesToday"`
	TopQueries         []NamedStat      `json:"topQueries"`
	TopDocuments       []NamedStat      `json:"topDocuments"`
	DocumentsByFaculty []FacultyDocStat `json:"documentsByFaculty"`
}

type NamedStat struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

type FacultyDocStat struct {
	Faculty string `json:"faculty"`
	Count   int64  `json:"count"`
}

type Pagination struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	Total    int `json:"total"`
}

type DocumentFilters struct {
	Query        string
	FacultyID    int64
	DepartmentID int64
	Type         string
	Sort         string
	Page         int
	PageSize     int
	Visibility   string
}

type PagedDocuments struct {
	Items []Document `json:"items"`
	Pagination
}

type HomePayload struct {
	Recent        []Document          `json:"recent"`
	Favorites     []Document          `json:"favorites"`
	SearchHistory []SearchHistoryItem `json:"searchHistory"`
}

type RegisterInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthPayload struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type UpsertDocumentInput struct {
	Title        string
	Author       string
	Year         int
	Type         string
	Description  string
	DepartmentID int64
	Tags         []string
	IsVisible    bool
	FileName     string
	FilePath     string
	FileSize     int64
	MimeType     string
	CoverPath    string
	Source       SubmissionSource
}

type ImportSubmissionError struct {
	FileName string `json:"fileName"`
	Error    string `json:"error"`
}

type ImportSubmissionsResult struct {
	Queued int                     `json:"queued"`
	Errors []ImportSubmissionError `json:"errors"`
}

type CreateSubmissionInput struct {
	Title        string
	Author       string
	Comment      string
	DepartmentID int64
	FileName     string
	FilePath     string
	FileSize     int64
	MimeType     string
	CoverPath    string
	Source       SubmissionSource
}
