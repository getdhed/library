import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditDocumentDialog from "./EditDocumentDialog";

vi.mock("../api/library", () => ({
  getDocumentTypes: vi.fn().mockResolvedValue({ items: ["Учебник", "Статья"] }),
  updateDocument: vi.fn(),
}));

import { updateDocument } from "../api/library";

describe("EditDocumentDialog", () => {
  const mockDocument = {
    id: 1,
    title: "Old Title",
    author: "Old Author",
    year: 2020,
    type: "Учебник",
    description: "Old Description",
    fileName: "old.pdf",
    fileSizeBytes: 1024,
    mimeType: "application/pdf",
    createdAt: "2020-01-01T00:00:00Z",
    updatedAt: "2020-01-01T00:00:00Z",
    isFavorite: false,
    isLocal: true,
    tags: [],
    viewsCount: 0,
  };

  afterEach(() => {
    cleanup();
  });

  it("renders correctly with given document data", async () => {
    render(
      <EditDocumentDialog
        token="test-token"
        document={mockDocument}
        onSaved={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Редактировать" }));

    expect(screen.getByDisplayValue("Old Title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Old Author")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2020")).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", async () => {
    const onSaved = vi.fn();
    render(
      <EditDocumentDialog
        token="test-token"
        document={mockDocument}
        onSaved={onSaved}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Редактировать" }));
    await userEvent.click(screen.getByRole("button", { name: "Отмена" }));
    
    // Check if dialog closed by verifying the title input is gone
    await waitFor(() => {
      expect(screen.queryByLabelText(/Заглавие/i)).not.toBeInTheDocument();
    });
  });

  it("submits the form with updated data", async () => {
    const onSaved = vi.fn();
    vi.mocked(updateDocument).mockResolvedValueOnce({ ...mockDocument, title: "New Title" } as any);

    render(
      <EditDocumentDialog
        token="test-token"
        document={mockDocument}
        onSaved={onSaved}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Редактировать" }));

    const titleInput = screen.getByLabelText(/Заглавие/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "New Title");

    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(updateDocument).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({
        title: "New Title"
      }));
    });
  });
});
