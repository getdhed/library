import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminAuditPage from "./AdminAuditPage";
import { AuthContext } from "../../auth/AuthContext";
import { ThemeProvider } from "../../theme/ThemeContext";

vi.mock("../../api/library", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/library")>();
  return {
    ...actual,
    getAdminSubmissions: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    getAdminAudit: vi.fn().mockResolvedValue({
      items: [
        {
          id: 1,
          documentId: 10,
          documentTitle: "Test Audit Doc",
          action: "create",
          actorId: 2,
          actorUsername: "testuser",
          createdAt: "2023-01-01T12:00:00Z",
        },
      ],
      total: 1,
    }),
  };
});

function renderWithProviders(ui: React.ReactNode, token: string | null = "admin-token") {
  return render(
    <MemoryRouter initialEntries={["/admin/audit"]}>
      <ThemeProvider>
        <AuthContext.Provider value={{ token, user: null, login: vi.fn(), register: vi.fn(), logout: vi.fn(), ready: true }}>
          <Routes>
            <Route path="/admin/audit" element={ui} />
          </Routes>
        </AuthContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("AdminAuditPage", () => {
  afterEach(cleanup);

  it("renders audit page and loads audit events", async () => {
    renderWithProviders(<AdminAuditPage />);

    expect(screen.getByText(/Журнал действий/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Test Audit Doc")).toBeInTheDocument();
      expect(screen.getByText("testuser")).toBeInTheDocument();
    });
  });
});
