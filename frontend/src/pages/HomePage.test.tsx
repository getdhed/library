import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import HomePage from "./HomePage";

vi.mock("../api/library", () => ({
  getHome: vi.fn(() =>
    Promise.resolve({
      recent: [
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
      favorites: [],
      searchHistory: [],
    })
  ),
  getSuggestions: vi.fn(() => Promise.resolve({ items: [] })),
  markOpened: vi.fn(),
  documentCoverUrl: vi.fn(() => "/api/documents/1/cover"),
}));

describe("HomePage", () => {
  it("renders the recent documents list with preview cards", async () => {
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
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByRole("button", { name: "Поиск" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Недавние документы")).toBeInTheDocument();
    });

    expect(screen.getByText("DevOps Playbook")).toBeInTheDocument();
    expect(screen.getByAltText("Обложка DevOps Playbook")).toBeInTheDocument();
  });
});
