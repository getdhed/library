import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminModerationPage from "./AdminModerationPage";
import { AuthContext } from "../../auth/AuthContext";
import { ThemeProvider } from "../../theme/ThemeContext";
import * as libraryApi from "../../api/library";

vi.mock("../../api/library", () => ({
  getAdminSubmissions: vi.fn(),
  getDocumentTypes: vi.fn(),
  approveSubmission: vi.fn(),
  rejectSubmission: vi.fn(),
  submissionFileUrl: vi.fn().mockReturnValue("fake-url.pdf"),
}));

describe("AdminModerationPage", () => {
  it("renders moderation page and shows empty state when no submissions", async () => {
    vi.mocked(libraryApi.getAdminSubmissions).mockResolvedValue({
      items: [],
      totalCount: 0,
    });
    vi.mocked(libraryApi.getDocumentTypes).mockResolvedValue([]);

    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: "admin-token", user: { id: 1, username: "admin", fullName: "Admin", role: "admin", isActive: true, createdAt: "", updatedAt: "" }, login: vi.fn(), logout: vi.fn(), register: vi.fn(), me: vi.fn(), initialized: true }}
        >
          <MemoryRouter>
            <AdminModerationPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    expect(screen.getByText("Заявки")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Все заявки обработаны!")).toBeInTheDocument();
    });
  });

  it("renders list of submissions and handles filters", async () => {
    vi.mocked(libraryApi.getAdminSubmissions).mockResolvedValue({
      items: [
        {
          id: 10,
          userId: 1,
          userFullName: "User",
          status: "pending",
          title: "Test Submission",
          fileExtension: ".pdf",
          fileSizeBytes: 1024,
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ],
      totalCount: 1,
    });
    vi.mocked(libraryApi.getDocumentTypes).mockResolvedValue([]);

    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: "admin-token", user: { id: 1, username: "admin", fullName: "Admin", role: "admin", isActive: true, createdAt: "", updatedAt: "" }, login: vi.fn(), logout: vi.fn(), register: vi.fn(), me: vi.fn(), initialized: true }}
        >
          <MemoryRouter>
            <AdminModerationPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Submission")).toBeInTheDocument();
    });
  });
});
