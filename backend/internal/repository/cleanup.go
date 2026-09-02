package repository

import (
	"context"
	"time"

	"library-backend/internal/apperror"
	"library-backend/internal/domain"
)

func (r *Repository) GetDeletedDocumentsForCleanup(ctx context.Context, olderThan time.Time) ([]domain.Document, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, file_path, cover_path
		FROM documents
		WHERE deleted_at IS NOT NULL AND deleted_at < $1
	`, olderThan)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Document
	for rows.Next() {
		var item domain.Document
		if err := rows.Scan(&item.ID, &item.FilePath, &item.CoverPath); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) GetRejectedSubmissionsForCleanup(ctx context.Context, olderThan time.Time) ([]domain.DocumentSubmission, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, file_path, cover_path
		FROM document_submissions
		WHERE status = 'rejected' AND reviewed_at < $1
	`, olderThan)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.DocumentSubmission
	for rows.Next() {
		var item domain.DocumentSubmission
		if err := rows.Scan(&item.ID, &item.FilePath, &item.CoverPath); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) HardDeleteDocument(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM documents WHERE id = $1 AND deleted_at IS NOT NULL`, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return apperror.ErrConflict
	}
	return nil
}

func (r *Repository) HardDeleteSubmission(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM document_submissions WHERE id = $1`, id)
	return err
}
