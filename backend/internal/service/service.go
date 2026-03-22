package service

import (
	"context"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"library-backend/internal/apperror"
	"library-backend/internal/auth"
	"library-backend/internal/domain"
	"library-backend/internal/preview"
	"library-backend/internal/repository"
	"library-backend/internal/storage"
)

type Service struct {
	repo   *repository.Repository
	tokens *auth.TokenManager
	files  *storage.FileStorage
	covers *preview.Renderer
}

func New(repo *repository.Repository, tokens *auth.TokenManager, files *storage.FileStorage, covers *preview.Renderer) *Service {
	return &Service{repo: repo, tokens: tokens, files: files, covers: covers}
}

func (s *Service) Register(ctx context.Context, input domain.RegisterInput) (domain.AuthPayload, error) {
	if strings.TrimSpace(input.Email) == "" || strings.TrimSpace(input.Password) == "" || strings.TrimSpace(input.FullName) == "" {
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
	user, err := s.repo.GetUserByEmail(ctx, input.Email)
	if err != nil {
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

func (s *Service) Home(ctx context.Context, userID int64) (domain.HomePayload, error) {
	recent, err := s.repo.ListRecent(ctx, userID, 8)
	if err != nil {
		return domain.HomePayload{}, err
	}
	favorites, err := s.repo.ListFavorites(ctx, userID, 8)
	if err != nil {
		return domain.HomePayload{}, err
	}
	history, err := s.repo.ListSearchHistory(ctx, userID, 8)
	if err != nil {
		return domain.HomePayload{}, err
	}
	return domain.HomePayload{
		Recent:        recent,
		Favorites:     favorites,
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
	items, err := s.repo.ListDocuments(ctx, userID, domain.DocumentFilters{
		Query:    query,
		Page:     1,
		PageSize: 6,
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

func (s *Service) SetFavoriteAlias(ctx context.Context, userID, documentID int64, alias string) error {
	return s.repo.SetFavoriteAlias(ctx, userID, documentID, alias)
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

func (s *Service) Faculties(ctx context.Context) ([]domain.Faculty, error) {
	return s.repo.ListFaculties(ctx)
}

func (s *Service) Departments(ctx context.Context, facultyID int64) ([]domain.Department, error) {
	return s.repo.ListDepartments(ctx, facultyID)
}

func (s *Service) ParseDocumentInput(formValue func(string) string) (domain.UpsertDocumentInput, error) {
	year, err := strconv.Atoi(strings.TrimSpace(formValue("year")))
	if err != nil {
		return domain.UpsertDocumentInput{}, apperror.ErrInvalidInput
	}

	departmentID, err := strconv.ParseInt(strings.TrimSpace(formValue("departmentId")), 10, 64)
	if err != nil {
		return domain.UpsertDocumentInput{}, apperror.ErrInvalidInput
	}

	isVisible := true
	if value := strings.TrimSpace(formValue("isVisible")); value != "" {
		isVisible = value == "true" || value == "1"
	}

	input := domain.UpsertDocumentInput{
		Title:        strings.TrimSpace(formValue("title")),
		Author:       strings.TrimSpace(formValue("author")),
		Year:         year,
		Type:         strings.TrimSpace(formValue("type")),
		Description:  strings.TrimSpace(formValue("description")),
		DepartmentID: departmentID,
		Tags:         splitCSV(formValue("tags")),
		IsVisible:    isVisible,
	}
	if input.Title == "" || input.Author == "" || input.Type == "" || input.Description == "" || input.DepartmentID == 0 {
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

func (s *Service) CreateDocument(ctx context.Context, input domain.UpsertDocumentInput) (domain.Document, error) {
	coverPath, err := s.generateCover(ctx, input.FilePath)
	if err != nil {
		return domain.Document{}, err
	}
	input.CoverPath = coverPath
	return s.repo.CreateDocument(ctx, input)
}

func (s *Service) UpdateDocument(ctx context.Context, id int64, input domain.UpsertDocumentInput) (domain.Document, error) {
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

func (s *Service) DeleteDocument(ctx context.Context, id int64) error {
	document, err := s.repo.GetDocumentByID(ctx, 0, id, true)
	if err != nil {
		return err
	}
	if err := s.repo.DeleteDocument(ctx, id); err != nil {
		return err
	}
	if err := s.files.Delete(document.FilePath); err != nil {
		return err
	}
	return s.files.Delete(document.CoverPath)
}

func (s *Service) ImportFolder(ctx context.Context, importPath string, departmentID int64, author, docType, description string) (int, error) {
	files, err := s.files.ListImportPDFs(importPath)
	if err != nil {
		return 0, err
	}

	imported := 0
	for _, sourcePath := range files {
		info, err := os.Stat(sourcePath)
		if err != nil {
			return imported, err
		}

		targetRelative := filepath.ToSlash(filepath.Join("import", filepath.Base(sourcePath)))
		targetAbsolute := s.files.Resolve(targetRelative)
		if err := os.MkdirAll(filepath.Dir(targetAbsolute), 0o755); err != nil {
			return imported, err
		}
		if err := copyFile(sourcePath, targetAbsolute); err != nil {
			return imported, err
		}

		coverPath, err := s.generateCover(ctx, targetRelative)
		if err != nil {
			return imported, err
		}

		title := strings.TrimSuffix(filepath.Base(sourcePath), filepath.Ext(sourcePath))
		if err := s.repo.ImportDocument(ctx, title, author, docType, description, targetRelative, filepath.Base(sourcePath), info.Size(), departmentID, coverPath); err != nil {
			return imported, err
		}
		imported++
	}

	return imported, nil
}

func (s *Service) Stats(ctx context.Context) (domain.Stats, error) {
	return s.repo.Stats(ctx)
}

func (s *Service) StoragePath(relative string) string {
	return s.files.Resolve(relative)
}

func (s *Service) ValidateStoredPDF(relativePath string) error {
	if strings.TrimSpace(relativePath) == "" {
		return apperror.ErrNotFound
	}

	absolutePath := s.files.Resolve(relativePath)
	file, err := os.Open(absolutePath)
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
		return fmt.Errorf("pdf file is empty: %s", relativePath)
	}

	header := make([]byte, 5)
	readBytes, err := io.ReadFull(file, header)
	if err != nil {
		return fmt.Errorf("read pdf header: %w", err)
	}
	if readBytes < len(header) || string(header) != "%PDF-" {
		return fmt.Errorf("invalid pdf header for %s", relativePath)
	}

	return nil
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
