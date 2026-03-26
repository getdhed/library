import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../auth/AuthContext";
import AdminStatsPage from "./AdminStatsPage";

const getAdminStatsMock = vi.fn(() =>
  Promise.resolve({
    documentsCount: 42,
    viewsToday: 10,
    downloadsToday: 7,
    searchesToday: 15,
    topQueries: [{ name: "алгоритмы", count: 4 }],
    topDocuments: [{ name: "СУРП", count: 5 }],
    documentsByFaculty: [{ faculty: "ФКТИ", count: 12 }],
  })
);

vi.mock("../../api/library", () => ({
  getAdminStats: (...args: unknown[]) => getAdminStatsMock(...args),
}));

function renderPage() {
  return render(
    <AuthContext.Provider
      value={{
        token: "token",
        user: {
          id: 1,
          fullName: "Admin",
          email: "admin@example.com",
          role: "admin",
          createdAt: new Date().toISOString(),
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

    expect(await screen.findByRole("heading", { name: "Статистика" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Документы" })).toBeInTheDocument();

    const activeLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("aria-current") === "page");
    expect(activeLink).toBeDefined();
    expect(activeLink).toHaveTextContent("Статистика");

    expect(screen.getByText("Всего документов")).toBeInTheDocument();
    expect(screen.getByText("Популярные запросы")).toBeInTheDocument();
    expect(screen.getByText("Документы по факультетам")).toBeInTheDocument();
  });
});
