package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"library-backend/internal/apperror"
	"library-backend/internal/domain"
)

type TokenManager struct {
	secret []byte
	ttl    time.Duration
}

type Claims struct {
	Sub  int64           `json:"sub"`
	Role domain.UserRole `json:"role"`
	Exp  int64           `json:"exp"`
}

func NewTokenManager(secret string, ttl time.Duration) *TokenManager {
	return &TokenManager{secret: []byte(secret), ttl: ttl}
}

func (m *TokenManager) Create(user domain.User) (string, error) {
	header, err := json.Marshal(map[string]string{
		"alg": "HS256",
		"typ": "JWT",
	})
	if err != nil {
		return "", err
	}

	claims, err := json.Marshal(Claims{
		Sub:  user.ID,
		Role: user.Role,
		Exp:  time.Now().Add(m.ttl).Unix(),
	})
	if err != nil {
		return "", err
	}

	unsigned := encodeSegment(header) + "." + encodeSegment(claims)
	signature := signHS256(unsigned, m.secret)

	return unsigned + "." + encodeSegment(signature), nil
}

func (m *TokenManager) Parse(token string) (Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Claims{}, apperror.ErrInvalidToken
	}

	unsigned := parts[0] + "." + parts[1]
	expected := signHS256(unsigned, m.secret)
	actual, err := decodeSegment(parts[2])
	if err != nil || !hmac.Equal(actual, expected) {
		return Claims{}, apperror.ErrInvalidToken
	}

	payload, err := decodeSegment(parts[1])
	if err != nil {
		return Claims{}, apperror.ErrInvalidToken
	}

	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return Claims{}, fmt.Errorf("unmarshal claims: %w", err)
	}
	if claims.Exp < time.Now().Unix() {
		return Claims{}, apperror.ErrInvalidToken
	}
	return claims, nil
}

func signHS256(value string, secret []byte) []byte {
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(value))
	return mac.Sum(nil)
}

func encodeSegment(value []byte) string {
	return base64.RawURLEncoding.EncodeToString(value)
}

func decodeSegment(value string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(value)
}
