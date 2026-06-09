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
	Username     string    `json:"username"`
	FullName     string    `json:"fullName"`
	Role         UserRole  `json:"role"`
	AvatarURL    string    `json:"avatarUrl,omitempty"`
	IsActive     bool      `json:"isActive"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Document struct {
	ID                 int64     `json:"id"`
	Title              string    `json:"title"`
	Author             string    `json:"author"`
	Executor           string    `json:"executor,omitempty"`
	ScientificAdvisor  string    `json:"scientificAdvisor,omitempty"`
	Year               int       `json:"year"`
	Type               string    `json:"type"`
	PlaceOfPublication string    `json:"placeOfPublication,omitempty"`
	Publisher          string    `json:"publisher,omitempty"`
	PeriodicalName     string    `json:"periodicalName,omitempty"`
	Volume             string    `json:"volume,omitempty"`
	Description        string    `json:"description"`
	FilePath           string    `json:"-"`
	FileName           string    `json:"fileName"`
	FileSizeBytes      int64     `json:"fileSizeBytes"`
	MimeType           string    `json:"mimeType"`
	CoverPath          string    `json:"coverPath,omitempty"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
	Tags               []string  `json:"tags"`
	IsFavorite         bool       `json:"isFavorite"`
	Similarity         float64    `json:"similarity,omitempty"`
	DeletedAt          *time.Time `json:"deletedAt,omitempty"`
}

type DocumentSubmission struct {
	ID                 int64            `json:"id"`
	UserID             int64            `json:"userId"`
	Title              string           `json:"title"`
	Author             string           `json:"author,omitempty"`
	Executor           string           `json:"executor,omitempty"`
	ScientificAdvisor  string           `json:"scientificAdvisor,omitempty"`
	PlaceOfPublication string           `json:"placeOfPublication,omitempty"`
	Publisher          string           `json:"publisher,omitempty"`
	PeriodicalName     string           `json:"periodicalName,omitempty"`
	Volume             string           `json:"volume,omitempty"`
	Year               int              `json:"year,omitempty"`
	Type               string           `json:"type,omitempty"`
	Description        string           `json:"description,omitempty"`
	Tags               string           `json:"tags,omitempty"`
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
	ReviewerName       string           `json:"reviewerName,omitempty"`
	ReviewerUsername   string           `json:"reviewerUsername,omitempty"`
	ReviewedAt         *time.Time       `json:"reviewedAt,omitempty"`
	CreatedAt          time.Time        `json:"createdAt"`
	UpdatedAt          time.Time        `json:"updatedAt"`
	UploaderName       string           `json:"uploaderName,omitempty"`
	UploaderUsername   string           `json:"uploaderUsername,omitempty"`
}

type SearchHistoryItem struct {
	ID        int64     `json:"id"`
	Query     string    `json:"query"`
	CreatedAt time.Time `json:"createdAt"`
}

type Stats struct {
	DocumentsCount        int64       `json:"documentsCount"`
	ViewsToday            int64       `json:"viewsToday"`
	DownloadsToday        int64       `json:"downloadsToday"`
	SearchesToday         int64       `json:"searchesToday"`
	UploadedInPeriod      int64       `json:"uploadedInPeriod"`
	UploadPeriodFrom      time.Time   `json:"uploadPeriodFrom"`
	UploadPeriodTo        time.Time   `json:"uploadPeriodTo"`
	TopQueries            []NamedStat `json:"topQueries"`
	TopDocuments          []NamedStat `json:"topDocuments"`
	DocumentsByType       []NamedStat `json:"documentsByType"`
	AppLoadByHour         []NamedStat `json:"appLoadByHour"`
}

type NamedStat struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

type Pagination struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	Total    int `json:"total"`
}

type DocumentFilters struct {
	Query          string
	Type           string
	Author         string
	TagsQuery      string
	Sort           string
	IncludeDeleted bool
	Page           int
	PageSize       int
	YearFrom       int
	YearTo         int
}

type StatsFilters struct {
	DateFrom time.Time
	DateTo   time.Time
}

type PagedDocuments struct {
	Items []Document `json:"items"`
	Pagination
}

type PagedUsers struct {
	Items []User `json:"items"`
	Pagination
}

type UserFilters struct {
	Query    string
	Role     UserRole
	Status   string
	Page     int
	PageSize int
}

type HomePayload struct {
	Recent        []Document          `json:"recent"`
	Favorites     []Document          `json:"favorites"`
	SearchHistory []SearchHistoryItem `json:"searchHistory"`
}

type RegisterInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
}

type LoginInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthPayload struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type AdminUserInput struct {
	Username string   `json:"username"`
	FullName string   `json:"fullName"`
	Role     UserRole `json:"role"`
	Password string   `json:"password,omitempty"`
}

type UserStatusInput struct {
	IsActive bool `json:"isActive"`
}

type UpsertDocumentInput struct {
	Title              string
	Author             string
	Executor           string
	ScientificAdvisor  string
	Year               int
	Type               string
	PlaceOfPublication string
	Publisher          string
	PeriodicalName     string
	Volume             string
	Description        string
	Tags               []string
	FileName           string
	FilePath           string
	FileSize           int64
	MimeType           string
	CoverPath          string
	Source             SubmissionSource
}

type DocumentAuditEvent struct {
	ID            int64          `json:"id"`
	Action        string         `json:"action"`
	ActorID       int64          `json:"actorId,omitempty"`
	ActorName     string         `json:"actorName,omitempty"`
	ActorUsername string         `json:"actorUsername,omitempty"`
	DocumentID    int64          `json:"documentId,omitempty"`
	SubmissionID  int64          `json:"submissionId,omitempty"`
	DocumentTitle string         `json:"documentTitle"`
	FileName      string         `json:"fileName"`
	Details       map[string]any `json:"details"`
	CreatedAt     time.Time      `json:"createdAt"`
}

type AuditFilters struct {
	Query    string
	Action   string
	DateFrom time.Time
	DateTo   time.Time
	Page     int
	PageSize int
}

type PagedAuditEvents struct {
	Items []DocumentAuditEvent `json:"items"`
	Pagination
}

type CreateAuditEventInput struct {
	Action        string
	ActorID       int64
	DocumentID    int64
	SubmissionID  int64
	DocumentTitle string
	FileName      string
	Details       map[string]any
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
	Title              string
	Author             string
	Executor           string
	ScientificAdvisor  string
	PlaceOfPublication string
	Publisher          string
	PeriodicalName     string
	Volume             string
	Year               int
	Type               string
	Description        string
	Tags               string
	Comment            string
	FileName           string
	FilePath           string
	FileSize           int64
	MimeType           string
	CoverPath          string
	Source             SubmissionSource
}
