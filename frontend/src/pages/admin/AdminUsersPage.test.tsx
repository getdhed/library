import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../auth/AuthContext";
import AdminUsersPage from "./AdminUsersPage";
import * as libraryApi from "../../api/library";



const users = [
  {
    id: 2,
    username: "reader",
    fullName: "Reader",
    role: "user" as const,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const {
  getAdminUsersMock,
  createAdminUserMock,
  updateAdminUserMock,
  setAdminUserStatusMock,
  resetAdminUserPasswordMock,
  getAdminStatsMock,
  getAdminSubmissionsMock,
} = vi.hoisted(() => ({
  getAdminUsersMock: vi.fn(() => Promise.resolve({ items: users })),
  createAdminUserMock: vi.fn(() =>
    Promise.resolve({
      user: users[0],
      temporaryPassword: "tmp-pass",
    })
  ),
  updateAdminUserMock: vi.fn(() => Promise.resolve(users[0])),
  setAdminUserStatusMock: vi.fn(() => Promise.resolve(users[0])),
  resetAdminUserPasswordMock: vi.fn(() =>
    Promise.resolve({
      user: users[0],
      temporaryPassword: "reset-pass",
    })
  ),
  getAdminStatsMock: vi.fn(() => Promise.resolve({ documentsCount: 0 })),
  getAdminSubmissionsMock: vi.fn(() => Promise.resolve({ items: [], totalCount: 0 })),
}));

vi.mock("../../api/library", () => ({
  createAdminUser: createAdminUserMock,
  getAdminUsers: getAdminUsersMock,
  resetAdminUserPassword: resetAdminUserPasswordMock,
  setAdminUserStatus: setAdminUserStatusMock,
  updateAdminUser: updateAdminUserMock,
  getAdminStats: getAdminStatsMock,
  getAdminSubmissions: getAdminSubmissionsMock,
}));

function renderPage() {
  return render(
    <AuthContext.Provider
      value={{
        token: "token",
        user: {
          id: 1,
          fullName: "Admin",
          username: "admin",
          role: "admin",
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
      <MemoryRouter initialEntries={["/admin/users"]}>
        <Routes>
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("lists users and creates a new account with a temporary password", async () => {
    renderPage();

    expect(await screen.findByText("reader")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Пользователи" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Создать пользователя" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const fullNameInput = await screen.findByLabelText("ФИО");
    fireEvent.change(fullNameInput, {
      target: { value: "New Reader" },
    });
    
    const usernameInput = await screen.findByLabelText("Логин");
    fireEvent.change(usernameInput, {
      target: { value: "newreader" },
    });
    fireEvent.change(await screen.findByLabelText("Пароль"), {
      target: { value: "secret123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: "Создать" }));

    await waitFor(() => {
      expect(createAdminUserMock).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({
          username: "newreader",
          fullName: "New Reader",
          role: "user",
          password: "secret123",
        })
      );
    });
    expect(await screen.findByText(/tmp-pass/)).toBeInTheDocument();
  });
});
