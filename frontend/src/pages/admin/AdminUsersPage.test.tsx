import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../auth/AuthContext";
import AdminUsersPage from "./AdminUsersPage";

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

const getAdminUsersMock = vi.fn(() => Promise.resolve({ items: users }));
const createAdminUserMock = vi.fn(() =>
  Promise.resolve({
    user: users[0],
    temporaryPassword: "tmp-pass",
  })
);
const updateAdminUserMock = vi.fn(() => Promise.resolve(users[0]));
const setAdminUserStatusMock = vi.fn(() => Promise.resolve(users[0]));
const resetAdminUserPasswordMock = vi.fn(() =>
  Promise.resolve({
    user: users[0],
    temporaryPassword: "reset-pass",
  })
);

vi.mock("../../api/library", () => ({
  createAdminUser: (...args: unknown[]) => createAdminUserMock(...args),
  getAdminUsers: (...args: unknown[]) => getAdminUsersMock(...args),
  resetAdminUserPassword: (...args: unknown[]) =>
    resetAdminUserPasswordMock(...args),
  setAdminUserStatus: (...args: unknown[]) => setAdminUserStatusMock(...args),
  updateAdminUser: (...args: unknown[]) => updateAdminUserMock(...args),
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
    
    fireEvent.click(screen.getByRole("button", { name: "Создать" }));

    await waitFor(() => {
      expect(createAdminUserMock).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({
          username: "newreader",
          fullName: "New Reader",
          role: "user",
        })
      );
    });
    expect(await screen.findByText(/tmp-pass/)).toBeInTheDocument();
  });
});
