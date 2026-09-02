package service

import (
	"database/sql"
	"testing"
	"time"

	"library-backend/internal/apperror"
	"library-backend/internal/domain"
)

func TestWrongPasswordCannotDeactivateDormantUser(t *testing.T) {
	svc, db, ctx, cleanup := setupTestService(t)
	defer cleanup()

	registered, err := svc.Register(ctx, domain.RegisterInput{
		Username: "dormant-user",
		Password: "password123",
		FullName: "Dormant User",
	})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE users SET last_login_at = $2 WHERE id = $1`, registered.User.ID, time.Now().AddDate(0, -7, 0)); err != nil {
		t.Fatalf("set last login: %v", err)
	}

	if _, err := svc.Login(ctx, domain.LoginInput{Username: "dormant-user", Password: "wrong-password"}); err != apperror.ErrUnauthorized {
		t.Fatalf("expected unauthorized, got %v", err)
	}

	var active bool
	var deletedAt sql.NullTime
	if err := db.QueryRowContext(ctx, `SELECT is_active, deleted_at FROM users WHERE id = $1`, registered.User.ID).Scan(&active, &deletedAt); err != nil {
		t.Fatalf("load user state: %v", err)
	}
	if !active || deletedAt.Valid {
		t.Fatalf("wrong password changed dormant user state: active=%v deleted=%v", active, deletedAt.Valid)
	}
}

func TestRestoreUserReactivatesAndRevokesOldTokens(t *testing.T) {
	svc, db, ctx, cleanup := setupTestService(t)
	defer cleanup()

	actor, _, err := svc.CreateAdminUser(ctx, 1, domain.RoleSuperAdmin, domain.AdminUserInput{
		Username: "restore-superadmin",
		FullName: "Restore Superadmin",
		Role:     domain.RoleSuperAdmin,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("CreateAdminUser() error = %v", err)
	}
	target, err := svc.Register(ctx, domain.RegisterInput{
		Username: "restore-target",
		Password: "password123",
		FullName: "Restore Target",
	})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		UPDATE users
		SET is_active = FALSE, deleted_at = NOW(), deactivation_reason = 'test'
		WHERE id = $1
	`, target.User.ID); err != nil {
		t.Fatalf("archive user: %v", err)
	}

	if err := svc.RestoreUser(ctx, actor.ID, domain.RoleSuperAdmin, target.User.ID); err != nil {
		t.Fatalf("RestoreUser() error = %v", err)
	}

	var active bool
	var deletedAt sql.NullTime
	var tokenVersion int64
	if err := db.QueryRowContext(ctx, `SELECT is_active, deleted_at, token_version FROM users WHERE id = $1`, target.User.ID).Scan(&active, &deletedAt, &tokenVersion); err != nil {
		t.Fatalf("load restored user: %v", err)
	}
	if !active || deletedAt.Valid || tokenVersion != 1 {
		t.Fatalf("unexpected restored state: active=%v deleted=%v token_version=%d", active, deletedAt.Valid, tokenVersion)
	}
}

func TestHardDeletesRequireArchivedTargets(t *testing.T) {
	svc, _, ctx, cleanup := setupTestService(t)
	defer cleanup()

	actor, _, err := svc.CreateAdminUser(ctx, 1, domain.RoleSuperAdmin, domain.AdminUserInput{
		Username: "delete-superadmin",
		FullName: "Delete Superadmin",
		Role:     domain.RoleSuperAdmin,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("CreateAdminUser() error = %v", err)
	}
	target, err := svc.Register(ctx, domain.RegisterInput{
		Username: "delete-target",
		Password: "password123",
		FullName: "Delete Target",
	})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}

	if err := svc.HardDeleteUser(ctx, actor.ID, domain.RoleSuperAdmin, target.User.ID); err != apperror.ErrConflict {
		t.Fatalf("expected active user hard delete conflict, got %v", err)
	}
	if err := svc.DeleteUser(ctx, actor.ID, domain.RoleSuperAdmin, target.User.ID); err != nil {
		t.Fatalf("DeleteUser() error = %v", err)
	}
	if err := svc.HardDeleteUser(ctx, actor.ID, domain.RoleSuperAdmin, target.User.ID); err != nil {
		t.Fatalf("HardDeleteUser() error = %v", err)
	}

	document, err := svc.CreateDocument(ctx, domain.UpsertDocumentInput{
		Title:    "Delete target document",
		FileName: "delete-target.pdf",
	}, actor.ID)
	if err != nil {
		t.Fatalf("CreateDocument() error = %v", err)
	}
	if err := svc.HardDeleteDocument(ctx, document.ID, actor.ID, domain.RoleAdmin); err != apperror.ErrForbidden {
		t.Fatalf("expected admin hard delete to be forbidden, got %v", err)
	}
	if err := svc.HardDeleteDocument(ctx, document.ID, actor.ID, domain.RoleSuperAdmin); err != apperror.ErrConflict {
		t.Fatalf("expected active document hard delete conflict, got %v", err)
	}
	if err := svc.DeleteDocument(ctx, document.ID, actor.ID); err != nil {
		t.Fatalf("DeleteDocument() error = %v", err)
	}
	if err := svc.HardDeleteDocument(ctx, document.ID, actor.ID, domain.RoleSuperAdmin); err != nil {
		t.Fatalf("HardDeleteDocument() error = %v", err)
	}
}

func TestPrivilegedAccountsAreNotLockedOutByInactivity(t *testing.T) {
	svc, db, ctx, cleanup := setupTestService(t)
	defer cleanup()

	admin, _, err := svc.CreateAdminUser(ctx, 0, domain.RoleSuperAdmin, domain.AdminUserInput{
		Username: "long-lived-superadmin",
		FullName: "Long Lived Superadmin",
		Role:     domain.RoleSuperAdmin,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("CreateAdminUser() error = %v", err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE users SET last_login_at = $2 WHERE id = $1`, admin.ID, time.Now().AddDate(0, -7, 0)); err != nil {
		t.Fatalf("age superadmin login: %v", err)
	}

	if err := svc.DeactivateInactiveUsers(ctx); err != nil {
		t.Fatalf("DeactivateInactiveUsers() error = %v", err)
	}
	if _, err := svc.Login(ctx, domain.LoginInput{Username: admin.Username, Password: "password123"}); err != nil {
		t.Fatalf("dormant superadmin login must remain available: %v", err)
	}

	var active bool
	var deletedAt sql.NullTime
	if err := db.QueryRowContext(ctx, `SELECT is_active, deleted_at FROM users WHERE id = $1`, admin.ID).Scan(&active, &deletedAt); err != nil {
		t.Fatalf("load superadmin state: %v", err)
	}
	if !active || deletedAt.Valid {
		t.Fatalf("inactivity changed privileged account: active=%v deleted=%v", active, deletedAt.Valid)
	}

	_, err = svc.UpdateUser(ctx, admin.ID, domain.RoleSuperAdmin, admin.ID, domain.AdminUserInput{
		Username: admin.Username,
		FullName: admin.FullName,
		Role:     domain.RoleAdmin,
	})
	if err != apperror.ErrForbidden {
		t.Fatalf("expected self-demotion to be forbidden, got %v", err)
	}
}

func TestConcurrentSuperAdminChangesCannotRemoveLastActiveSuperAdmin(t *testing.T) {
	svc, db, ctx, cleanup := setupTestService(t)
	defer cleanup()

	first, _, err := svc.CreateAdminUser(ctx, 0, domain.RoleSuperAdmin, domain.AdminUserInput{
		Username: "concurrent-superadmin-one",
		FullName: "Concurrent Superadmin One",
		Role:     domain.RoleSuperAdmin,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("create first superadmin: %v", err)
	}
	second, _, err := svc.CreateAdminUser(ctx, 0, domain.RoleSuperAdmin, domain.AdminUserInput{
		Username: "concurrent-superadmin-two",
		FullName: "Concurrent Superadmin Two",
		Role:     domain.RoleSuperAdmin,
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("create second superadmin: %v", err)
	}

	start := make(chan struct{})
	results := make(chan error, 2)
	go func() {
		<-start
		_, err := svc.UpdateUser(ctx, first.ID, domain.RoleSuperAdmin, second.ID, domain.AdminUserInput{
			Username: second.Username,
			FullName: second.FullName,
			Role:     domain.RoleAdmin,
		})
		results <- err
	}()
	go func() {
		<-start
		_, err := svc.UpdateUser(ctx, second.ID, domain.RoleSuperAdmin, first.ID, domain.AdminUserInput{
			Username: first.Username,
			FullName: first.FullName,
			Role:     domain.RoleAdmin,
		})
		results <- err
	}()
	close(start)

	successes := 0
	conflicts := 0
	for range 2 {
		switch err := <-results; err {
		case nil:
			successes++
		case apperror.ErrConflict:
			conflicts++
		default:
			t.Fatalf("unexpected concurrent update error: %v", err)
		}
	}
	if successes != 1 || conflicts != 1 {
		t.Fatalf("expected one success and one conflict, got successes=%d conflicts=%d", successes, conflicts)
	}

	var remainingID int64
	if err := db.QueryRowContext(ctx, `
		SELECT id
		FROM users
		WHERE role = 'superadmin' AND is_active AND deleted_at IS NULL
	`).Scan(&remainingID); err != nil {
		t.Fatalf("load remaining active superadmin: %v", err)
	}

	if _, err := svc.SetUserActive(ctx, 0, domain.RoleSuperAdmin, remainingID, domain.UserStatusInput{IsActive: false}); err != apperror.ErrConflict {
		t.Fatalf("expected last superadmin deactivation conflict, got %v", err)
	}
	if err := svc.DeleteUser(ctx, 0, domain.RoleSuperAdmin, remainingID); err != apperror.ErrConflict {
		t.Fatalf("expected last superadmin deletion conflict, got %v", err)
	}
}
