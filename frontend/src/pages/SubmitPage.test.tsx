import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import SubmitPage from "./SubmitPage";

vi.mock("../api/library", () => ({
  createSubmission: vi.fn(() => Promise.resolve({ id: 3 })),
  getDepartments: vi.fn(() => Promise.resolve({ items: [] })),
  getFaculties: vi.fn(() => Promise.resolve({ items: [] })),
  getMySubmissions: vi.fn(() =>
    Promise.resolve({
      items: [
        {
          id: 1,
          userId: 4,
          title: "Networks Handbook",
          author: "User Author",
          department: "Кафедра информационных систем",
          status: "approved",
          approvedDocumentId: 42,
          fileName: "networks.pdf",
          fileSizeBytes: 2048,
          mimeType: "application/pdf",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          userId: 4,
          title: "Legacy Notes",
          status: "rejected",
          moderationNote: "Нужны полные метаданные",
          fileName: "legacy.pdf",
          fileSizeBytes: 1024,
          mimeType: "application/pdf",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    })
  ),
  submissionFileUrl: vi.fn((id: number) => `/api/submissions/${id}/file`),
}));

describe("SubmitPage", () => {
  it("renders the upload form and moderation statuses", async () => {
    render(
      <AuthContext.Provider
        value={{
          token: "token",
          user: null,
          ready: true,
          login: async () => undefined,
          register: async () => undefined,
          logout: () => undefined,
        }}
      >
        <MemoryRouter initialEntries={["/submit"]}>
          <Routes>
            <Route path="/submit" element={<SubmitPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("Networks Handbook")).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("Название")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Отправить PDF" })
    ).toBeInTheDocument();
    expect(screen.getByText("Одобрено")).toBeInTheDocument();
    expect(screen.getByText("Отклонено")).toBeInTheDocument();
    expect(screen.getByText(/Нужны полные метаданные/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Открыть документ" })
    ).toHaveAttribute("href", "/documents/42");
  });
});
