import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PdfReaderPage from "./PdfReaderPage";
import { AuthContext } from "../auth/AuthContext";
import { ThemeProvider } from "../theme/ThemeContext";

vi.mock("../api/library", () => ({
  getDocument: vi.fn().mockResolvedValue({
    id: 1,
    title: "Test PDF Document",
    fileName: "test_doc.pdf",
    updatedAt: "2023-01-01T00:00:00Z",
  }),
  getSubmission: vi.fn().mockResolvedValue({
    id: 2,
    title: "Test Submission",
    fileName: "test_submission.pdf",
    updatedAt: "2023-01-01T00:00:00Z",
  }),
  markOpened: vi.fn().mockResolvedValue({}),
  documentFileUrl: vi.fn().mockReturnValue("mock-doc-url"),
  submissionFileUrl: vi.fn().mockReturnValue("mock-sub-url"),
  getDocumentTypes: vi.fn().mockResolvedValue({ items: ["book"] }),
  updateDocument: vi.fn(),
}));

function renderWithProviders(ui: React.ReactNode, route = "/read/1") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <AuthContext.Provider value={{ token: "token", user: { id: 1, username: "user", fullName: "User", role: "user", isActive: true, createdAt: "", updatedAt: "" }, login: vi.fn(), register: vi.fn(), logout: vi.fn(), ready: true }}>
          <Routes>
            <Route path="/read/:id" element={ui} />
            <Route path="/submission/:id" element={ui} />
          </Routes>
        </AuthContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("PdfReaderPage", () => {
  afterEach(cleanup);

  it("renders a document pdf", async () => {
    renderWithProviders(<PdfReaderPage kind="document" />);

    await waitFor(() => {
      expect(screen.getByText("Test PDF Document")).toBeInTheDocument();
    });
  });

  it("renders a submission pdf", async () => {
    renderWithProviders(<PdfReaderPage kind="submission" />, "/submission/2");

    await waitFor(() => {
      expect(screen.getByText("Test Submission")).toBeInTheDocument();
    });
  });
});
