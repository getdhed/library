import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../auth/AuthContext";
import AdminStatsPage from "./AdminStatsPage";

const { getAdminStatsMock, getAdminSubmissionsMock } = vi.hoisted(() => ({
  getAdminStatsMock: vi.fn(() =>
    Promise.resolve({
      documentsCount: 42,
      viewsToday: 10,
      downloadsToday: 7,
      searchesToday: 15,
      uploadedInPeriod: 3,
      pendingImports: 2,
      uploadPeriodFrom: "2026-05-07T00:00:00Z",
      uploadPeriodTo: "2026-06-07T00:00:00Z",
      topQueries: [{ name: "алгоритмы", count: 4 }],
      topDocuments: [{ name: "СУРП", count: 5 }],
      documentsByType: [{ name: "Учебник", count: 9 }],
      documentsUploadedByDay: [{ name: "2026-06-01", count: 2 }],
    })
  ),
  getAdminSubmissionsMock: vi.fn(() => Promise.resolve({ items: [], totalCount: 0 })),
}));

vi.mock("../../api/library", () => ({
  getAdminStats: (...args: unknown[]) => getAdminStatsMock(...args),
  getAdminSubmissions: (...args: unknown[]) => getAdminSubmissionsMock(...args),
}));

function renderPage() {
  return render(
    <AuthContext.Provider
      value={{
        token: "token",
        user: {
          id: 1,
          fullName: "Admin",
          username: "admin",
          role: "admin",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ready: true,
        login: async () => undefined,
        register: async () => undefined,
        logout: () => undefined,
      }}
    >
      <MemoryRouter initialEntries={["/admin/stats"]}>
        <Routes>
          <Route path="/admin/stats" element={<AdminStatsPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("AdminStatsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders admin subnav and stats sections", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Панель администратора" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Документы" })).toBeInTheDocument();

    const activeLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("aria-current") === "page");
    expect(activeLink).toBeDefined();
    expect(activeLink).toHaveTextContent("Статистика");

    expect(screen.getByText("ВСЕГО ДОКУМЕНТОВ")).toBeInTheDocument();
    expect(screen.getByText("Популярные документы")).toBeInTheDocument();
    expect(screen.getByText("Документы по типам")).toBeInTheDocument();
  });
});
