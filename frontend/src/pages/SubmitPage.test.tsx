import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import SubmitPage from "./SubmitPage";

vi.mock("../api/library", () => ({
  createSubmission: vi.fn(),
  getDocumentTypes: vi.fn().mockResolvedValue({ items: ["Учебник"] }),
}));

import {
  createSubmission,
} from "../api/library";

afterEach(() => {
  cleanup();
});

describe("SubmitPage", () => {
  beforeEach(() => {
    vi.mocked(createSubmission).mockReset();
    window.URL.createObjectURL = vi.fn();
    window.URL.revokeObjectURL = vi.fn();
  });

  it("renders only the upload flow and no longer shows moderation history", async () => {
    vi.mocked(createSubmission).mockResolvedValue({
      id: 3,
    } as never);

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

    // Simulate file upload to show the form
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: {
        files: [new File(["dummy content"], "test.pdf", { type: "application/pdf" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Название документа")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Отправить на проверку" })
    ).toBeInTheDocument();

    expect(screen.queryByText("История модерации")).not.toBeInTheDocument();
    expect(screen.queryByText("Мои заявки")).not.toBeInTheDocument();
  });

  it("shows submitting state and redirects to my pdfs after success", async () => {
    let resolveSubmission: (() => void) | undefined;

    vi.mocked(createSubmission).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmission = () => resolve({ id: 3 } as never);
        })
    );

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
            <Route path="/account/pdfs" element={<div>Мои PDF page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // Simulate file upload to show the form
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: {
        files: [new File(["%PDF-1.4"], "distributed.pdf", { type: "application/pdf" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Название документа")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Название документа"), {
      target: { value: "Distributed Systems" },
    });
    // file is already uploaded above

    const submitButton = screen.getByRole("button", { name: "Отправить на проверку" });
    fireEvent.submit(submitButton.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Отправка..." })
      ).toBeDisabled();
    });

    resolveSubmission?.();

    await waitFor(() => {
      expect(screen.getByText("Мои PDF page")).toBeInTheDocument();
    });
  });
});
