package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"library-backend/internal/apperror"
	"library-backend/internal/domain"
)

type Repository struct {
	db *sql.DB
}

type rowScanner interface {
	Scan(dest ...any) error
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func splitFilterTerms(value string) []string {
	rawItems := strings.Fields(strings.NewReplacer(",", " ", ";", " ").Replace(value))
	items := make([]string, 0, len(rawItems))
	seen := map[string]struct{}{}
	for _, item := range rawItems {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		items = append(items, trimmed)
	}
	return items
}

func scanUser(row rowScanner) (domain.User, error) {
	var user domain.User
	err := row.Scan(
		&user.ID,
		&user.Username,
		&user.FullName,
		&user.Role,
		&user.AvatarURL,
		&user.IsActive,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
		&user.DeactivationReason,
	)
	return user, err
}

func (r *Repository) EnsureSeedData(ctx context.Context, adminUsername, adminName, adminPasswordHash string) error {
	if _, err := r.db.ExecContext(ctx, `
		INSERT INTO users(username, password_hash, full_name, role)
		VALUES ($1, $2, $3, 'superadmin')
		ON CONFLICT (username) DO UPDATE
		SET password_hash = EXCLUDED.password_hash,
			full_name = EXCLUDED.full_name,
			role = 'superadmin',
			is_active = TRUE,
			updated_at = NOW()
	`, strings.ToLower(strings.TrimSpace(adminUsername)), adminPasswordHash, strings.TrimSpace(adminName)); err != nil {
		return fmt.Errorf("seed admin: %w", err)
	}

	return nil
}

func (r *Repository) EnsureSystemUser(ctx context.Context, username, fullName, passwordHash string) (domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO users(username, password_hash, full_name, role)
		VALUES ($1, $2, $3, 'superadmin')
		ON CONFLICT (username) DO UPDATE
		SET full_name = EXCLUDED.full_name,
			role = 'superadmin',
			is_active = TRUE,
			updated_at = NOW()
		RETURNING id, username, full_name, role, avatar_url, is_active, last_login_at, created_at, updated_at, deleted_at
	`, strings.ToLower(strings.TrimSpace(username)), passwordHash, strings.TrimSpace(fullName)).
		Scan(&user.ID, &user.Username, &user.FullName, &user.Role, &user.AvatarURL, &user.IsActive, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt, &user.DeletedAt)
	if err != nil {
		return domain.User{}, err
	}
	return user, nil
}

func (r *Repository) CreateUser(ctx context.Context, input domain.RegisterInput, passwordHash string) (domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO users(username, password_hash, full_name, role)
		VALUES ($1, $2, $3, 'user')
		RETURNING id, username, full_name, role, avatar_url, is_active, last_login_at, created_at, updated_at, deleted_at
	`, strings.ToLower(strings.TrimSpace(input.Username)), passwordHash, strings.TrimSpace(input.FullName)).
		Scan(&user.ID, &user.Username, &user.FullName, &user.Role, &user.AvatarURL, &user.IsActive, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt, &user.DeletedAt)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return domain.User{}, apperror.ErrConflict
		}
		return domain.User{}, err
	}
	return user, nil
}

func (r *Repository) GetUserByUsername(ctx context.Context, username string) (domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, full_name, role, avatar_url, is_active, password_hash, last_login_at, created_at, updated_at, deleted_at, deactivation_reason
		FROM users
		WHERE username = $1
	`, strings.ToLower(strings.TrimSpace(username))).
		Scan(&user.ID, &user.Username, &user.FullName, &user.Role, &user.AvatarURL, &user.IsActive, &user.PasswordHash, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt, &user.DeletedAt, &user.DeactivationReason)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.User{}, apperror.ErrNotFound
	}
	return user, err
}

func (r *Repository) GetUserByID(ctx context.Context, id int64) (domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, full_name, role, avatar_url, is_active, last_login_at, created_at, updated_at, deleted_at, deactivation_reason
		FROM users
		WHERE id = $1
	`, id).Scan(&user.ID, &user.Username, &user.FullName, &user.Role, &user.AvatarURL, &user.IsActive, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt, &user.DeletedAt, &user.DeactivationReason)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.User{}, apperror.ErrNotFound
	}
	return user, err
}

func (r *Repository) ListUsers(ctx context.Context, filters domain.UserFilters) (domain.PagedUsers, error) {
	page := filters.Page
	if page <= 0 {
		page = 1
	}
	pageSize := filters.PageSize
	if pageSize <= 0 || pageSize > 50 {
		pageSize = 50
	}

	args := []any{}
	conditions := []string{"1=1"}
	argIndex := 1

	query := strings.TrimSpace(filters.Query)
	if query != "" {
		conditions = append(conditions, fmt.Sprintf("(username ILIKE $%d OR full_name ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+query+"%")
		argIndex++
	}
	if filters.Role != "" {
		conditions = append(conditions, fmt.Sprintf("role = $%d", argIndex))
		args = append(args, filters.Role)
		argIndex++
	}
	switch filters.Status {
	case "active":
		conditions = append(conditions, "is_active = TRUE", "deleted_at IS NULL")
	case "inactive":
		conditions = append(conditions, "is_active = FALSE", "deleted_at IS NULL")
	case "archived":
		conditions = append(conditions, "deleted_at IS NOT NULL")
	default:
		conditions = append(conditions, "deleted_at IS NULL")
	}

	var total int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM users
		WHERE `+strings.Join(conditions, " AND "), args...).Scan(&total)
	if err != nil {
		return domain.PagedUsers{}, err
	}

	offset := (page - 1) * pageSize
	args = append(args, pageSize, offset)

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, username, full_name, role, avatar_url, is_active, last_login_at, created_at, updated_at, deleted_at, deactivation_reason
		FROM users
		WHERE `+strings.Join(conditions, " AND ")+`
		ORDER BY created_at DESC, id DESC
		LIMIT $`+fmt.Sprint(argIndex)+` OFFSET $`+fmt.Sprint(argIndex+1), args...)
	if err != nil {
		return domain.PagedUsers{}, err
	}
	defer rows.Close()

	items := []domain.User{}
	for rows.Next() {
		item, err := scanUser(rows)
		if err != nil {
			return domain.PagedUsers{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return domain.PagedUsers{}, err
	}

	return domain.PagedUsers{
		Items: items,
		Pagination: domain.Pagination{
			Page:     page,
			PageSize: pageSize,
			Total:    total,
		},
	}, nil
}

func (r *Repository) CreateAdminUser(ctx context.Context, input domain.AdminUserInput, passwordHash string) (domain.User, error) {
	user, err := scanUser(r.db.QueryRowContext(ctx, `
		INSERT INTO users(username, password_hash, full_name, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, username, full_name, role, avatar_url, is_active, last_login_at, created_at, updated_at, deleted_at, deactivation_reason
	`, strings.ToLower(strings.TrimSpace(input.Username)), passwordHash, strings.TrimSpace(input.FullName), input.Role))
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return domain.User{}, apperror.ErrConflict
		}
		return domain.User{}, err
	}
	return user, nil
}

func (r *Repository) UpdateUser(ctx context.Context, id int64, input domain.AdminUserInput) (domain.User, error) {
	user, err := scanUser(r.db.QueryRowContext(ctx, `
		UPDATE users
		SET username = $2,
			full_name = $3,
			role = $4,
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, username, full_name, role, avatar_url, is_active, last_login_at, created_at, updated_at, deleted_at, deactivation_reason
	`, id, strings.ToLower(strings.TrimSpace(input.Username)), strings.TrimSpace(input.FullName), input.Role))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.User{}, apperror.ErrNotFound
	}
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return domain.User{}, apperror.ErrConflict
		}
		return domain.User{}, err
	}
	return user, nil
}

func (r *Repository) SetUserActive(ctx context.Context, id int64, isActive bool, reason string) (domain.User, error) {
	user, err := scanUser(r.db.QueryRowContext(ctx, `
		UPDATE users
		SET is_active = $2,
			deactivation_reason = $3,
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, username, full_name, role, avatar_url, is_active, last_login_at, created_at, updated_at, deleted_at, deactivation_reason
	`, id, isActive, reason))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.User{}, apperror.ErrNotFound
	}
	return user, err
}



func (r *Repository) UpdateLastLoginAt(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET last_login_at = NOW() WHERE id = $1", id)
	return err
}

func (r *Repository) DeleteUser(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, "UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL", id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *Repository) RestoreUser(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, "UPDATE users SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL", id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *Repository) DeactivateInactiveUsers(ctx context.Context, threshold time.Time) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET is_active = false, deactivation_reason = 'Автоматическая деактивация (более 6 месяцев бездействия)' WHERE last_login_at < $1 AND is_active = true", threshold)
	return err
}

func (r *Repository) CreateSubmission(ctx context.Context, userID int64, input domain.CreateSubmissionInput) (domain.DocumentSubmission, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO document_submissions(
			user_id,
			title,
			author,
			executor,
			scientific_advisor,
			place_of_publication,
			publisher,
			periodical_name,
			volume,
			year,
			type,
			description,
			tags,
			comment,
			file_path,
			file_name,
			file_size_bytes,
			mime_type,
			cover_path,
			status,
			source,
			is_local
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'pending', $20, $21)
		RETURNING id
	`,
		userID,
		input.Title,
		input.Author,
		input.Executor,
		input.ScientificAdvisor,
		input.PlaceOfPublication,
		input.Publisher,
		input.PeriodicalName,
		input.Volume,
		input.Year,
		input.Type,
		input.Description,
		input.Tags,
		input.Comment,
		input.FilePath,
		input.FileName,
		input.FileSize,
		input.MimeType,
		input.CoverPath,
		input.Source,
		input.IsLocal,
	).Scan(&id)
	if err != nil {
		return domain.DocumentSubmission{}, err
	}

	return r.GetSubmissionByID(ctx, id)
}

func (r *Repository) GetSubmissionByID(ctx context.Context, id int64) (domain.DocumentSubmission, error) {
	item, err := scanSubmission(r.db.QueryRowContext(ctx, `
		SELECT
			s.id,
			s.user_id,
			s.title,
			s.author,
			s.executor,
			s.scientific_advisor,
			s.place_of_publication,
			s.publisher,
			s.periodical_name,
			s.volume,
			s.year,
			s.type,
			s.description,
			s.tags,
			s.comment,
			s.file_path,
			s.file_name,
			s.file_size_bytes,
			s.mime_type,
			s.cover_path,
			s.status,
			s.source,
			s.is_local,
			s.moderation_note,
			COALESCE(s.approved_document_id, 0),
			COALESCE(s.reviewed_by, 0),
			s.reviewed_at,
			s.created_at,
			s.updated_at,
			u.full_name,
			u.username,
			COALESCE(reviewer.full_name, ''),
			COALESCE(reviewer.username, '')
		FROM document_submissions s
		JOIN users u ON u.id = s.user_id
		LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by
		WHERE s.id = $1
	`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.DocumentSubmission{}, apperror.ErrNotFound
	}
	if err != nil {
		return domain.DocumentSubmission{}, err
	}
	return item, nil
}

func (r *Repository) ListSubmissionsByUser(ctx context.Context, userID int64) ([]domain.DocumentSubmission, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			s.id,
			s.user_id,
			s.title,
			s.author,
			s.executor,
			s.scientific_advisor,
			s.place_of_publication,
			s.publisher,
			s.periodical_name,
			s.volume,
			s.year,
			s.type,
			s.description,
			s.tags,
			s.comment,
			s.file_path,
			s.file_name,
			s.file_size_bytes,
			s.mime_type,
			s.cover_path,
			s.status,
			s.source,
			s.is_local,
			s.moderation_note,
			COALESCE(s.approved_document_id, 0),
			COALESCE(s.reviewed_by, 0),
			s.reviewed_at,
			s.created_at,
			s.updated_at,
			u.full_name,
			u.username,
			COALESCE(reviewer.full_name, ''),
			COALESCE(reviewer.username, '')
		FROM document_submissions s
		JOIN users u ON u.id = s.user_id
		LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by
		WHERE s.user_id = $1
		ORDER BY s.updated_at DESC, s.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.DocumentSubmission{}
	for rows.Next() {
		item, err := scanSubmission(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListSubmissions(ctx context.Context, status domain.SubmissionStatus) ([]domain.DocumentSubmission, error) {
	query := `
		SELECT
			s.id,
			s.user_id,
			s.title,
			s.author,
			s.executor,
			s.scientific_advisor,
			s.place_of_publication,
			s.publisher,
			s.periodical_name,
			s.volume,
			s.year,
			s.type,
			s.description,
			s.tags,
			s.comment,
			s.file_path,
			s.file_name,
			s.file_size_bytes,
			s.mime_type,
			s.cover_path,
			s.status,
			s.source,
			s.is_local,
			s.moderation_note,
			COALESCE(s.approved_document_id, 0),
			COALESCE(s.reviewed_by, 0),
			s.reviewed_at,
			s.created_at,
			s.updated_at,
			u.full_name,
			u.username,
			COALESCE(reviewer.full_name, ''),
			COALESCE(reviewer.username, '')
		FROM document_submissions s
		JOIN users u ON u.id = s.user_id
		LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by
	`

	args := []any{}
	if status != "" {
		query += ` WHERE s.status = $1`
		args = append(args, status)
	}
	query += ` ORDER BY s.created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.DocumentSubmission{}
	for rows.Next() {
		item, err := scanSubmission(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) HasPendingSubmissionByFileName(ctx context.Context, fileName string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM document_submissions
			WHERE status = 'pending' AND LOWER(file_name) = LOWER($1)
		)
	`, strings.TrimSpace(fileName)).Scan(&exists)
	return exists, err
}

func (r *Repository) HasDocumentByFileName(ctx context.Context, fileName string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM documents
			WHERE LOWER(file_name) = LOWER($1)
		)
	`, strings.TrimSpace(fileName)).Scan(&exists)
	return exists, err
}

func (r *Repository) SaveSearchHistory(ctx context.Context, userID int64, query string) error {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO search_history(user_id, query)
		VALUES ($1, $2)
	`, userID, query)
	return err
}

func (r *Repository) ListSearchHistory(ctx context.Context, userID int64, limit int) ([]domain.SearchHistoryItem, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, query, created_at
		FROM search_history
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.SearchHistoryItem{}
	for rows.Next() {
		var item domain.SearchHistoryItem
		if err := rows.Scan(&item.ID, &item.Query, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func buildOrder(sort string) string {
	switch sort {
	case "date_asc":
		return "ORDER BY d.created_at ASC"
	case "date_desc":
		return "ORDER BY d.created_at DESC"
	case "size_asc":
		return "ORDER BY d.file_size_bytes ASC"
	case "size_desc":
		return "ORDER BY d.file_size_bytes DESC"
	case "title_asc":
		return "ORDER BY d.title ASC"
	case "title_desc":
		return "ORDER BY d.title DESC"
	case "type_asc":
		return "ORDER BY d.type ASC, d.title ASC"
	case "type_desc":
		return "ORDER BY d.type DESC, d.title ASC"
	default:
		return "ORDER BY similarity DESC, d.created_at DESC"
	}
}

func parseTextArray(value string) []string {
	value = strings.Trim(value, "{}")
	if value == "" {
		return []string{}
	}
	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.Trim(strings.TrimSpace(part), `"`)
		if part != "" {
			items = append(items, part)
		}
	}
	return items
}

func nullableInt64(value int64) any {
	if value <= 0 {
		return nil
	}
	return value
}

func scanSubmission(row rowScanner) (domain.DocumentSubmission, error) {
	var item domain.DocumentSubmission
	var reviewedAt sql.NullTime

	err := row.Scan(
		&item.ID,
		&item.UserID,
		&item.Title,
		&item.Author,
		&item.Executor,
		&item.ScientificAdvisor,
		&item.PlaceOfPublication,
		&item.Publisher,
		&item.PeriodicalName,
		&item.Volume,
		&item.Year,
		&item.Type,
		&item.Description,
		&item.Tags,
		&item.Comment,
		&item.FilePath,
		&item.FileName,
		&item.FileSizeBytes,
		&item.MimeType,
		&item.CoverPath,
		&item.Status,
		&item.Source,
		&item.IsLocal,
		&item.ModerationNote,
		&item.ApprovedDocumentID,
		&item.ReviewedBy,
		&reviewedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.UploaderName,
		&item.UploaderUsername,
		&item.ReviewerName,
		&item.ReviewerUsername,
	)
	if err != nil {
		return domain.DocumentSubmission{}, err
	}

	if reviewedAt.Valid {
		item.ReviewedAt = &reviewedAt.Time
	}

	return item, nil
}

func (r *Repository) ListDocuments(ctx context.Context, userID int64, filters domain.DocumentFilters, adminMode bool) (domain.PagedDocuments, error) {
	page := filters.Page
	if page <= 0 {
		page = 1
	}
	pageSize := filters.PageSize
	if pageSize <= 0 || pageSize > 50 {
		pageSize = 12
	}

	requestedQuery := strings.TrimSpace(filters.Query)
	likeQuery := "%" + requestedQuery + "%"
	requestedAuthor := strings.TrimSpace(filters.Author)
	likeAuthor := "%" + requestedAuthor + "%"
	tagTerms := splitFilterTerms(filters.TagsQuery)

	queryArgs := []any{userID}
	queryConditions := []string{"1=1"}
	queryArgIndex := 2

	countArgs := []any{}
	countConditions := []string{"1=1"}
	countArgIndex := 1

	if filters.IncludeDeleted {
		queryConditions = append(queryConditions, "d.deleted_at IS NOT NULL")
		countConditions = append(countConditions, "d.deleted_at IS NOT NULL")
	} else {
		queryConditions = append(queryConditions, "d.deleted_at IS NULL")
		countConditions = append(countConditions, "d.deleted_at IS NULL")
	}

	if filters.IsLocal != nil {
		queryConditions = append(queryConditions, fmt.Sprintf("d.is_local = $%d", queryArgIndex))
		queryArgs = append(queryArgs, *filters.IsLocal)
		queryArgIndex++

		countConditions = append(countConditions, fmt.Sprintf("d.is_local = $%d", countArgIndex))
		countArgs = append(countArgs, *filters.IsLocal)
		countArgIndex++
	}

	if requestedQuery != "" {
		queryConditions = append(
			queryConditions,
			fmt.Sprintf(
				`(
					d.title %% $%d OR d.title ILIKE $%d OR
					d.author %% $%d OR d.author ILIKE $%d OR
					EXISTS (
						SELECT 1 FROM document_tags dt2
						JOIN tags t2 ON t2.id = dt2.tag_id
						WHERE dt2.document_id = d.id AND (t2.name %% $%d OR t2.name ILIKE $%d)
					)
				)`,
				queryArgIndex,
				queryArgIndex+1,
				queryArgIndex+2,
				queryArgIndex+3,
				queryArgIndex+4,
				queryArgIndex+5,
			),
		)
		queryArgs = append(
			queryArgs,
			requestedQuery,
			likeQuery,
			requestedQuery,
			likeQuery,
			requestedQuery,
			likeQuery,
		)
		queryArgIndex += 6

		countConditions = append(
			countConditions,
			fmt.Sprintf(
				`(
					d.title %% $%d OR d.title ILIKE $%d OR
					d.author %% $%d OR d.author ILIKE $%d OR
					EXISTS (
						SELECT 1 FROM document_tags dt2
						JOIN tags t2 ON t2.id = dt2.tag_id
						WHERE dt2.document_id = d.id AND (t2.name %% $%d OR t2.name ILIKE $%d)
					)
				)`,
				countArgIndex,
				countArgIndex+1,
				countArgIndex+2,
				countArgIndex+3,
				countArgIndex+4,
				countArgIndex+5,
			),
		)
		countArgs = append(
			countArgs,
			requestedQuery,
			likeQuery,
			requestedQuery,
			likeQuery,
			requestedQuery,
			likeQuery,
		)
		countArgIndex += 6
	}
	if strings.TrimSpace(filters.Type) != "" {
		queryConditions = append(queryConditions, fmt.Sprintf("d.type = $%d", queryArgIndex))
		queryArgs = append(queryArgs, strings.TrimSpace(filters.Type))
		queryArgIndex++

		countConditions = append(countConditions, fmt.Sprintf("d.type = $%d", countArgIndex))
		countArgs = append(countArgs, strings.TrimSpace(filters.Type))
		countArgIndex++
	}
	if requestedAuthor != "" {
		queryConditions = append(
			queryConditions,
			fmt.Sprintf("(d.author %% $%d OR d.author ILIKE $%d)", queryArgIndex, queryArgIndex+1),
		)
		queryArgs = append(queryArgs, requestedAuthor, likeAuthor)
		queryArgIndex += 2

		countConditions = append(
			countConditions,
			fmt.Sprintf("(d.author %% $%d OR d.author ILIKE $%d)", countArgIndex, countArgIndex+1),
		)
		countArgs = append(countArgs, requestedAuthor, likeAuthor)
		countArgIndex += 2
	}
	if len(tagTerms) > 0 {
		queryTagConditions := make([]string, 0, len(tagTerms))
		for _, term := range tagTerms {
			queryTagConditions = append(
				queryTagConditions,
				fmt.Sprintf("(t2.name %% $%d OR t2.name ILIKE $%d)", queryArgIndex, queryArgIndex+1),
			)
			queryArgs = append(queryArgs, term, "%"+term+"%")
			queryArgIndex += 2
		}
		queryConditions = append(
			queryConditions,
			fmt.Sprintf(
				`EXISTS (
					SELECT 1 FROM document_tags dt2
					JOIN tags t2 ON t2.id = dt2.tag_id
					WHERE dt2.document_id = d.id AND (%s)
				)`,
				strings.Join(queryTagConditions, " OR "),
			),
		)

		countTagConditions := make([]string, 0, len(tagTerms))
		for _, term := range tagTerms {
			countTagConditions = append(
				countTagConditions,
				fmt.Sprintf("(t2.name %% $%d OR t2.name ILIKE $%d)", countArgIndex, countArgIndex+1),
			)
			countArgs = append(countArgs, term, "%"+term+"%")
			countArgIndex += 2
		}
		countConditions = append(
			countConditions,
			fmt.Sprintf(
				`EXISTS (
					SELECT 1 FROM document_tags dt2
					JOIN tags t2 ON t2.id = dt2.tag_id
					WHERE dt2.document_id = d.id AND (%s)
				)`,
				strings.Join(countTagConditions, " OR "),
			),
		)
	}
	if filters.YearFrom > 0 {
		queryConditions = append(queryConditions, fmt.Sprintf("d.year >= $%d", queryArgIndex))
		queryArgs = append(queryArgs, filters.YearFrom)
		queryArgIndex++

		countConditions = append(countConditions, fmt.Sprintf("d.year >= $%d", countArgIndex))
		countArgs = append(countArgs, filters.YearFrom)
		countArgIndex++
	}
	if filters.YearTo > 0 {
		queryConditions = append(queryConditions, fmt.Sprintf("d.year <= $%d", queryArgIndex))
		queryArgs = append(queryArgs, filters.YearTo)
		queryArgIndex++

		countConditions = append(countConditions, fmt.Sprintf("d.year <= $%d", countArgIndex))
		countArgs = append(countArgs, filters.YearTo)
		countArgIndex++
	}
	similarityArg := queryArgIndex
	queryArgs = append(queryArgs, requestedQuery)

	query := `
		SELECT
			d.id,
			d.title,
			d.author,
			d.executor,
			d.scientific_advisor,
			d.year,
			d.type,
			d.place_of_publication,
			d.publisher,
			d.periodical_name,
			d.volume,
			d.description,
			d.file_path,
			d.file_name,
			d.file_size_bytes,
			d.mime_type,
			d.cover_path,
			d.created_at,
			d.updated_at,
			d.deleted_at,
			d.is_local,
			COALESCE(array_to_string(array_agg(DISTINCT t.name), ','), '') AS tags,
			CASE WHEN $1 > 0 THEN EXISTS (
				SELECT 1 FROM favorites fav WHERE fav.user_id = $1 AND fav.document_id = d.id
			) ELSE FALSE END AS is_favorite,
			CASE WHEN $` + fmt.Sprintf("%d", similarityArg) + ` <> '' THEN GREATEST(
				similarity(d.title, $` + fmt.Sprintf("%d", similarityArg) + `),
				similarity(d.author, $` + fmt.Sprintf("%d", similarityArg) + `),
				similarity(d.type, $` + fmt.Sprintf("%d", similarityArg) + `),
				similarity(d.description, $` + fmt.Sprintf("%d", similarityArg) + `)
			) ELSE 0 END AS similarity
		FROM documents d
		LEFT JOIN document_tags dt ON dt.document_id = d.id
		LEFT JOIN tags t ON t.id = dt.tag_id
		WHERE ` + strings.Join(queryConditions, " AND ") + `
		GROUP BY d.id
		` + buildOrder(filters.Sort) + `
		LIMIT ` + fmt.Sprintf("%d", pageSize) + ` OFFSET ` + fmt.Sprintf("%d", (page-1)*pageSize)

	rows, err := r.db.QueryContext(ctx, query, queryArgs...)
	if err != nil {
		return domain.PagedDocuments{}, err
	}
	defer rows.Close()

	items := []domain.Document{}
	for rows.Next() {
		var item domain.Document
		var tags string
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Author,
			&item.Executor,
			&item.ScientificAdvisor,
			&item.Year,
			&item.Type,
			&item.PlaceOfPublication,
			&item.Publisher,
			&item.PeriodicalName,
			&item.Volume,
			&item.Description,
			&item.FilePath,
			&item.FileName,
			&item.FileSizeBytes,
			&item.MimeType,
			&item.CoverPath,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.DeletedAt,
			&item.IsLocal,
			&tags,
			&item.IsFavorite,
			&item.Similarity,
		); err != nil {
			return domain.PagedDocuments{}, err
		}
		item.Tags = parseTextArray(tags)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return domain.PagedDocuments{}, err
	}

	countQuery := `
		SELECT COUNT(*)
		FROM documents d
		WHERE ` + strings.Join(countConditions, " AND ")
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return domain.PagedDocuments{}, err
	}

	return domain.PagedDocuments{
		Items: items,
		Pagination: domain.Pagination{
			Page:     page,
			PageSize: pageSize,
			Total:    total,
		},
	}, nil
}

func (r *Repository) GetDocumentByID(ctx context.Context, userID, id int64, adminMode bool) (domain.Document, error) {
	query := `
		SELECT
			d.id,
			d.title,
			d.author,
			d.executor,
			d.scientific_advisor,
			d.year,
			d.type,
			d.place_of_publication,
			d.publisher,
			d.periodical_name,
			d.volume,
			d.description,
			d.file_path,
			d.file_name,
			d.file_size_bytes,
			d.mime_type,
			d.cover_path,
			d.created_at,
			d.updated_at,
			d.deleted_at,
			d.is_local,
			COALESCE(array_to_string(array_agg(DISTINCT t.name), ','), '') AS tags,
			CASE WHEN $1 > 0 THEN EXISTS (
				SELECT 1 FROM favorites fav WHERE fav.user_id = $1 AND fav.document_id = d.id
			) ELSE FALSE END AS is_favorite,
			0 AS similarity
		FROM documents d
		LEFT JOIN document_tags dt ON dt.document_id = d.id
		LEFT JOIN tags t ON t.id = dt.tag_id
		WHERE d.id = $2
	`
	if !adminMode {
		query += ` AND d.deleted_at IS NULL`
	}
	query += ` GROUP BY d.id`

	var document domain.Document
	var tags string
	err := r.db.QueryRowContext(ctx, query, userID, id).Scan(
		&document.ID,
		&document.Title,
		&document.Author,
		&document.Executor,
		&document.ScientificAdvisor,
		&document.Year,
		&document.Type,
		&document.PlaceOfPublication,
		&document.Publisher,
		&document.PeriodicalName,
		&document.Volume,
		&document.Description,
		&document.FilePath,
		&document.FileName,
		&document.FileSizeBytes,
		&document.MimeType,
		&document.CoverPath,
		&document.CreatedAt,
		&document.UpdatedAt,
		&document.DeletedAt,
		&document.IsLocal,
		&tags,
		&document.IsFavorite,
		&document.Similarity,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Document{}, apperror.ErrNotFound
	}
	if err != nil {
		return domain.Document{}, err
	}
	document.Tags = parseTextArray(tags)
	return document, nil
}

func (r *Repository) UpsertFavorite(ctx context.Context, userID, documentID int64, value bool) error {
	if value {
		_, err := r.db.ExecContext(ctx, `
			INSERT INTO favorites(user_id, document_id)
			VALUES ($1, $2)
			ON CONFLICT (user_id, document_id) DO NOTHING
		`, userID, documentID)
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM favorites
		WHERE user_id = $1 AND document_id = $2
	`, userID, documentID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) TrackOpen(ctx context.Context, userID, documentID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO recent_documents(user_id, document_id, last_opened_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id, document_id)
		DO UPDATE SET last_opened_at = EXCLUDED.last_opened_at
	`, userID, documentID); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO document_views(user_id, document_id)
		VALUES ($1, $2)
	`, userID, documentID); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repository) TrackDownload(ctx context.Context, userID *int64, documentID int64) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO document_downloads(user_id, document_id)
		VALUES ($1, $2)
	`, userID, documentID)
	return err
}

func (r *Repository) listDocumentsByRelation(ctx context.Context, relationTable, orderColumn string, userID int64, limit int) ([]domain.Document, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			d.id,
			d.title,
			d.author,
			d.executor,
			d.scientific_advisor,
			d.year,
			d.type,
			d.place_of_publication,
			d.publisher,
			d.periodical_name,
			d.volume,
			d.description,
			d.file_path,
			d.file_name,
			d.file_size_bytes,
			d.mime_type,
			d.cover_path,
			d.created_at,
			d.updated_at,
			d.deleted_at,
			d.is_local,
			COALESCE(array_to_string(array_agg(DISTINCT t.name), ','), '') AS tags,
			EXISTS (
				SELECT 1 FROM favorites fav WHERE fav.user_id = $1 AND fav.document_id = d.id
			) AS is_favorite,
			0 AS similarity
		FROM `+relationTable+` rel
		JOIN documents d ON d.id = rel.document_id
		LEFT JOIN document_tags dt ON dt.document_id = d.id
		LEFT JOIN tags t ON t.id = dt.tag_id
		WHERE rel.user_id = $1 AND d.deleted_at IS NULL
		GROUP BY d.id, rel.`+orderColumn+`
		ORDER BY rel.`+orderColumn+` DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.Document{}
	for rows.Next() {
		var item domain.Document
		var tags string
		if err := rows.Scan(
			&item.ID, &item.Title, &item.Author, &item.Executor, &item.ScientificAdvisor,
			&item.Year, &item.Type, &item.PlaceOfPublication, &item.Publisher, &item.PeriodicalName,
			&item.Volume, &item.Description,
			&item.FilePath, &item.FileName, &item.FileSizeBytes, &item.MimeType, &item.CoverPath,
			&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt, &item.IsLocal, &tags, &item.IsFavorite, &item.Similarity,
		); err != nil {
			return nil, err
		}
		item.Tags = parseTextArray(tags)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListRecent(ctx context.Context, userID int64, limit int) ([]domain.Document, error) {
	return r.listDocumentsByRelation(ctx, "recent_documents", "last_opened_at", userID, limit)
}

func (r *Repository) ListFavorites(ctx context.Context, userID int64, limit int) ([]domain.Document, error) {
	return r.listDocumentsByRelation(ctx, "favorites", "created_at", userID, limit)
}

func (r *Repository) CreateDocument(ctx context.Context, input domain.UpsertDocumentInput) (domain.Document, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Document{}, err
	}
	defer tx.Rollback()

	var id int64
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO documents(title, author, executor, scientific_advisor, year, type, place_of_publication, publisher, periodical_name, volume, description, file_path, file_name, file_size_bytes, mime_type, cover_path, is_local)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)

		RETURNING id

	`, input.Title, input.Author, input.Executor, input.ScientificAdvisor, input.Year, input.Type, input.PlaceOfPublication, input.Publisher, input.PeriodicalName, input.Volume, input.Description, input.FilePath, input.FileName, input.FileSize, input.MimeType, input.CoverPath, input.IsLocal).Scan(&id); err != nil {
		return domain.Document{}, err
	}

	if err := r.replaceTags(ctx, tx, id, input.Tags); err != nil {
		return domain.Document{}, err
	}

	if err := tx.Commit(); err != nil {
		return domain.Document{}, err
	}
	return r.GetDocumentByID(ctx, 0, id, true)
}

func (r *Repository) UpdateDocument(ctx context.Context, id int64, input domain.UpsertDocumentInput) (domain.Document, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Document{}, err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		UPDATE documents
		SET title = $2,
			author = $3,
			executor = $4,
			scientific_advisor = $5,
			year = $6,
			type = $7,
			place_of_publication = $8,
			publisher = $9,
			periodical_name = $10,
			volume = $11,
			description = $12,

			file_path = CASE WHEN $13 = '' THEN file_path ELSE $13 END,
			file_name = CASE WHEN $14 = '' THEN file_name ELSE $14 END,
			file_size_bytes = CASE WHEN $15 = 0 THEN file_size_bytes ELSE $15 END,
			mime_type = CASE WHEN $16 = '' THEN mime_type ELSE $16 END,
			cover_path = CASE WHEN $17 = '' THEN cover_path ELSE $17 END,
			is_local = $18,
			updated_at = NOW()
		WHERE id = $1
	`, id, input.Title, input.Author, input.Executor, input.ScientificAdvisor, input.Year, input.Type, input.PlaceOfPublication, input.Publisher, input.PeriodicalName, input.Volume, input.Description, input.FilePath, input.FileName, input.FileSize, input.MimeType, input.CoverPath, input.IsLocal)
	if err != nil {
		return domain.Document{}, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return domain.Document{}, err
	}
	if affected == 0 {
		return domain.Document{}, apperror.ErrNotFound
	}

	if err := r.replaceTags(ctx, tx, id, input.Tags); err != nil {
		return domain.Document{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Document{}, err
	}
	return r.GetDocumentByID(ctx, 0, id, true)
}

func (r *Repository) ApproveSubmission(ctx context.Context, submissionID, reviewerID int64, input domain.UpsertDocumentInput) (domain.Document, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Document{}, err
	}
	defer tx.Rollback()

	var status domain.SubmissionStatus
	var filePath string
	var fileName string
	var fileSize int64
	var mimeType string
	var coverPath string

	err = tx.QueryRowContext(ctx, `
		SELECT status, file_path, file_name, file_size_bytes, mime_type, cover_path
		FROM document_submissions
		WHERE id = $1
		FOR UPDATE
	`, submissionID).Scan(&status, &filePath, &fileName, &fileSize, &mimeType, &coverPath)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Document{}, apperror.ErrNotFound
	}
	if err != nil {
		return domain.Document{}, err
	}
	if status != domain.SubmissionStatusPending {
		return domain.Document{}, apperror.ErrConflict
	}

	var documentID int64
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO documents(title, author, executor, scientific_advisor, year, type, place_of_publication, publisher, periodical_name, volume, description, file_path, file_name, file_size_bytes, mime_type, cover_path)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id
	`, input.Title, input.Author, input.Executor, input.ScientificAdvisor, input.Year, input.Type, input.PlaceOfPublication, input.Publisher, input.PeriodicalName, input.Volume, input.Description, filePath, fileName, fileSize, mimeType, coverPath).Scan(&documentID); err != nil {
		return domain.Document{}, err
	}

	if err := r.replaceTags(ctx, tx, documentID, input.Tags); err != nil {
		return domain.Document{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE document_submissions
		SET status = 'approved',
			approved_document_id = $2,
			reviewed_by = $3,
			reviewed_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`, submissionID, documentID, reviewerID); err != nil {
		return domain.Document{}, err
	}

	if err := tx.Commit(); err != nil {
		return domain.Document{}, err
	}

	return r.GetDocumentByID(ctx, 0, documentID, true)
}

func (r *Repository) RejectSubmission(ctx context.Context, submissionID, reviewerID int64, moderationNote string) (domain.DocumentSubmission, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.DocumentSubmission{}, err
	}
	defer tx.Rollback()

	var status domain.SubmissionStatus
	err = tx.QueryRowContext(ctx, `
		SELECT status
		FROM document_submissions
		WHERE id = $1
		FOR UPDATE
	`, submissionID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.DocumentSubmission{}, apperror.ErrNotFound
	}
	if err != nil {
		return domain.DocumentSubmission{}, err
	}
	if status != domain.SubmissionStatusPending {
		return domain.DocumentSubmission{}, apperror.ErrConflict
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE document_submissions
		SET status = 'rejected',
			moderation_note = $2,
			reviewed_by = $3,
			reviewed_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`, submissionID, moderationNote, reviewerID); err != nil {
		return domain.DocumentSubmission{}, err
	}

	if err := tx.Commit(); err != nil {
		return domain.DocumentSubmission{}, err
	}

	return r.GetSubmissionByID(ctx, submissionID)
}

func (r *Repository) UpdateDocumentCoverPath(ctx context.Context, id int64, coverPath string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE documents
		SET cover_path = $2,
			updated_at = NOW()
		WHERE id = $1
	`, id, coverPath)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return apperror.ErrNotFound
	}

	return nil
}

func (r *Repository) replaceTags(ctx context.Context, tx *sql.Tx, documentID int64, tags []string) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM document_tags WHERE document_id = $1`, documentID); err != nil {
		return err
	}

	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag == "" {
			continue
		}

		var tagID int64
		if err := tx.QueryRowContext(ctx, `
			INSERT INTO tags(name)
			VALUES ($1)
			ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
			RETURNING id
		`, tag).Scan(&tagID); err != nil {
			return err
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO document_tags(document_id, tag_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, documentID, tagID); err != nil {
			return err
		}
	}

	return nil
}

func (r *Repository) DeleteDocument(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `UPDATE documents SET deleted_at = NOW() WHERE id = $1`, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *Repository) RestoreDocument(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `UPDATE documents SET deleted_at = NULL WHERE id = $1`, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *Repository) ImportDocument(ctx context.Context, title, author, docType, description, relativePath, fileName string, size int64, coverPath string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO documents(title, author, year, type, description, file_path, file_name, file_size_bytes, mime_type, cover_path)

		VALUES ($1, $2, EXTRACT(YEAR FROM NOW())::INT, $3, $4, $5, $6, $7, 'application/pdf', $8)

	`, title, author, docType, description, relativePath, fileName, size, coverPath)
	return err
}

func (r *Repository) ListDocumentTypes(ctx context.Context) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT type
		FROM documents
		WHERE TRIM(type) <> ''
		ORDER BY type
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []string{}
	for rows.Next() {
		var item string
		if err := rows.Scan(&item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateAuditEvent(ctx context.Context, input domain.CreateAuditEventInput) error {
	details := input.Details
	if details == nil {
		details = map[string]any{}
	}
	rawDetails, err := json.Marshal(details)
	if err != nil {
		return err
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO document_audit_events(
			action,
			actor_id,
			document_id,
			submission_id,
			document_title,
			file_name,
			details
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
	`,
		strings.TrimSpace(input.Action),
		nullableInt64(input.ActorID),
		nullableInt64(input.DocumentID),
		nullableInt64(input.SubmissionID),
		strings.TrimSpace(input.DocumentTitle),
		strings.TrimSpace(input.FileName),
		string(rawDetails),
	)
	return err
}

func scanAuditEvent(row rowScanner) (domain.DocumentAuditEvent, error) {
	var item domain.DocumentAuditEvent
	var rawDetails []byte
	err := row.Scan(
		&item.ID,
		&item.Action,
		&item.ActorID,
		&item.ActorName,
		&item.ActorUsername,
		&item.DocumentID,
		&item.SubmissionID,
		&item.DocumentTitle,
		&item.FileName,
		&rawDetails,
		&item.CreatedAt,
	)
	if err != nil {
		return domain.DocumentAuditEvent{}, err
	}
	if len(rawDetails) > 0 {
		if err := json.Unmarshal(rawDetails, &item.Details); err != nil {
			return domain.DocumentAuditEvent{}, err
		}
	}
	if item.Details == nil {
		item.Details = map[string]any{}
	}
	return item, nil
}

func (r *Repository) ListDocumentAuditEvents(ctx context.Context, documentID int64) ([]domain.DocumentAuditEvent, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			e.id,
			e.action,
			COALESCE(e.actor_id, 0),
			COALESCE(u.full_name, ''),
			COALESCE(u.username, ''),
			COALESCE(e.document_id, 0),
			COALESCE(e.submission_id, 0),
			e.document_title,
			e.file_name,
			e.details,
			e.created_at
		FROM document_audit_events e
		LEFT JOIN users u ON u.id = e.actor_id
		WHERE e.document_id = $1
			OR e.submission_id IN (
				SELECT id
				FROM document_submissions
				WHERE approved_document_id = $1
			)
		ORDER BY e.created_at DESC, e.id DESC
	`, documentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.DocumentAuditEvent{}
	for rows.Next() {
		item, err := scanAuditEvent(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListAuditEvents(ctx context.Context, filters domain.AuditFilters) (domain.PagedAuditEvents, error) {
	page := filters.Page
	if page <= 0 {
		page = 1
	}
	pageSize := filters.PageSize
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 50
	}

	args := []any{}
	conditions := []string{"1=1"}
	argIndex := 1
	if filters.Query != "" {
		conditions = append(conditions, fmt.Sprintf("(e.document_title ILIKE $%d OR e.file_name ILIKE $%d OR u.full_name ILIKE $%d OR u.username ILIKE $%d)", argIndex, argIndex, argIndex, argIndex))
		args = append(args, "%"+strings.TrimSpace(filters.Query)+"%")
		argIndex++
	}
	if filters.Action != "" {
		conditions = append(conditions, fmt.Sprintf("e.action = $%d", argIndex))
		args = append(args, strings.TrimSpace(filters.Action))
		argIndex++
	}
	if !filters.DateFrom.IsZero() {
		conditions = append(conditions, fmt.Sprintf("e.created_at >= $%d", argIndex))
		args = append(args, filters.DateFrom)
		argIndex++
	}
	if !filters.DateTo.IsZero() {
		conditions = append(conditions, fmt.Sprintf("e.created_at < $%d", argIndex))
		args = append(args, filters.DateTo)
		argIndex++
	}

	where := strings.Join(conditions, " AND ")
	var total int
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM document_audit_events e
		LEFT JOIN users u ON u.id = e.actor_id
		WHERE `+where, args...).Scan(&total); err != nil {
		return domain.PagedAuditEvents{}, err
	}

	args = append(args, pageSize, (page-1)*pageSize)
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			e.id,
			e.action,
			COALESCE(e.actor_id, 0),
			COALESCE(u.full_name, ''),
			COALESCE(u.username, ''),
			COALESCE(e.document_id, 0),
			COALESCE(e.submission_id, 0),
			e.document_title,
			e.file_name,
			e.details,
			e.created_at
		FROM document_audit_events e
		LEFT JOIN users u ON u.id = e.actor_id
		WHERE `+where+`
		ORDER BY e.created_at DESC, e.id DESC
		LIMIT $`+fmt.Sprint(argIndex)+` OFFSET $`+fmt.Sprint(argIndex+1), args...)
	if err != nil {
		return domain.PagedAuditEvents{}, err
	}
	defer rows.Close()

	items := []domain.DocumentAuditEvent{}
	for rows.Next() {
		item, err := scanAuditEvent(rows)
		if err != nil {
			return domain.PagedAuditEvents{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return domain.PagedAuditEvents{}, err
	}

	return domain.PagedAuditEvents{
		Items: items,
		Pagination: domain.Pagination{
			Page:     page,
			PageSize: pageSize,
			Total:    total,
		},
	}, nil
}

func (r *Repository) LogAPIRequest(ctx context.Context, method, path string, statusCode, durationMs int) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO api_requests_log(method, path, status_code, duration_ms)
		VALUES ($1, $2, $3, $4)
	`, method, path, statusCode, durationMs)
	return err
}

func (r *Repository) GetOldAuditEvents(ctx context.Context, olderThan time.Time) ([]domain.DocumentAuditEvent, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT e.id, e.action, e.document_id, COALESCE(d.title, ''), e.file_name, 
		       e.actor_id, COALESCE(u.username, ''), COALESCE(u.full_name, ''), e.created_at
		FROM document_audit_events e
		LEFT JOIN documents d ON d.id = e.document_id
		LEFT JOIN users u ON u.id = e.actor_id
		WHERE e.created_at < $1
		ORDER BY e.created_at ASC
	`, olderThan)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.DocumentAuditEvent
	for rows.Next() {
		item, err := scanAuditEvent(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repository) DeleteOldAuditEvents(ctx context.Context, olderThan time.Time) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM document_audit_events WHERE created_at < $1", olderThan)
	return err
}

func (r *Repository) DeleteOldAPIRequests(ctx context.Context, olderThan time.Time) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM api_requests_log WHERE created_at < $1", olderThan)
	return err
}


func (r *Repository) Stats(ctx context.Context, filters domain.StatsFilters) (domain.Stats, error) {
	stats := domain.Stats{}
	now := time.Now()
	dateFrom := filters.DateFrom
	if dateFrom.IsZero() {
		dateFrom = now.AddDate(0, -1, 0)
	}
	dateTo := filters.DateTo
	if dateTo.IsZero() {
		dateTo = now
	}
	if !dateTo.After(dateFrom) {
		dateTo = dateFrom.AddDate(0, 0, 1)
	}
	stats.UploadPeriodFrom = dateFrom
	stats.UploadPeriodTo = dateTo

	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM documents WHERE created_at < $1 AND deleted_at IS NULL`, dateTo).Scan(&stats.DocumentsCount); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM document_views WHERE created_at >= $1 AND created_at < $2`, dateFrom, dateTo).Scan(&stats.ViewsToday); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM document_downloads WHERE created_at >= $1 AND created_at < $2`, dateFrom, dateTo).Scan(&stats.DownloadsToday); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM search_history WHERE created_at >= $1 AND created_at < $2`, dateFrom, dateTo).Scan(&stats.SearchesToday); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM documents
		WHERE created_at >= $1 AND created_at < $2 AND deleted_at IS NULL
	`, dateFrom, dateTo).Scan(&stats.UploadedInPeriod); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM site_visits WHERE created_at >= $1 AND created_at < $2`, dateFrom, dateTo).Scan(&stats.VisitsInPeriod); err != nil {
		return stats, err
	}

	queryRows, err := r.db.QueryContext(ctx, `
		SELECT query, COUNT(*) AS count
		FROM search_history
		WHERE created_at >= $1 AND created_at < $2
		GROUP BY query
		ORDER BY count DESC, query ASC
		LIMIT 5
	`, dateFrom, dateTo)
	if err != nil {
		return stats, err
	}
	defer queryRows.Close()
	for queryRows.Next() {
		var item domain.NamedStat
		if err := queryRows.Scan(&item.Name, &item.Count); err != nil {
			return stats, err
		}
		stats.TopQueries = append(stats.TopQueries, item)
	}

	documentRows, err := r.db.QueryContext(ctx, `
		SELECT d.title, COUNT(*) AS count
		FROM document_views v
		JOIN documents d ON d.id = v.document_id
		WHERE v.created_at >= $1 AND v.created_at < $2
		GROUP BY d.title
		ORDER BY count DESC, d.title ASC
		LIMIT 5
	`, dateFrom, dateTo)
	if err != nil {
		return stats, err
	}
	defer documentRows.Close()
	for documentRows.Next() {
		var item domain.NamedStat
		if err := documentRows.Scan(&item.Name, &item.Count); err != nil {
			return stats, err
		}
		stats.TopDocuments = append(stats.TopDocuments, item)
	}

	typeRows, err := r.db.QueryContext(ctx, `
		SELECT type, COUNT(*) AS count
		FROM documents
		WHERE created_at >= $1 AND created_at < $2
		GROUP BY type
		ORDER BY count DESC, type ASC
	`, dateFrom, dateTo)
	if err != nil {
		return stats, err
	}
	defer typeRows.Close()
	for typeRows.Next() {
		var item domain.NamedStat
		if err := typeRows.Scan(&item.Name, &item.Count); err != nil {
			return stats, err
		}
		stats.DocumentsByType = append(stats.DocumentsByType, item)
	}

	duration := dateTo.Sub(dateFrom)
	var interval, format, sqlFormat string
	if duration <= 48*time.Hour {
		interval = "hour"
		format = "2006-01-02 15:00"
		sqlFormat = "YYYY-MM-DD HH24:00"
	} else if duration <= 60*24*time.Hour {
		interval = "day"
		format = "2006-01-02"
		sqlFormat = "YYYY-MM-DD"
	} else {
		interval = "month"
		format = "2006-01"
		sqlFormat = "YYYY-MM"
	}

	query := fmt.Sprintf(`
		SELECT TO_CHAR(DATE_TRUNC('%s', created_at), '%s') AS name, COUNT(*) AS count
		FROM api_requests_log
		WHERE created_at >= $1 AND created_at < $2
		GROUP BY DATE_TRUNC('%s', created_at)
	`, interval, sqlFormat, interval)

	loadRows, err := r.db.QueryContext(ctx, query, dateFrom, dateTo)
	if err != nil {
		return stats, err
	}
	defer loadRows.Close()

	countsMap := make(map[string]int)
	for loadRows.Next() {
		var name string
		var count int
		if err := loadRows.Scan(&name, &count); err != nil {
			return stats, err
		}
		countsMap[name] = count
	}

	stats.AppLoadByHour = make([]domain.NamedStat, 0)
	var curr time.Time
	if interval == "hour" {
		curr = dateFrom.Truncate(time.Hour)
	} else if interval == "day" {
		curr = time.Date(dateFrom.Year(), dateFrom.Month(), dateFrom.Day(), 0, 0, 0, 0, dateFrom.Location())
	} else {
		curr = time.Date(dateFrom.Year(), dateFrom.Month(), 1, 0, 0, 0, 0, dateFrom.Location())
	}

	for curr.Before(dateTo) {
		name := curr.Format(format)
		count := countsMap[name]
		stats.AppLoadByHour = append(stats.AppLoadByHour, domain.NamedStat{Name: name, Count: int64(count)})

		if interval == "hour" {
			curr = curr.Add(time.Hour)
		} else if interval == "day" {
			curr = curr.AddDate(0, 0, 1)
		} else {
			curr = curr.AddDate(0, 1, 0)
		}
	}

	return stats, nil
}

func (r *Repository) LogVisit(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO site_visits DEFAULT VALUES")
	return err
}