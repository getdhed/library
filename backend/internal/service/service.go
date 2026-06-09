package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/csv"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"library-backend/internal/apperror"
	"library-backend/internal/auth"
	"library-backend/internal/domain"
	"library-backend/internal/preview"
	"library-backend/internal/repository"
	"library-backend/internal/storage"
)

type Service struct {
	repo     *repository.Repository
	tokens   *auth.TokenManager
	files    *storage.FileStorage
	covers   *preview.Renderer
}

func New(repo *repository.Repository, tokens *auth.TokenManager, files *storage.FileStorage, covers *preview.Renderer) *Service {
	return &Service{repo: repo, tokens: tokens, files: files, covers: covers}
}

var defaultDocumentTypes = []string{
	"Автореферат диссертации",
	"Альбом",
	"Диссертация",
	"Информационный бюллетень",
	"Курс лекций",
	"Материалы обобщения опыта",
	"Методические рекомендации",
	"Методическое пособие",
	"Монография",
	"НИР",
	"Пособие",
	"Правила",
	"Практикум",
	"Приложение к пособию",
	"Разговорник",
	"Руководство",
	"Сборник",
	"Сборник нормативов",
	"Сборник текстов для перевода",
	"Статья",
	"УМК",
	"Учебник",
	"Учебное пособие",
	"Учебно-методические рекомендации",
	"Учебно-методический комплекс",
	"Учебно-методическое пособие",
	"Учебно-наглядное пособие",
}

func (s *Service) Register(ctx context.Context, input domain.RegisterInput) (domain.AuthPayload, error) {
	if strings.TrimSpace(input.Username) == "" || strings.TrimSpace(input.Password) == "" || strings.TrimSpace(input.FullName) == "" {
		return domain.AuthPayload{}, apperror.ErrInvalidInput
	}

	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		return domain.AuthPayload{}, err
	}

	user, err := s.repo.CreateUser(ctx, input, hash)
	if err != nil {
		return domain.AuthPayload{}, err
	}

	token, err := s.tokens.Create(user)
	if err != nil {
		return domain.AuthPayload{}, err
	}

	return domain.AuthPayload{Token: token, User: user}, nil
}

func (s *Service) Login(ctx context.Context, input domain.LoginInput) (domain.AuthPayload, error) {
	user, err := s.repo.GetUserByUsername(ctx, input.Username)
	if err != nil {
		return domain.AuthPayload{}, apperror.ErrUnauthorized
	}
	if !user.IsActive {
		return domain.AuthPayload{}, apperror.ErrUnauthorized
	}
	if err := auth.ComparePassword(user.PasswordHash, input.Password); err != nil {
		return domain.AuthPayload{}, apperror.ErrUnauthorized
	}

	user.PasswordHash = ""
	token, err := s.tokens.Create(user)
	if err != nil {
		return domain.AuthPayload{}, err
	}

	return domain.AuthPayload{Token: token, User: user}, nil
}

func (s *Service) ParseToken(token string) (auth.Claims, error) {
	return s.tokens.Parse(token)
}

func (s *Service) Me(ctx context.Context, userID int64) (domain.User, error) {
	return s.repo.GetUserByID(ctx, userID)
}

func (s *Service) GetUserByUsername(ctx context.Context, username string) (domain.User, error) {
	return s.repo.GetUserByUsername(ctx, username)
}

func validUserRole(role domain.UserRole) bool {
	return role == domain.RoleUser || role == domain.RoleAdmin
}

func validateAdminUserInput(input domain.AdminUserInput, requirePassword bool) error {
	if strings.TrimSpace(input.Username) == "" || strings.TrimSpace(input.FullName) == "" || !validUserRole(input.Role) {
		return apperror.ErrInvalidInput
	}
	if requirePassword && strings.TrimSpace(input.Password) == "" {
		return apperror.ErrInvalidInput
	}
	return nil
}

func generateTemporaryPassword() (string, error) {
	raw := make([]byte, 18)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func (s *Service) Users(ctx context.Context, filters domain.UserFilters) (domain.PagedUsers, error) {
	if filters.Role != "" && !validUserRole(filters.Role) {
		return domain.PagedUsers{}, apperror.ErrInvalidInput
	}
	if filters.Status != "" && filters.Status != "active" && filters.Status != "inactive" {
		return domain.PagedUsers{}, apperror.ErrInvalidInput
	}
	return s.repo.ListUsers(ctx, filters)
}

func (s *Service) CreateAdminUser(ctx context.Context, input domain.AdminUserInput) (domain.User, string, error) {
	if input.Role == "" {
		input.Role = domain.RoleUser
	}

	password := strings.TrimSpace(input.Password)
	requirePassword := password != ""
	if err := validateAdminUserInput(input, requirePassword); err != nil {
		return domain.User{}, "", err
	}
	if password == "" {
		generated, err := generateTemporaryPassword()
		if err != nil {
			return domain.User{}, "", err
		}
		password = generated
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return domain.User{}, "", err
	}
	user, err := s.repo.CreateAdminUser(ctx, input, hash)
	if err != nil {
		return domain.User{}, "", err
	}
	return user, password, nil
}

func (s *Service) UpdateUser(ctx context.Context, actorID, id int64, input domain.AdminUserInput) (domain.User, error) {
	if err := validateAdminUserInput(input, false); err != nil {
		return domain.User{}, err
	}
	if actorID == id && input.Role != domain.RoleAdmin {
		return domain.User{}, apperror.ErrForbidden
	}
	return s.repo.UpdateUser(ctx, id, input)
}

func (s *Service) SetUserActive(ctx context.Context, actorID, id int64, isActive bool) (domain.User, error) {
	if actorID == id && !isActive {
		return domain.User{}, apperror.ErrForbidden
	}
	return s.repo.SetUserActive(ctx, id, isActive)
}

func (s *Service) ResetUserPassword(ctx context.Context, id int64) (domain.User, string, error) {
	password, err := generateTemporaryPassword()
	if err != nil {
		return domain.User{}, "", err
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return domain.User{}, "", err
	}
	user, err := s.repo.ResetUserPassword(ctx, id, hash)
	if err != nil {
		return domain.User{}, "", err
	}
	return user, password, nil
}

func (s *Service) Home(ctx context.Context, userID int64) (domain.HomePayload, error) {
	recent, err := s.repo.ListRecent(ctx, userID, 4)
	if err != nil {
		return domain.HomePayload{}, err
	}
	history, err := s.repo.ListSearchHistory(ctx, userID, 8)
	if err != nil {
		return domain.HomePayload{}, err
	}
	return domain.HomePayload{
		Recent:        recent,
		Favorites:     []domain.Document{},
		SearchHistory: history,
	}, nil
}

func (s *Service) ListDocuments(ctx context.Context, userID int64, filters domain.DocumentFilters, adminMode bool) (domain.PagedDocuments, error) {
	if userID > 0 && strings.TrimSpace(filters.Query) != "" {
		if err := s.repo.SaveSearchHistory(ctx, userID, filters.Query); err != nil {
			return domain.PagedDocuments{}, err
		}
	}
	return s.repo.ListDocuments(ctx, userID, filters, adminMode)
}

func (s *Service) Suggest(ctx context.Context, userID int64, query string) ([]domain.Document, error) {
	query = strings.TrimSpace(query)
	if len([]rune(query)) < 2 {
		return []domain.Document{}, nil
	}
	items, err := s.repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		Query:    query,
		Page:     1,
		PageSize: 5,
		Sort:     "relevance",
	}, false)
	if err != nil {
		return nil, err
	}
	return items.Items, nil
}

func (s *Service) GetDocument(ctx context.Context, userID, id int64, adminMode bool) (domain.Document, error) {
	return s.repo.GetDocumentByID(ctx, userID, id, adminMode)
}

func (s *Service) SetFavorite(ctx context.Context, userID, documentID int64, value bool) error {
	return s.repo.UpsertFavorite(ctx, userID, documentID, value)
}

func (s *Service) TrackOpen(ctx context.Context, userID, documentID int64) error {
	return s.repo.TrackOpen(ctx, userID, documentID)
}

func (s *Service) TrackDownload(ctx context.Context, userID *int64, documentID int64) error {
	return s.repo.TrackDownload(ctx, userID, documentID)
}

func (s *Service) Recent(ctx context.Context, userID int64) ([]domain.Document, error) {
	return s.repo.ListRecent(ctx, userID, 20)
}

func (s *Service) Favorites(ctx context.Context, userID int64) ([]domain.Document, error) {
	return s.repo.ListFavorites(ctx, userID, 20)
}

func (s *Service) SearchHistory(ctx context.Context, userID int64) ([]domain.SearchHistoryItem, error) {
	return s.repo.ListSearchHistory(ctx, userID, 20)
}

func (s *Service) DocumentTypes(ctx context.Context) ([]string, error) {
	existing, err := s.repo.ListDocumentTypes(ctx)
	if err != nil {
		return nil, err
	}

	seen := map[string]struct{}{}
	types := make([]string, 0, len(defaultDocumentTypes)+len(existing))
	for _, item := range defaultDocumentTypes {
		key := strings.ToLower(strings.TrimSpace(item))
		if key == "" {
			continue
		}
		seen[key] = struct{}{}
		types = append(types, strings.TrimSpace(item))
	}
	for _, item := range existing {
		key := strings.ToLower(strings.TrimSpace(item))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		types = append(types, strings.TrimSpace(item))
	}
	return types, nil
}

func truncateString(s string, max int) string {
	if len(s) <= max {
		return s
	}
	r := []rune(s)
	if len(r) > max {
		return string(r[:max])
	}
	return s
}

func (s *Service) ParseSubmissionInput(formValue func(string) string) (domain.CreateSubmissionInput, error) {
	year := 0
	if value := strings.TrimSpace(formValue("year")); value != "" {
		if parsedYear, err := strconv.Atoi(value); err == nil && parsedYear > 0 {
			year = parsedYear
		}
	}

	input := domain.CreateSubmissionInput{
		Title:              truncateString(strings.TrimSpace(formValue("title")), 100),
		Author:             truncateString(strings.TrimSpace(formValue("author")), 150),
		Executor:           truncateString(strings.TrimSpace(formValue("executor")), 150),
		ScientificAdvisor:  truncateString(strings.TrimSpace(formValue("scientificAdvisor")), 150),
		PlaceOfPublication: truncateString(strings.TrimSpace(formValue("placeOfPublication")), 100),
		Publisher:          truncateString(strings.TrimSpace(formValue("publisher")), 150),
		PeriodicalName:     truncateString(strings.TrimSpace(formValue("periodicalName")), 150),
		Volume:             truncateString(strings.TrimSpace(formValue("volume")), 50),
		Year:               year,
		Type:               truncateString(strings.TrimSpace(formValue("type")), 100),
		Description:        truncateString(strings.TrimSpace(formValue("description")), 500),
		Tags:               truncateString(strings.TrimSpace(formValue("tags")), 500),
		Comment:            truncateString(strings.TrimSpace(formValue("comment")), 500),
	}
	if input.Title == "" {
		return domain.CreateSubmissionInput{}, apperror.ErrInvalidInput
	}
	return input, nil
}

func (s *Service) ParseDocumentInput(formValue func(string) string) (domain.UpsertDocumentInput, error) {
	year := time.Now().Year()
	if value := strings.TrimSpace(formValue("year")); value != "" {
		parsedYear, err := strconv.Atoi(value)
		if err != nil {
			return domain.UpsertDocumentInput{}, apperror.ErrInvalidInput
		}
		if parsedYear > 0 {
			year = parsedYear
		}
	}

	input := domain.UpsertDocumentInput{
		Title:              truncateString(strings.TrimSpace(formValue("title")), 100),
		Author:             truncateString(strings.TrimSpace(formValue("author")), 150),
		Executor:           truncateString(strings.TrimSpace(formValue("executor")), 150),
		ScientificAdvisor:  truncateString(strings.TrimSpace(formValue("scientificAdvisor")), 150),
		Year:               year,
		Type:               truncateString(strings.TrimSpace(formValue("type")), 100),
		PlaceOfPublication: truncateString(strings.TrimSpace(formValue("placeOfPublication")), 100),
		Publisher:          truncateString(strings.TrimSpace(formValue("publisher")), 150),
		PeriodicalName:     truncateString(strings.TrimSpace(formValue("periodicalName")), 150),
		Volume:             truncateString(strings.TrimSpace(formValue("volume")), 50),
		Description:        truncateString(strings.TrimSpace(formValue("description")), 500),
		Tags:               splitCSV(truncateString(strings.TrimSpace(formValue("tags")), 500)),
	}
	if input.Title == "" {
		return domain.UpsertDocumentInput{}, apperror.ErrInvalidInput
	}
	return input, nil
}

func (s *Service) SaveMultipartFile(file multipart.File, header *multipart.FileHeader) (string, int64, string, error) {
	relative, size, err := s.files.SavePDF(file, header)
	if err != nil {
		return "", 0, "", err
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(header.Filename))
	}
	if contentType == "" {
		contentType = "application/pdf"
	}
	return relative, size, contentType, nil
}

func (s *Service) logAudit(ctx context.Context, input domain.CreateAuditEventInput) error {
	if strings.TrimSpace(input.Action) == "" {
		return nil
	}
	return s.repo.CreateAuditEvent(ctx, input)
}

func changedDocumentFields(before, after domain.Document) []string {
	changed := []string{}
	if before.Title != after.Title {
		changed = append(changed, "title")
	}
	if before.Author != after.Author {
		changed = append(changed, "author")
	}
	if before.Executor != after.Executor {
		changed = append(changed, "executor")
	}
	if before.ScientificAdvisor != after.ScientificAdvisor {
		changed = append(changed, "scientificAdvisor")
	}
	if before.Year != after.Year {
		changed = append(changed, "year")
	}
	if before.Type != after.Type {
		changed = append(changed, "type")
	}
	if before.PlaceOfPublication != after.PlaceOfPublication {
		changed = append(changed, "placeOfPublication")
	}
	if before.Publisher != after.Publisher {
		changed = append(changed, "publisher")
	}
	if before.PeriodicalName != after.PeriodicalName {
		changed = append(changed, "periodicalName")
	}
	if before.Volume != after.Volume {
		changed = append(changed, "volume")
	}
	if before.Description != after.Description {
		changed = append(changed, "description")
	}
	if strings.Join(before.Tags, ",") != strings.Join(after.Tags, ",") {
		changed = append(changed, "tags")
	}
	return changed
}

func (s *Service) CreateDocument(ctx context.Context, input domain.UpsertDocumentInput, actorID int64) (domain.Document, error) {
	coverPath, err := s.generateCover(ctx, input.FilePath)
	if err != nil {
		return domain.Document{}, err
	}
	input.CoverPath = coverPath
	document, err := s.repo.CreateDocument(ctx, input)
	if err != nil {
		return domain.Document{}, err
	}
	if err := s.logAudit(ctx, domain.CreateAuditEventInput{
		Action:        "create",
		ActorID:       actorID,
		DocumentID:    document.ID,
		DocumentTitle: document.Title,
		FileName:      document.FileName,
		Details: map[string]any{
			"type": document.Type,
		},
	}); err != nil {
		return domain.Document{}, err
	}
	return document, nil
}

func (s *Service) CreateSubmission(ctx context.Context, userID int64, input domain.CreateSubmissionInput) (domain.DocumentSubmission, error) {
	if input.Source == "" {
		input.Source = domain.SubmissionSourceUserUpload
	}

	coverPath, err := s.generateCover(ctx, input.FilePath)
	if err != nil {
		_ = s.files.Delete(input.FilePath)
		return domain.DocumentSubmission{}, err
	}
	input.CoverPath = coverPath

	submission, err := s.repo.CreateSubmission(ctx, userID, input)
	if err != nil {
		_ = s.files.Delete(input.FilePath)
		_ = s.files.Delete(input.CoverPath)
		return domain.DocumentSubmission{}, err
	}

	if err := s.logAudit(ctx, domain.CreateAuditEventInput{
		Action:        "submit",
		ActorID:       userID,
		SubmissionID:  submission.ID,
		DocumentTitle: submission.Title,
		FileName:      submission.FileName,
		Details: map[string]any{
			"source": submission.Source,
		},
	}); err != nil {
		return domain.DocumentSubmission{}, err
	}

	return submission, nil
}

func (s *Service) UpdateDocument(ctx context.Context, id int64, input domain.UpsertDocumentInput, actorID int64) (domain.Document, error) {
	current, err := s.repo.GetDocumentByID(ctx, 0, id, true)
	if err != nil {
		return domain.Document{}, err
	}

	if strings.TrimSpace(input.FilePath) != "" {
		coverPath, err := s.generateCover(ctx, input.FilePath)
		if err != nil {
			return domain.Document{}, err
		}
		input.CoverPath = coverPath
	}

	updated, err := s.repo.UpdateDocument(ctx, id, input)
	if err != nil {
		return domain.Document{}, err
	}

	if err := s.logAudit(ctx, domain.CreateAuditEventInput{
		Action:        "update",
		ActorID:       actorID,
		DocumentID:    updated.ID,
		DocumentTitle: updated.Title,
		FileName:      updated.FileName,
		Details: map[string]any{
			"changedFields": changedDocumentFields(current, updated),
		},
	}); err != nil {
		return domain.Document{}, err
	}

	fileReplaced := strings.TrimSpace(input.FilePath) != "" && input.FilePath != current.FilePath
	if fileReplaced {
		if err := s.logAudit(ctx, domain.CreateAuditEventInput{
			Action:        "file_replace",
			ActorID:       actorID,
			DocumentID:    updated.ID,
			DocumentTitle: updated.Title,
			FileName:      updated.FileName,
			Details: map[string]any{
				"oldFileName": current.FileName,
				"newFileName": updated.FileName,
			},
		}); err != nil {
			return domain.Document{}, err
		}
	}

	if strings.TrimSpace(input.FilePath) != "" && input.FilePath != current.FilePath {
		if err := s.files.Delete(current.FilePath); err != nil {
			return domain.Document{}, err
		}
		if err := s.files.Delete(current.CoverPath); err != nil {
			return domain.Document{}, err
		}
	}

	return updated, nil
}

func (s *Service) GetSubmission(ctx context.Context, requesterID int64, requesterRole domain.UserRole, submissionID int64) (domain.DocumentSubmission, error) {
	submission, err := s.repo.GetSubmissionByID(ctx, submissionID)
	if err != nil {
		return domain.DocumentSubmission{}, err
	}
	if requesterRole != domain.RoleAdmin && submission.UserID != requesterID {
		return domain.DocumentSubmission{}, apperror.ErrForbidden
	}
	return submission, nil
}

func (s *Service) UserSubmissions(ctx context.Context, userID int64) ([]domain.DocumentSubmission, error) {
	return s.repo.ListSubmissionsByUser(ctx, userID)
}

func (s *Service) AdminSubmissions(ctx context.Context, status string) ([]domain.DocumentSubmission, error) {
	normalizedStatus := domain.SubmissionStatus(strings.TrimSpace(status))
	if normalizedStatus != "" &&
		normalizedStatus != domain.SubmissionStatusPending &&
		normalizedStatus != domain.SubmissionStatusApproved &&
		normalizedStatus != domain.SubmissionStatusRejected {
		return nil, apperror.ErrInvalidInput
	}

	return s.repo.ListSubmissions(ctx, normalizedStatus)
}

func (s *Service) ApproveSubmission(ctx context.Context, submissionID, reviewerID int64, input domain.UpsertDocumentInput) (domain.Document, error) {
	submission, err := s.repo.GetSubmissionByID(ctx, submissionID)
	if err != nil {
		return domain.Document{}, err
	}
	document, err := s.repo.ApproveSubmission(ctx, submissionID, reviewerID, input)
	if err != nil {
		return domain.Document{}, err
	}
	if err := s.logAudit(ctx, domain.CreateAuditEventInput{
		Action:        "approve",
		ActorID:       reviewerID,
		DocumentID:    document.ID,
		SubmissionID:  submissionID,
		DocumentTitle: document.Title,
		FileName:      document.FileName,
		Details: map[string]any{
			"source":        submission.Source,
			"submittedName": submission.Title,
		},
	}); err != nil {
		return domain.Document{}, err
	}
	return document, nil
}

func (s *Service) RejectSubmission(ctx context.Context, submissionID, reviewerID int64, moderationNote string) (domain.DocumentSubmission, error) {
	moderationNote = strings.TrimSpace(moderationNote)
	if moderationNote == "" {
		return domain.DocumentSubmission{}, apperror.ErrInvalidInput
	}

	submission, err := s.repo.RejectSubmission(ctx, submissionID, reviewerID, moderationNote)
	if err != nil {
		return domain.DocumentSubmission{}, err
	}
	if err := s.logAudit(ctx, domain.CreateAuditEventInput{
		Action:        "reject",
		ActorID:       reviewerID,
		SubmissionID:  submission.ID,
		DocumentTitle: submission.Title,
		FileName:      submission.FileName,
		Details: map[string]any{
			"moderationNote": submission.ModerationNote,
			"source":         submission.Source,
		},
	}); err != nil {
		return domain.DocumentSubmission{}, err
	}
	return submission, nil
}

func (s *Service) DeleteDocument(ctx context.Context, id int64, actorID int64) error {
	document, err := s.repo.GetDocumentByID(ctx, 0, id, true)
	if err != nil {
		return err
	}
	if err := s.logAudit(ctx, domain.CreateAuditEventInput{
		Action:        "delete",
		ActorID:       actorID,
		DocumentID:    document.ID,
		DocumentTitle: document.Title,
		FileName:      document.FileName,
		Details: map[string]any{
			"type": document.Type,
		},
	}); err != nil {
		return err
	}
	if err := s.repo.DeleteDocument(ctx, id); err != nil {
		return err
	}
	return nil
}

func (s *Service) RestoreDocument(ctx context.Context, id int64, actorID int64) error {
	document, err := s.repo.GetDocumentByID(ctx, 0, id, true)
	if err != nil {
		return err
	}
	if err := s.logAudit(ctx, domain.CreateAuditEventInput{
		Action:        "restore",
		ActorID:       actorID,
		DocumentID:    document.ID,
		DocumentTitle: document.Title,
		FileName:      document.FileName,
		Details: map[string]any{
			"type": document.Type,
		},
	}); err != nil {
		return err
	}
	return s.repo.RestoreDocument(ctx, id)
}

func (s *Service) LogAPIRequest(ctx context.Context, method, path string, statusCode, durationMs int) error {
	return s.repo.LogAPIRequest(ctx, method, path, statusCode, durationMs)
}

func (s *Service) Stats(ctx context.Context, filters domain.StatsFilters) (domain.Stats, error) {
	return s.repo.Stats(ctx, filters)
}

func (s *Service) DocumentAuditEvents(ctx context.Context, documentID int64) ([]domain.DocumentAuditEvent, error) {
	if documentID <= 0 {
		return nil, apperror.ErrInvalidInput
	}
	if _, err := s.repo.GetDocumentByID(ctx, 0, documentID, true); err != nil {
		return nil, err
	}
	return s.repo.ListDocumentAuditEvents(ctx, documentID)
}

func (s *Service) AuditEvents(ctx context.Context, filters domain.AuditFilters) (domain.PagedAuditEvents, error) {
	return s.repo.ListAuditEvents(ctx, filters)
}

func (s *Service) StoragePath(relative string) string {
	return s.files.Resolve(relative)
}

func (s *Service) ValidateStoredPDF(relativePath string) error {
	if strings.TrimSpace(relativePath) == "" {
		return apperror.ErrNotFound
	}

	absolutePath := s.files.Resolve(relativePath)
	return s.validatePDFPath(absolutePath, relativePath)
}

func (s *Service) EnsureDocumentCover(ctx context.Context, document domain.Document) (string, error) {
	if strings.TrimSpace(document.FilePath) == "" {
		return "", apperror.ErrNotFound
	}
	if err := s.ValidateStoredPDF(document.FilePath); err != nil {
		return "", err
	}

	coverPath := strings.TrimSpace(document.CoverPath)
	if coverPath == "" {
		coverPath = s.files.CoverPathFor(document.FilePath)
	}

	absoluteCoverPath := s.files.Resolve(coverPath)
	if _, err := os.Stat(absoluteCoverPath); err == nil {
		if document.CoverPath == "" {
			if err := s.repo.UpdateDocumentCoverPath(ctx, document.ID, coverPath); err != nil {
				return "", err
			}
		}
		return coverPath, nil
	}

	if err := s.covers.RenderFirstPage(ctx, s.files.Resolve(document.FilePath), absoluteCoverPath); err != nil {
		return "", err
	}

	if document.CoverPath != coverPath {
		if err := s.repo.UpdateDocumentCoverPath(ctx, document.ID, coverPath); err != nil {
			return "", err
		}
	}

	return coverPath, nil
}

func (s *Service) generateCover(ctx context.Context, relativePDFPath string) (string, error) {
	if strings.TrimSpace(relativePDFPath) == "" {
		return "", nil
	}
	if err := s.ValidateStoredPDF(relativePDFPath); err != nil {
		return "", err
	}

	coverPath := s.files.CoverPathFor(relativePDFPath)
	if err := s.covers.RenderFirstPage(ctx, s.files.Resolve(relativePDFPath), s.files.Resolve(coverPath)); err != nil {
		return "", err
	}

	return coverPath, nil
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return []string{}
	}

	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			items = append(items, part)
		}
	}
	return items
}

func copyFile(src, dst string) error {
	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()

	target, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer target.Close()

	_, err = io.Copy(target, source)
	return err
}

func (s *Service) validatePDFPath(path, label string) error {
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return apperror.ErrNotFound
		}
		return err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return err
	}
	if info.Size() == 0 {
		return fmt.Errorf("pdf file is empty: %s", label)
	}

	header := make([]byte, 5)
	readBytes, err := io.ReadFull(file, header)
	if err != nil {
		return fmt.Errorf("read pdf header: %w", err)
	}
	if readBytes < len(header) || string(header) != "%PDF-" {
		return fmt.Errorf("invalid pdf header for %s", label)
	}

	return nil
}

func (s *Service) ArchiveOldLogs(ctx context.Context) error {
	// Define the threshold: 4 months ago
	threshold := time.Now().AddDate(0, -4, 0)
	
	// 1. Delete old api_requests_log (no need to export)
	if err := s.repo.DeleteOldAPIRequests(ctx, threshold); err != nil {
		return err
	}
	
	// 2. Export old document_audit_events
	events, err := s.repo.GetOldAuditEvents(ctx, threshold)
	if err != nil {
		return err
	}
	
	if len(events) == 0 {
		return nil
	}
	
	filename := fmt.Sprintf("audit_archive_%s.csv", time.Now().Format("2006-01-02_15-04-05"))
	archivePath := s.files.Resolve(filepath.Join("archives", filename))
	
	file, err := os.Create(archivePath)
	if err != nil {
		return err
	}
	defer file.Close()
	
	writer := csv.NewWriter(file)
	
	// Write header
	writer.Write([]string{"ID", "Action", "DocumentID", "DocumentTitle", "FileName", "ActorID", "ActorUsername", "ActorName", "CreatedAt"})
	
	for _, e := range events {
		writer.Write([]string{
			fmt.Sprint(e.ID),
			e.Action,
			fmt.Sprint(e.DocumentID),
			e.DocumentTitle,
			e.FileName,
			fmt.Sprint(e.ActorID),
			e.ActorUsername,
			e.ActorName,
			e.CreatedAt.Format(time.RFC3339),
		})
	}
	
	writer.Flush()
	if err := writer.Error(); err != nil {
		return err
	}
	
	// 3. Delete from DB
	if err := s.repo.DeleteOldAuditEvents(ctx, threshold); err != nil {
		return err
	}
	
	return nil
}
