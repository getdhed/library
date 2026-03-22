import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import BookPage from "./BookPage";

vi.mock("../api/library", () => ({
  documentFileUrl: vi.fn((id: number, _token: string, download?: boolean) =>
    download ? `/api/documents/${id}/file?download=1` : `/api/documents/${id}/file`
  ),
  favoriteDocument: vi.fn(),
  getDocument: vi.fn(() =>
    Promise.resolve({
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
      tags: ["devops"],
      isFavorite: true,
    })
  ),
  markOpened: vi.fn(() => Promise.resolve()),
  unfavoriteDocument: vi.fn(),
  documentCoverUrl: vi.fn(() => "/api/documents/1/cover"),
}));

describe("BookPage", () => {
  it("renders cover preview and grouped document actions", async () => {
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
        <MemoryRouter initialEntries={["/documents/1"]}>
          <Routes>
            <Route path="/documents/:id" element={<BookPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("DevOps Playbook")).toBeInTheDocument();
    });

    expect(screen.getByAltText("Обложка DevOps Playbook")).toBeInTheDocument();
    expect(screen.getByLabelText("Открыть документ")).toBeInTheDocument();
    expect(screen.getByLabelText("Скачать документ")).toBeInTheDocument();
    expect(screen.getByLabelText("Убрать из избранного")).toBeInTheDocument();
    expect(screen.getByText("Открыть PDF")).toBeInTheDocument();
    expect(screen.getByText("Скачать")).toBeInTheDocument();
    expect(screen.getByText("В избранном")).toBeInTheDocument();
  });
});
