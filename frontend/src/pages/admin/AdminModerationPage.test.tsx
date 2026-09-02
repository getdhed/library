import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminModerationPage from "./AdminModerationPage";
import { AuthContext } from "../../auth/AuthContext";
import { ThemeProvider } from "../../theme/ThemeContext";
import * as libraryApi from "../../api/library";

vi.mock("../../api/library", () => ({
  getAdminSubmissions: vi.fn(),
  getDocumentTypes: vi.fn(),
  getLanguages: vi.fn().mockResolvedValue({ items: [] }),
  approveSubmission: vi.fn(),
  rejectSubmission: vi.fn(),
  submissionFileUrl: vi.fn().mockReturnValue("fake-url.pdf"),
}));

describe("AdminModerationPage", () => {
  afterEach(cleanup);

  it("renders moderation page and shows empty state when no submissions", async () => {
    vi.mocked(libraryApi.getAdminSubmissions).mockResolvedValue({
      items: [],
    });
    vi.mocked(libraryApi.getDocumentTypes).mockResolvedValue({ items: [] });

    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: "admin-token", user: { id: 1, username: "admin", fullName: "Admin", role: "admin", isActive: true, createdAt: "", updatedAt: "" }, login: vi.fn(), logout: vi.fn(), register: vi.fn(), ready: true }}
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
          uploaderName: "User",
          source: "user_upload",
          isLocal: true,
          status: "pending",
          title: "Test Submission",
          fileName: "submission.pdf",
          mimeType: "application/pdf",
          fileSizeBytes: 1024,
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ],
    });
    vi.mocked(libraryApi.getDocumentTypes).mockResolvedValue({ items: [] });

    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: "admin-token", user: { id: 1, username: "admin", fullName: "Admin", role: "admin", isActive: true, createdAt: "", updatedAt: "" }, login: vi.fn(), logout: vi.fn(), register: vi.fn(), ready: true }}
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

  it("preserves translations, source classification and year while approving", async () => {
    vi.mocked(libraryApi.getAdminSubmissions).mockResolvedValue({
      items: [
        {
          id: 11,
          userId: 2,
          title: "Без года",
          titleTranslations: { English: "Undated" },
          source: "admin_import",
          isLocal: false,
          status: "pending",
          type: "Учебник",
          year: 0,
          fileName: "undated.pdf",
          fileSizeBytes: 1024,
          mimeType: "application/pdf",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ],
    });
    vi.mocked(libraryApi.getDocumentTypes).mockResolvedValue({ items: ["Учебник"] });
    vi.mocked(libraryApi.approveSubmission).mockResolvedValue({} as never);

    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{ token: "admin-token", user: { id: 1, username: "admin", fullName: "Admin", role: "admin", isActive: true, createdAt: "", updatedAt: "" }, login: vi.fn(), logout: vi.fn(), register: vi.fn(), ready: true }}
        >
          <MemoryRouter>
            <AdminModerationPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Рассмотреть" }));
    fireEvent.click(await screen.findByRole("button", { name: "Одобрить и опубликовать" }));

    await waitFor(() => {
      expect(libraryApi.approveSubmission).toHaveBeenCalledTimes(1);
    });
    const submittedForm = vi.mocked(libraryApi.approveSubmission).mock.calls[0][2];
    expect(submittedForm.get("titleTranslations")).toBe(
      JSON.stringify({ English: "Undated" })
    );
    expect(submittedForm.get("isLocal")).toBe("false");
    expect(submittedForm.get("year")).toBe("0");
  });
});
