import React from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import MyPdfsPage from "./MyPdfsPage";

vi.mock("../api/library", () => ({
  getDocument: vi.fn(),
  getMySubmissions: vi.fn(),
}));

import { getDocument, getMySubmissions } from "../api/library";

afterEach(() => {
  cleanup();
});

const submissions = [
  {
    id: 1,
    userId: 4,
    title: "Pending Notes",
    fileName: "pending.pdf",
    fileSizeBytes: 2048,
    mimeType: "application/pdf",
    status: "pending",
    source: "user_upload",
    isLocal: true,
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
  },
  {
    id: 2,
    userId: 4,
    title: "Approved Draft",
    author: "User Author",
    fileName: "approved.pdf",
    fileSizeBytes: 3072,
    mimeType: "application/pdf",
    status: "approved",
    source: "user_upload",
    isLocal: true,
    approvedDocumentId: 42,
    createdAt: "2026-03-18T09:00:00.000Z",
    updatedAt: "2026-03-24T09:30:00.000Z",
  },
  {
    id: 3,
    userId: 4,
    title: "Rejected Draft",
    fileName: "rejected.pdf",
    fileSizeBytes: 1024,
    mimeType: "application/pdf",
    status: "rejected",
    source: "user_upload",
    isLocal: true,
    moderationNote: "Need full metadata",
    reviewedAt: "2026-03-25T12:15:00.000Z",
    createdAt: "2026-03-17T08:00:00.000Z",
    updatedAt: "2026-03-25T12:15:00.000Z",
  },
] as const;

function renderPage(withSuccessState = false) {
  return render(
    <AuthContext.Provider
      value={{
        token: "token",
        user: {
          id: 4,
          username: "user",
          fullName: "Regular User",
          role: "user",
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
      <MemoryRouter
        initialEntries={[
          withSuccessState
            ? { pathname: "/account/pdfs", state: { submissionCreated: true } }
            : "/account/pdfs",
        ]}
      >
        <Routes>
          <Route path="/account/pdfs" element={<MyPdfsPage />} />
          <Route path="/documents/:id" element={<div>Document page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("MyPdfsPage", () => {
  beforeEach(() => {
    vi.mocked(getMySubmissions).mockResolvedValue({
      items: [...submissions],
    } as never);
    vi.mocked(getDocument).mockReset();
    window.URL.createObjectURL = vi.fn();
    window.URL.revokeObjectURL = vi.fn();
  });

  it("shows empty state when there are no submissions", async () => {
    vi.mocked(getMySubmissions).mockResolvedValue({ items: [] } as never);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("У вас пока нет загруженных PDF")).toBeInTheDocument();
    });


    const uploadButtons = screen.getAllByRole("link", { name: "Загрузить новый PDF" });
    expect(uploadButtons.length).toBeGreaterThanOrEqual(1);
    expect(uploadButtons[0].getAttribute("href")).toBe("/submit");

    expect(screen.queryByText("В обработке")).not.toBeInTheDocument();
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("renders success state and sorted cards", async () => {
    renderPage(true);

    await waitFor(() => {
      expect(screen.getByText("Rejected Draft")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();

    const cardTitles = screen
      .getAllByRole("heading", { level: 6 })
      .map((item) => item.textContent);
    expect(cardTitles).toEqual([
      "Pending Notes",
      "Approved Draft",
      "Rejected Draft",
    ]);
  });

  it("shows status-specific links for rejected, approved and pending entries", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Rejected Draft")).toBeInTheDocument();
    });

    const approvedCard = screen.getByText("Approved Draft").closest("article");
    expect(approvedCard).not.toBeNull();
    expect(within(approvedCard!).getByRole("link")).toHaveAttribute("href", "/documents/42");

    const pendingCard = screen.getByText("Pending Notes").closest("article");
    expect(pendingCard).not.toBeNull();
    expect(within(pendingCard!).getByRole("link")).toHaveAttribute(
      "href",
      "/submissions/1/read"
    );

    const rejectedCard = screen.getByText("Rejected Draft").closest("article");
    expect(rejectedCard).not.toBeNull();
    expect(within(rejectedCard!).getByRole("link")).toHaveAttribute(
      "href",
      "/submissions/3/read"
    );
    expect(within(rejectedCard!).getByText(/Need full metadata/)).toBeInTheDocument();
    expect(vi.mocked(getDocument)).not.toHaveBeenCalled();
  });
});
