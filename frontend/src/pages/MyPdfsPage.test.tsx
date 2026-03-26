import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import MyPdfsPage from "./MyPdfsPage";

vi.mock("../api/library", () => ({
  getDocument: vi.fn(),
  getMySubmissions: vi.fn(),
  submissionFileUrl: vi.fn((id: number) => `/api/submissions/${id}/file`),
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
    approvedDocumentId: 42,
    department: "Engineering Department",
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
          email: "user@example.com",
          fullName: "Regular User",
          role: "user",
          createdAt: new Date().toISOString(),
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
  });

  it("renders success state, filter toolbar and sorted cards", async () => {
    renderPage(true);

    await waitFor(() => {
      expect(screen.getByText("Rejected Draft")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("toolbar")).toBeInTheDocument();

    const cardTitles = screen
      .getAllByRole("heading", { level: 3 })
      .map((item) => item.textContent);
    expect(cardTitles).toEqual([
      "Rejected Draft",
      "Approved Draft",
      "Pending Notes",
    ]);

    const filterButtons = within(screen.getByRole("toolbar")).getAllByRole("button");
    fireEvent.click(filterButtons[3]);

    expect(screen.getByText("Rejected Draft")).toBeInTheDocument();
    expect(screen.queryByText("Approved Draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Pending Notes")).not.toBeInTheDocument();
  });

  it("opens details drawer for rejected, approved and pending entries", async () => {
    vi.mocked(getDocument).mockResolvedValue({
      id: 42,
      title: "Approved Catalog Title",
      author: "Catalog Author",
      year: 2026,
      type: "Manual",
      description: "Catalog document",
      fileName: "catalog-approved.pdf",
      fileSizeBytes: 4096,
      mimeType: "application/pdf",
      isVisible: true,
      createdAt: "2026-03-25T09:00:00.000Z",
      updatedAt: "2026-03-25T09:00:00.000Z",
      departmentId: 1,
      department: "Engineering Department",
      facultyId: 1,
      faculty: "FKTI",
      tags: [],
      isFavorite: false,
    } as never);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Rejected Draft")).toBeInTheDocument();
    });

    const rejectedCard = screen.getByText("Rejected Draft").closest("article");
    expect(rejectedCard).not.toBeNull();
    fireEvent.click(within(rejectedCard as HTMLElement).getAllByRole("button")[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Need full metadata")).toBeInTheDocument();
    expect(vi.mocked(getDocument)).not.toHaveBeenCalled();

    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button")[0]);

    const approvedCard = screen.getByText("Approved Draft").closest("article");
    expect(approvedCard).not.toBeNull();
    fireEvent.click(within(approvedCard as HTMLElement).getAllByRole("button")[0]);

    await waitFor(() => {
      expect(screen.getByText("Approved Catalog Title")).toBeInTheDocument();
    });
    expect(vi.mocked(getDocument)).toHaveBeenCalledWith("token", 42);
    expect(screen.getByText("catalog-approved.pdf")).toBeInTheDocument();
    const documentLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/documents/42");
    expect(documentLink).toBeDefined();

    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button")[0]);

    const pendingCard = screen.getByText("Pending Notes").closest("article");
    expect(pendingCard).not.toBeNull();
    fireEvent.click(within(pendingCard as HTMLElement).getAllByRole("button")[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.queryByText("Approved Catalog Title")).not.toBeInTheDocument();
    expect(vi.mocked(getDocument)).toHaveBeenCalledTimes(1);
  });
});
