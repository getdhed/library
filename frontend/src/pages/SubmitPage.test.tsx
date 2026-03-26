import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/AuthContext";
import SubmitPage from "./SubmitPage";

vi.mock("../api/library", () => ({
  createSubmission: vi.fn(),
  getDepartments: vi.fn(),
  getFaculties: vi.fn(),
}));

import {
  createSubmission,
  getDepartments,
  getFaculties,
} from "../api/library";

afterEach(() => {
  cleanup();
});

describe("SubmitPage", () => {
  beforeEach(() => {
    vi.mocked(getFaculties).mockResolvedValue({ items: [] });
    vi.mocked(getDepartments).mockResolvedValue({ items: [] });
    vi.mocked(createSubmission).mockReset();
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

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Название")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Отправить PDF" })
    ).toBeInTheDocument();
    expect(screen.getByText("Перейти в мои PDF")).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Название")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Название"), {
      target: { value: "Distributed Systems" },
    });
    fireEvent.change(screen.getByLabelText("PDF-файл"), {
      target: {
        files: [new File(["%PDF-1.4"], "distributed.pdf", { type: "application/pdf" })],
      },
    });

    const submitButton = screen.getByRole("button", { name: "Отправить PDF" });
    fireEvent.submit(submitButton.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Отправляется..." })
      ).toBeDisabled();
    });

    resolveSubmission?.();

    await waitFor(() => {
      expect(screen.getByText("Мои PDF page")).toBeInTheDocument();
    });
  });
});
