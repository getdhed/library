import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditDocumentDialog from "./EditDocumentDialog";
import { ThemeProvider } from "../theme/ThemeContext";

vi.mock("../api/library", () => ({
  getDocumentTypes: vi.fn().mockResolvedValue({ items: ["book", "article"] }),
  updateDocument: vi.fn().mockResolvedValue({
    id: 1,
    title: "Updated Title",
    author: "New Author",
    year: 2024,
    type: "book",
    tags: [],
  }),
}));

const mockDoc = {
  id: 1,
  title: "Old Title",
  author: "Old Author",
  year: 2020,
  type: "article",
  tags: ["test"],
  description: "Desc",
  fileUrl: "url",
  fileSize: 100,
  createdAt: "2023-01-01T00:00:00Z",
  updatedAt: "2023-01-01T00:00:00Z",
};

describe("EditDocumentDialog", () => {
  afterEach(cleanup);

  it("opens dialog, populates form and saves", async () => {
    const { updateDocument } = await import("../api/library");
    const onSavedMock = vi.fn();

    render(
      <ThemeProvider>
        <EditDocumentDialog token="token" document={mockDoc} onSaved={onSavedMock} />
      </ThemeProvider>
    );

    // Open dialog
    const openBtn = screen.getByRole("button");
    await userEvent.click(openBtn);

    // Check title is populated
    await waitFor(() => {
      const titleInput = screen.getByRole("textbox", { name: /Заглавие/i });
      expect(titleInput).toHaveValue("Old Title");
    });

    // Edit title
    const titleInput = screen.getByRole("textbox", { name: /Заглавие/i });
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated Title");

    // Click Save
    const saveBtn = screen.getByRole("button", { name: /Сохранить/i });
    await userEvent.click(saveBtn);

    // Check API was called
    await waitFor(() => {
      expect(updateDocument).toHaveBeenCalled();
      expect(onSavedMock).toHaveBeenCalled();
    });
  });
});
