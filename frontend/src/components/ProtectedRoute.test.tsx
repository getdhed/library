import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminRoute, ProtectedRoute } from "./ProtectedRoute";
import { AuthContext } from "../auth/AuthContext";

describe("ProtectedRoute and AdminRoute", () => {
  afterEach(cleanup);

  function TestApp({ authValue, ui }: { authValue: any; ui: React.ReactNode }) {
    return (
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/protected"]}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/protected" element={ui} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  }

  describe("ProtectedRoute", () => {
    it("shows loading when auth is not ready", () => {
      render(
        <TestApp
          authValue={{ ready: false, token: null, user: null }}
          ui={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      );
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("redirects to login when no token", () => {
      render(
        <TestApp
          authValue={{ ready: true, token: null, user: null }}
          ui={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      );
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });

    it("renders children when authenticated", () => {
      render(
        <TestApp
          authValue={{ ready: true, token: "token", user: { id: 1, role: "user" } }}
          ui={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      );
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("AdminRoute", () => {
    it("redirects to home when user is not admin", () => {
      render(
        <TestApp
          authValue={{ ready: true, token: "token", user: { id: 1, role: "user" } }}
          ui={
            <AdminRoute>
              <div>Admin Content</div>
            </AdminRoute>
          }
        />
      );
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });

    it("renders children when user is admin", () => {
      render(
        <TestApp
          authValue={{ ready: true, token: "token", user: { id: 1, role: "admin" } }}
          ui={
            <AdminRoute>
              <div>Admin Content</div>
            </AdminRoute>
          }
        />
      );
      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });
  });
});
