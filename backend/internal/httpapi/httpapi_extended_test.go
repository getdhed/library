package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"library-backend/internal/domain"
)

func TestHTTP_ExtendedAdminUsers(t *testing.T) {
	router, db, ctx, cleanup := setupTestRouter(t)
	defer cleanup()

	var adminID int64
	db.QueryRowContext(ctx, "INSERT INTO users(username, password_hash, full_name, role) VALUES ('superadmin', 'hash', 'Super Admin', 'admin') RETURNING id").Scan(&adminID)

	regInput := domain.RegisterInput{
		Username: "adminuser",
		Password: "password123",
		FullName: "Admin User",
	}
	body, _ := json.Marshal(regInput)
	regReq, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	regReq.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, regReq)

	if w.Code != http.StatusCreated {
		t.Fatalf("Register failed: %d %s", w.Code, w.Body.String())
	}
	var authResponse domain.AuthPayload
	json.Unmarshal(w.Body.Bytes(), &authResponse)
	token := authResponse.Token

	db.ExecContext(ctx, "UPDATE users SET role = 'admin' WHERE username = 'adminuser'")

	// Login to get admin token
	loginReq, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	loginReq.Header.Set("Content-Type", "application/json")
	wLogin := httptest.NewRecorder()
	router.ServeHTTP(wLogin, loginReq)

	var loginResp domain.AuthPayload
	json.Unmarshal(wLogin.Body.Bytes(), &loginResp)
	token = loginResp.Token

	headers := map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}

	doReq := func(method, path string, obj interface{}) *httptest.ResponseRecorder {
		var b []byte
		if obj != nil {
			b, _ = json.Marshal(obj)
		}
		req, _ := http.NewRequest(method, path, bytes.NewBuffer(b))
		for k, v := range headers {
			req.Header.Set(k, v)
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	doReq("POST", "/api/admin/users", domain.AdminUserInput{Username: "newadmin", Password: "password123", FullName: "New Admin", Role: "admin"})
	doReq("PUT", "/api/admin/users/2", domain.AdminUserInput{Username: "newadmin2", FullName: "New Admin 2", Role: "admin"})
	doReq("POST", "/api/admin/users/2/status", domain.UserStatusInput{IsActive: false})

	doReq("POST", "/api/admin/documents", nil)
	doReq("PUT", "/api/admin/documents/1", nil)
	doReq("DELETE", "/api/admin/documents/1", nil)
	doReq("POST", "/api/admin/documents/1/restore", nil)
	doReq("GET", "/api/admin/submissions?status=pending", nil)
	doReq("POST", "/api/admin/submissions/1/approve", nil)
	doReq("POST", "/api/admin/submissions/1/reject", map[string]string{"moderationNote": "bad"})
}

func TestHTTP_ExtendedUser(t *testing.T) {
	router, _, _, cleanup := setupTestRouter(t)
	defer cleanup()

	regInput := domain.RegisterInput{
		Username: "regular",
		Password: "password123",
		FullName: "Reg User",
	}
	body, _ := json.Marshal(regInput)
	regReq, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	regReq.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, regReq)

	if w.Code != http.StatusCreated {
		t.Fatalf("Register failed: %d %s", w.Code, w.Body.String())
	}
	var authResponse domain.AuthPayload
	json.Unmarshal(w.Body.Bytes(), &authResponse)
	token := authResponse.Token

	headers := map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}

	doReq := func(method, path string, obj interface{}) *httptest.ResponseRecorder {
		var b []byte
		if obj != nil {
			b, _ = json.Marshal(obj)
		}
		req, _ := http.NewRequest(method, path, bytes.NewBuffer(b))
		for k, v := range headers {
			req.Header.Set(k, v)
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	doReq("GET", "/api/suggest?q=test", nil)
	doReq("GET", "/api/documents/1", nil)
	doReq("POST", "/api/submissions", nil)
	doReq("GET", "/api/submissions/1", nil)
	doReq("GET", "/api/profile/recent", nil)
	doReq("GET", "/api/profile/favorites", nil)
	doReq("GET", "/api/profile/history", nil)
	doReq("GET", "/api/profile/submissions", nil)
	doReq("GET", "/api/documents/1/open", nil)
	doReq("GET", "/api/documents/1/file", nil)
	doReq("GET", "/api/documents/1/cover", nil)
	doReq("GET", "/api/submissions/1/file", nil)
	doReq("POST", "/api/documents/1/favorite", nil)
	doReq("POST", "/api/documents/1/unfavorite", nil)
	
	doReq("POST", "/api/auth/login", domain.LoginInput{
		Username: "regular",
		Password: "password123",
	})
	
	doReq("GET", "/api/admin/documents", nil)
	doReq("GET", "/api/admin/audit", nil)
	doReq("GET", "/api/admin/documents/1/audit", nil)
}
