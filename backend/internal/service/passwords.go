package service

import (
	"context"
	"fmt"
	"strings"

	"library-backend/internal/apperror"
	"library-backend/internal/auth"
	"library-backend/internal/domain"
)

func (s *Service) ChangeMyPassword(ctx context.Context, userID int64, input domain.ChangePasswordInput) error {
	oldPw := strings.TrimSpace(input.OldPassword)
	newPw := strings.TrimSpace(input.NewPassword)
	if len([]rune(newPw)) < 6 || oldPw == "" {
		return apperror.ErrInvalidInput
	}
	user, err := s.repo.GetUserWithPasswordByID(ctx, userID)
	if err != nil {
		return err
	}
	if err := auth.ComparePassword(user.PasswordHash, oldPw); err != nil {
		return apperror.ErrUnauthorized
	}
	hash, err := auth.HashPassword(newPw)
	if err != nil {
		return err
	}
	return s.repo.UpdateUserPassword(ctx, userID, hash)
}

// ResetUserPassword allows:
// - superadmin: reset any user's password
// - admin: reset only regular users' passwords
func (s *Service) ResetUserPassword(ctx context.Context, actorID int64, actorRole domain.UserRole, targetUserID int64, input domain.ResetPasswordInput) error {
	newPw := strings.TrimSpace(input.Password)
	if len([]rune(newPw)) < 6 {
		return apperror.ErrInvalidInput
	}
	target, err := s.repo.GetUserByID(ctx, targetUserID)
	if err != nil {
		return err
	}
	if actorRole != domain.RoleSuperAdmin && target.Role != domain.RoleUser {
		return apperror.ErrForbidden
	}
	hash, err := auth.HashPassword(newPw)
	if err != nil {
		return err
	}
	if err := s.repo.UpdateUserPassword(ctx, targetUserID, hash); err != nil {
		return err
	}
	_ = s.logAudit(ctx, domain.CreateAuditEventInput{
		Action:        "user_password_reset",
		ActorID:       actorID,
		DocumentTitle: fmt.Sprintf("%s (%s)", target.FullName, target.Username),
		FileName:      target.Username,
		Details:       map[string]any{"by": string(actorRole)},
	})
	return nil
}
