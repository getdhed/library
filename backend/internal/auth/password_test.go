package auth

import "testing"

func TestHashPasswordAndCompare(t *testing.T) {
	hash, err := HashPassword("super-secret")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	if err := ComparePassword(hash, "super-secret"); err != nil {
		t.Fatalf("ComparePassword() error = %v", err)
	}
}

func TestComparePasswordRejectsWrongPassword(t *testing.T) {
	hash, err := HashPassword("super-secret")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	if err := ComparePassword(hash, "wrong-secret"); err == nil {
		t.Fatal("expected ComparePassword() to reject wrong password")
	}
}
