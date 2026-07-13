package repository

import (
	"context"
	"database/sql"

	"library-backend/internal/apperror"
	"library-backend/internal/domain"
)

func (r *Repository) GetUserWithPasswordByID(ctx context.Context, id int64) (domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, full_name, role, avatar_url, is_active, password_hash, last_login_at, created_at, updated_at, deleted_at, deactivation_reason
		FROM users
		WHERE id = $1
	`, id).Scan(&user.ID, &user.Username, &user.FullName, &user.Role, &user.AvatarURL, &user.IsActive, &user.PasswordHash, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt, &user.DeletedAt, &user.DeactivationReason)
	if err == sql.ErrNoRows {
		return domain.User{}, apperror.ErrNotFound
	}
	return user, err
}

func (r *Repository) UpdateUserPassword(ctx context.Context, id int64, newHash string) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET password_hash = $2,
			updated_at = NOW()
		WHERE id = $1
	`, id, newHash)
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
