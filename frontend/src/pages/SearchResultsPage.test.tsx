import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import SearchResultsPage from "./SearchResultsPage";

vi.mock("../api/library", () => ({
  documentCoverUrl: vi.fn(() => "/api/documents/1/cover"),
  documentFileUrl: vi.fn(() => "/api/documents/1/file"),
  favoriteDocument: vi.fn(),
  getDepartments: vi.fn(() => Promise.resolve({ items: [] })),
  getDocuments: vi.fn(() =>
    Promise.resolve({
      items: [
        {
          id: 1,
          title: "DevOps Playbook",
          author: "Demo Author",
          year: 2026,
          type: "Учебник",
          description: "Generated demo PDF set",
          fileName: "playbook.pdf",
          fileSizeBytes: 1024,
          mimeType: "application/pdf",
          coverPath: "covers/playbook.png",
          isVisible: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          departmentId: 1,
          department: "Кафедра программной инженерии",
          facultyId: 1,
          faculty: "ФКТИ",
          tags: [],
          isFavorite: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    })
  ),
  getFaculties: vi.fn(() => Promise.resolve({ items: [] })),
  getSuggestions: vi.fn(() => Promise.resolve({ items: [] })),
  markOpened: vi.fn(),
  unfavoriteDocument: vi.fn(),
}));

describe("SearchResultsPage", () => {
  it("renders rich document cards with preview, actions and top search bar", async () => {
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
        <MemoryRouter initialEntries={["/search?q=devops"]}>
          <Routes>
            <Route path="/search" element={<SearchResultsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("DevOps Playbook")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("devops")).toBeInTheDocument();
    expect(screen.getByAltText("Обложка DevOps Playbook")).toBeInTheDocument();
    expect(screen.getByLabelText("Открыть документ")).toBeInTheDocument();
    expect(screen.getByLabelText("Добавить в избранное")).toBeInTheDocument();
    expect(screen.getByText("Открыть")).toBeInTheDocument();
    expect(screen.getByText("В избранное")).toBeInTheDocument();
  });
});
