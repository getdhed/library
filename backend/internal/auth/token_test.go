package auth

import (
	"strings"
	"testing"
	"time"

	"library-backend/internal/apperror"
	"library-backend/internal/domain"
)

func TestTokenManagerRoundTrip(t *testing.T) {
	manager := NewTokenManager("secret", time.Hour)

	token, err := manager.Create(domain.User{ID: 42, Role: domain.RoleAdmin})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	claims, err := manager.Parse(token)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	if claims.Sub != 42 {
		t.Fatalf("expected subject 42, got %d", claims.Sub)
	}
	if claims.Role != domain.RoleAdmin {
		t.Fatalf("expected role %q, got %q", domain.RoleAdmin, claims.Role)
	}
}

func TestTokenManagerParseRejectsInvalidSignature(t *testing.T) {
	manager := NewTokenManager("secret", time.Hour)

	token, err := manager.Create(domain.User{ID: 1, Role: domain.RoleUser})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	parts := strings.Split(token, ".")
	parts[2] = "broken"

	if _, err := manager.Parse(strings.Join(parts, ".")); err != apperror.ErrInvalidToken {
		t.Fatalf("expected invalid token error, got %v", err)
	}
}

func TestTokenManagerParseRejectsExpiredToken(t *testing.T) {
	manager := NewTokenManager("secret", -time.Second)

	token, err := manager.Create(domain.User{ID: 1, Role: domain.RoleUser})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if _, err := manager.Parse(token); err != apperror.ErrInvalidToken {
		t.Fatalf("expected invalid token error, got %v", err)
	}
}
