package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

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

func (r *Repository) EnsureSeedData(ctx context.Context, adminEmail, adminName, adminPasswordHash string) error {
	seeds := []struct {
		faculty     string
		facultySlug string
		departments []struct {
			name string
			slug string
		}
	}{
		{
			faculty:     "ФКТИ",
			facultySlug: "fkti",
			departments: []struct {
				name string
				slug string
			}{
				{name: "Кафедра программной инженерии", slug: "software-engineering"},
				{name: "Кафедра информационных систем", slug: "information-systems"},
			},
		},
		{
			faculty:     "ФМИКН",
			facultySlug: "fmikn",
			departments: []struct {
				name string
				slug string
			}{
				{name: "Кафедра высшей математики", slug: "higher-math"},
				{name: "Кафедра прикладной информатики", slug: "applied-informatics"},
			},
		},
	}

	for _, seed := range seeds {
		var facultyID int64
		if err := r.db.QueryRowContext(ctx, `
			INSERT INTO faculties(name, slug)
			VALUES ($1, $2)
			ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug
			RETURNING id
		`, seed.faculty, seed.facultySlug).Scan(&facultyID); err != nil {
			return fmt.Errorf("seed faculty: %w", err)
		}

		for _, department := range seed.departments {
			if _, err := r.db.ExecContext(ctx, `
				INSERT INTO departments(faculty_id, name, slug)
				VALUES ($1, $2, $3)
				ON CONFLICT (faculty_id, name) DO UPDATE SET slug = EXCLUDED.slug
			`, facultyID, department.name, department.slug); err != nil {
				return fmt.Errorf("seed department: %w", err)
			}
		}
	}

	if _, err := r.db.ExecContext(ctx, `
		INSERT INTO users(email, password_hash, full_name, role)
		VALUES ($1, $2, $3, 'admin')
		ON CONFLICT (email) DO UPDATE
		SET password_hash = EXCLUDED.password_hash,
			full_name = EXCLUDED.full_name,
			role = 'admin'
	`, strings.ToLower(strings.TrimSpace(adminEmail)), adminPasswordHash, strings.TrimSpace(adminName)); err != nil {
		return fmt.Errorf("seed admin: %w", err)
	}

	return nil
}

func (r *Repository) EnsureSystemUser(ctx context.Context, email, fullName, passwordHash string) (domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO users(email, password_hash, full_name, role)
		VALUES ($1, $2, $3, 'admin')
		ON CONFLICT (email) DO UPDATE
		SET full_name = EXCLUDED.full_name,
			role = 'admin'
		RETURNING id, email, full_name, role, avatar_url, created_at
	`, strings.ToLower(strings.TrimSpace(email)), passwordHash, strings.TrimSpace(fullName)).
		Scan(&user.ID, &user.Email, &user.FullName, &user.Role, &user.AvatarURL, &user.CreatedAt)
	if err != nil {
		return domain.User{}, err
	}
	return user, nil
}

func (r *Repository) CreateUser(ctx context.Context, input domain.RegisterInput, passwordHash string) (domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO users(email, password_hash, full_name, role)
		VALUES ($1, $2, $3, 'user')
		RETURNING id, email, full_name, role, avatar_url, created_at
	`, strings.ToLower(strings.TrimSpace(input.Email)), passwordHash, strings.TrimSpace(input.FullName)).
		Scan(&user.ID, &user.Email, &user.FullName, &user.Role, &user.AvatarURL, &user.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return domain.User{}, apperror.ErrConflict
		}
		return domain.User{}, err
	}
	return user, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		SELECT id, email, full_name, role, avatar_url, password_hash, created_at
		FROM users
		WHERE email = $1
	`, strings.ToLower(strings.TrimSpace(email))).
		Scan(&user.ID, &user.Email, &user.FullName, &user.Role, &user.AvatarURL, &user.PasswordHash, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.User{}, apperror.ErrNotFound
	}
	return user, err
}

func (r *Repository) GetUserByID(ctx context.Context, id int64) (domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		SELECT id, email, full_name, role, avatar_url, created_at
		FROM users
		WHERE id = $1
	`, id).Scan(&user.ID, &user.Email, &user.FullName, &user.Role, &user.AvatarURL, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.User{}, apperror.ErrNotFound
	}
	return user, err
}

func (r *Repository) ListFaculties(ctx context.Context) ([]domain.Faculty, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, slug FROM faculties ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.Faculty{}
	for rows.Next() {
		var item domain.Faculty
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListDepartments(ctx context.Context, facultyID int64) ([]domain.Department, error) {
	query := `
		SELECT d.id, d.faculty_id, d.name, d.slug, f.name
		FROM departments d
		JOIN faculties f ON f.id = d.faculty_id
	`
	args := []any{}
	if facultyID > 0 {
		query += ` WHERE d.faculty_id = $1`
		args = append(args, facultyID)
	}
	query += ` ORDER BY f.name, d.name`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.Department{}
	for rows.Next() {
		var item domain.Department
		if err := rows.Scan(&item.ID, &item.FacultyID, &item.Name, &item.Slug, &item.Faculty); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateSubmission(ctx context.Context, userID int64, input domain.CreateSubmissionInput) (domain.DocumentSubmission, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO document_submissions(
			user_id,
			title,
			author,
			department_id,
			comment,
			file_path,
			file_name,
			file_size_bytes,
			mime_type,
			cover_path,
			status,
			source
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
		RETURNING id
	`,
		userID,
		input.Title,
		input.Author,
		nullableInt64(input.DepartmentID),
		input.Comment,
		input.FilePath,
		input.FileName,
		input.FileSize,
		input.MimeType,
		input.CoverPath,
		input.Source,
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
			COALESCE(dep.id, 0),
			COALESCE(dep.name, ''),
			COALESCE(f.id, 0),
			COALESCE(f.name, ''),
			s.comment,
			s.file_path,
			s.file_name,
			s.file_size_bytes,
			s.mime_type,
			s.cover_path,
			s.status,
			s.source,
			s.moderation_note,
			COALESCE(s.approved_document_id, 0),
			COALESCE(s.reviewed_by, 0),
			s.reviewed_at,
			s.created_at,
			s.updated_at,
			u.full_name,
			u.email
		FROM document_submissions s
		JOIN users u ON u.id = s.user_id
		LEFT JOIN departments dep ON dep.id = s.department_id
		LEFT JOIN faculties f ON f.id = dep.faculty_id
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
			COALESCE(dep.id, 0),
			COALESCE(dep.name, ''),
			COALESCE(f.id, 0),
			COALESCE(f.name, ''),
			s.comment,
			s.file_path,
			s.file_name,
			s.file_size_bytes,
			s.mime_type,
			s.cover_path,
			s.status,
			s.source,
			s.moderation_note,
			COALESCE(s.approved_document_id, 0),
			COALESCE(s.reviewed_by, 0),
			s.reviewed_at,
			s.created_at,
			s.updated_at,
			u.full_name,
			u.email
		FROM document_submissions s
		JOIN users u ON u.id = s.user_id
		LEFT JOIN departments dep ON dep.id = s.department_id
		LEFT JOIN faculties f ON f.id = dep.faculty_id
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
			COALESCE(dep.id, 0),
			COALESCE(dep.name, ''),
			COALESCE(f.id, 0),
			COALESCE(f.name, ''),
			s.comment,
			s.file_path,
			s.file_name,
			s.file_size_bytes,
			s.mime_type,
			s.cover_path,
			s.status,
			s.source,
			s.moderation_note,
			COALESCE(s.approved_document_id, 0),
			COALESCE(s.reviewed_by, 0),
			s.reviewed_at,
			s.created_at,
			s.updated_at,
			u.full_name,
			u.email
		FROM document_submissions s
		JOIN users u ON u.id = s.user_id
		LEFT JOIN departments dep ON dep.id = s.department_id
		LEFT JOIN faculties f ON f.id = dep.faculty_id
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
		&item.DepartmentID,
		&item.Department,
		&item.FacultyID,
		&item.Faculty,
		&item.Comment,
		&item.FilePath,
		&item.FileName,
		&item.FileSizeBytes,
		&item.MimeType,
		&item.CoverPath,
		&item.Status,
		&item.Source,
		&item.ModerationNote,
		&item.ApprovedDocumentID,
		&item.ReviewedBy,
		&reviewedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.UploaderName,
		&item.UploaderEmail,
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

	queryArgs := []any{userID}
	queryConditions := []string{"1=1"}
	queryArgIndex := 2

	countArgs := []any{}
	countConditions := []string{"1=1"}
	countArgIndex := 1

	if !adminMode {
		queryConditions = append(queryConditions, "d.is_visible = TRUE")
		countConditions = append(countConditions, "d.is_visible = TRUE")
	}
	if requestedQuery != "" {
		queryConditions = append(
			queryConditions,
			fmt.Sprintf(
				`(
					d.title %% $%d OR d.title ILIKE $%d OR
					d.author %% $%d OR d.author ILIKE $%d OR
					dep.name %% $%d OR dep.name ILIKE $%d OR
					f.name %% $%d OR f.name ILIKE $%d
				)`,
				queryArgIndex,
				queryArgIndex+1,
				queryArgIndex+2,
				queryArgIndex+3,
				queryArgIndex+4,
				queryArgIndex+5,
				queryArgIndex+6,
				queryArgIndex+7,
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
			requestedQuery,
			likeQuery,
		)
		queryArgIndex += 8

		countConditions = append(
			countConditions,
			fmt.Sprintf(
				`(
					d.title %% $%d OR d.title ILIKE $%d OR
					d.author %% $%d OR d.author ILIKE $%d OR
					dep.name %% $%d OR dep.name ILIKE $%d OR
					f.name %% $%d OR f.name ILIKE $%d
				)`,
				countArgIndex,
				countArgIndex+1,
				countArgIndex+2,
				countArgIndex+3,
				countArgIndex+4,
				countArgIndex+5,
				countArgIndex+6,
				countArgIndex+7,
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
			requestedQuery,
			likeQuery,
		)
		countArgIndex += 8
	}
	if filters.FacultyID > 0 {
		queryConditions = append(queryConditions, fmt.Sprintf("f.id = $%d", queryArgIndex))
		queryArgs = append(queryArgs, filters.FacultyID)
		queryArgIndex++

		countConditions = append(countConditions, fmt.Sprintf("f.id = $%d", countArgIndex))
		countArgs = append(countArgs, filters.FacultyID)
		countArgIndex++
	}
	if filters.DepartmentID > 0 {
		queryConditions = append(queryConditions, fmt.Sprintf("dep.id = $%d", queryArgIndex))
		queryArgs = append(queryArgs, filters.DepartmentID)
		queryArgIndex++

		countConditions = append(countConditions, fmt.Sprintf("dep.id = $%d", countArgIndex))
		countArgs = append(countArgs, filters.DepartmentID)
		countArgIndex++
	}
	if strings.TrimSpace(filters.Type) != "" {
		queryConditions = append(queryConditions, fmt.Sprintf("d.type = $%d", queryArgIndex))
		queryArgs = append(queryArgs, strings.TrimSpace(filters.Type))
		queryArgIndex++

		countConditions = append(countConditions, fmt.Sprintf("d.type = $%d", countArgIndex))
		countArgs = append(countArgs, strings.TrimSpace(filters.Type))
		countArgIndex++
	}
	if adminMode {
		switch filters.Visibility {
		case "visible":
			queryConditions = append(queryConditions, "d.is_visible = TRUE")
			countConditions = append(countConditions, "d.is_visible = TRUE")
		case "hidden":
			queryConditions = append(queryConditions, "d.is_visible = FALSE")
			countConditions = append(countConditions, "d.is_visible = FALSE")
		}
	}

	similarityArg := queryArgIndex
	queryArgs = append(queryArgs, requestedQuery)

	query := `
		SELECT
			d.id,
			d.title,
			d.author,
			d.year,
			d.type,
			d.description,
			d.file_path,
			d.file_name,
			d.file_size_bytes,
			d.mime_type,
			d.cover_path,
			d.is_visible,
			d.created_at,
			d.updated_at,
			dep.id,
			dep.name,
			f.id,
			f.name,
			COALESCE(array_to_string(array_agg(DISTINCT t.name), ','), '') AS tags,
			CASE WHEN $1 > 0 THEN EXISTS (
				SELECT 1 FROM favorites fav WHERE fav.user_id = $1 AND fav.document_id = d.id
			) ELSE FALSE END AS is_favorite,
			CASE WHEN $` + fmt.Sprintf("%d", similarityArg) + ` <> '' THEN GREATEST(
				similarity(d.title, $` + fmt.Sprintf("%d", similarityArg) + `),
				similarity(d.author, $` + fmt.Sprintf("%d", similarityArg) + `),
				similarity(dep.name, $` + fmt.Sprintf("%d", similarityArg) + `),
				similarity(f.name, $` + fmt.Sprintf("%d", similarityArg) + `)
			) ELSE 0 END AS similarity
		FROM documents d
		JOIN departments dep ON dep.id = d.department_id
		JOIN faculties f ON f.id = dep.faculty_id
		LEFT JOIN document_tags dt ON dt.document_id = d.id
		LEFT JOIN tags t ON t.id = dt.tag_id
		WHERE ` + strings.Join(queryConditions, " AND ") + `
		GROUP BY d.id, dep.id, f.id
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
			&item.Year,
			&item.Type,
			&item.Description,
			&item.FilePath,
			&item.FileName,
			&item.FileSizeBytes,
			&item.MimeType,
			&item.CoverPath,
			&item.IsVisible,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.DepartmentID,
			&item.Department,
			&item.FacultyID,
			&item.Faculty,
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
		JOIN departments dep ON dep.id = d.department_id
		JOIN faculties f ON f.id = dep.faculty_id
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
			d.year,
			d.type,
			d.description,
			d.file_path,
			d.file_name,
			d.file_size_bytes,
			d.mime_type,
			d.cover_path,
			d.is_visible,
			d.created_at,
			d.updated_at,
			dep.id,
			dep.name,
			f.id,
			f.name,
			COALESCE(array_to_string(array_agg(DISTINCT t.name), ','), '') AS tags,
			CASE WHEN $1 > 0 THEN EXISTS (
				SELECT 1 FROM favorites fav WHERE fav.user_id = $1 AND fav.document_id = d.id
			) ELSE FALSE END AS is_favorite,
			0 AS similarity
		FROM documents d
		JOIN departments dep ON dep.id = d.department_id
		JOIN faculties f ON f.id = dep.faculty_id
		LEFT JOIN document_tags dt ON dt.document_id = d.id
		LEFT JOIN tags t ON t.id = dt.tag_id
		WHERE d.id = $2
	`
	if !adminMode {
		query += ` AND d.is_visible = TRUE`
	}
	query += ` GROUP BY d.id, dep.id, f.id`

	var document domain.Document
	var tags string
	err := r.db.QueryRowContext(ctx, query, userID, id).Scan(
		&document.ID,
		&document.Title,
		&document.Author,
		&document.Year,
		&document.Type,
		&document.Description,
		&document.FilePath,
		&document.FileName,
		&document.FileSizeBytes,
		&document.MimeType,
		&document.CoverPath,
		&document.IsVisible,
		&document.CreatedAt,
		&document.UpdatedAt,
		&document.DepartmentID,
		&document.Department,
		&document.FacultyID,
		&document.Faculty,
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
			d.year,
			d.type,
			d.description,
			d.file_path,
			d.file_name,
			d.file_size_bytes,
			d.mime_type,
			d.cover_path,
			d.is_visible,
			d.created_at,
			d.updated_at,
			dep.id,
			dep.name,
			f.id,
			f.name,
			COALESCE(array_to_string(array_agg(DISTINCT t.name), ','), '') AS tags,
			TRUE AS is_favorite,
			0 AS similarity
		FROM `+relationTable+` rel
		JOIN documents d ON d.id = rel.document_id
		JOIN departments dep ON dep.id = d.department_id
		JOIN faculties f ON f.id = dep.faculty_id
		LEFT JOIN document_tags dt ON dt.document_id = d.id
		LEFT JOIN tags t ON t.id = dt.tag_id
		WHERE rel.user_id = $1 AND d.is_visible = TRUE
		GROUP BY d.id, dep.id, f.id, rel.`+orderColumn+`
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
			&item.ID, &item.Title, &item.Author, &item.Year, &item.Type, &item.Description,
			&item.FilePath, &item.FileName, &item.FileSizeBytes, &item.MimeType, &item.CoverPath,
			&item.IsVisible, &item.CreatedAt, &item.UpdatedAt, &item.DepartmentID, &item.Department,
			&item.FacultyID, &item.Faculty, &tags, &item.IsFavorite, &item.Similarity,
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
		INSERT INTO documents(title, author, year, type, department_id, description, file_path, file_name, file_size_bytes, mime_type, cover_path, is_visible)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`, input.Title, input.Author, input.Year, input.Type, input.DepartmentID, input.Description, input.FilePath, input.FileName, input.FileSize, input.MimeType, input.CoverPath, input.IsVisible).Scan(&id); err != nil {
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
			year = $4,
			type = $5,
			department_id = $6,
			description = $7,
			file_path = CASE WHEN $8 = '' THEN file_path ELSE $8 END,
			file_name = CASE WHEN $9 = '' THEN file_name ELSE $9 END,
			file_size_bytes = CASE WHEN $10 = 0 THEN file_size_bytes ELSE $10 END,
			mime_type = CASE WHEN $11 = '' THEN mime_type ELSE $11 END,
			cover_path = CASE WHEN $12 = '' THEN cover_path ELSE $12 END,
			is_visible = $13,
			updated_at = NOW()
		WHERE id = $1
	`, id, input.Title, input.Author, input.Year, input.Type, input.DepartmentID, input.Description, input.FilePath, input.FileName, input.FileSize, input.MimeType, input.CoverPath, input.IsVisible)
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
		INSERT INTO documents(title, author, year, type, department_id, description, file_path, file_name, file_size_bytes, mime_type, cover_path, is_visible)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`, input.Title, input.Author, input.Year, input.Type, input.DepartmentID, input.Description, filePath, fileName, fileSize, mimeType, coverPath, input.IsVisible).Scan(&documentID); err != nil {
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
	result, err := r.db.ExecContext(ctx, `DELETE FROM documents WHERE id = $1`, id)
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

func (r *Repository) ImportDocument(ctx context.Context, title, author, docType, description, relativePath, fileName string, size int64, departmentID int64, coverPath string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO documents(title, author, year, type, department_id, description, file_path, file_name, file_size_bytes, mime_type, cover_path, is_visible)
		VALUES ($1, $2, EXTRACT(YEAR FROM NOW())::INT, $3, $4, $5, $6, $7, $8, 'application/pdf', $9, TRUE)
	`, title, author, docType, departmentID, description, relativePath, fileName, size, coverPath)
	return err
}

func (r *Repository) Stats(ctx context.Context) (domain.Stats, error) {
	stats := domain.Stats{}

	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM documents`).Scan(&stats.DocumentsCount); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM document_views WHERE created_at >= CURRENT_DATE`).Scan(&stats.ViewsToday); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM document_downloads WHERE created_at >= CURRENT_DATE`).Scan(&stats.DownloadsToday); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM search_history WHERE created_at >= CURRENT_DATE`).Scan(&stats.SearchesToday); err != nil {
		return stats, err
	}

	queryRows, err := r.db.QueryContext(ctx, `
		SELECT query, COUNT(*) AS count
		FROM search_history
		GROUP BY query
		ORDER BY count DESC, query ASC
		LIMIT 5
	`)
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
		GROUP BY d.title
		ORDER BY count DESC, d.title ASC
		LIMIT 5
	`)
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

	facultyRows, err := r.db.QueryContext(ctx, `
		SELECT f.name, COUNT(d.id)
		FROM faculties f
		LEFT JOIN departments dep ON dep.faculty_id = f.id
		LEFT JOIN documents d ON d.department_id = dep.id
		GROUP BY f.name
		ORDER BY f.name
	`)
	if err != nil {
		return stats, err
	}
	defer facultyRows.Close()
	for facultyRows.Next() {
		var item domain.FacultyDocStat
		if err := facultyRows.Scan(&item.Faculty, &item.Count); err != nil {
			return stats, err
		}
		stats.DocumentsByFaculty = append(stats.DocumentsByFaculty, item)
	}

	return stats, nil
}
