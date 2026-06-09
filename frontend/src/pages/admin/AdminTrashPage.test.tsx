import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminTrashPage from "./AdminTrashPage";
import { AuthContext } from "../../auth/AuthContext";
import { ThemeProvider } from "../../theme/ThemeContext";

vi.mock("../../api/library", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/library")>();
  return {
    ...actual,
    getAdminSubmissions: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    getDocumentTypes: vi.fn().mockResolvedValue({ items: ["book"] }),
    getAdminDocuments: vi.fn().mockResolvedValue({
      items: [
        {
          id: 10,
          title: "Deleted Doc",
          type: "book",
          year: 2021,
          deletedAt: "2023-01-01T00:00:00Z",
        },
      ],
      total: 1,
    }),
    restoreDocument: vi.fn().mockResolvedValue({}),
  };
});

function renderWithProviders(ui: React.ReactNode, token: string | null = "admin-token") {
  return render(
    <MemoryRouter initialEntries={["/admin/trash"]}>
      <ThemeProvider>
        <AuthContext.Provider value={{ token, user: null, login: vi.fn(), logout: vi.fn(), isLoading: false }}>
          <Routes>
            <Route path="/admin/trash" element={ui} />
          </Routes>
        </AuthContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("AdminTrashPage", () => {
  afterEach(cleanup);

  it("renders trash page and loads deleted documents", async () => {
    renderWithProviders(<AdminTrashPage />);

    expect(screen.getByText(/Корзина/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Deleted Doc")).toBeInTheDocument();
    });
  });

  it("restores a document when restore button is clicked", async () => {
    const { restoreDocument } = await import("../../api/library");
    window.confirm = vi.fn().mockReturnValue(true);

    renderWithProviders(<AdminTrashPage />);

    await waitFor(() => {
      expect(screen.getByText("Deleted Doc")).toBeInTheDocument();
    });

    const restoreBtn = screen.getByRole("button", { name: /Восстановить/i });
    await userEvent.click(restoreBtn);

    expect(window.confirm).toHaveBeenCalledWith("Восстановить документ?");
    expect(restoreDocument).toHaveBeenCalledWith("admin-token", 10);
  });
});
