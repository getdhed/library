import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DocumentListItem from "./DocumentListItem";

vi.mock("../api/library", () => ({
  documentCoverUrl: vi.fn(() => "/api/documents/1/cover"),
}));

vi.mock("../api/protectedFiles", () => ({
  fetchProtectedBlob: vi.fn(() => Promise.resolve(new Blob(["cover"]))),
}));

const item = {
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [],
  isFavorite: false,
  viewsCount: 0,
};

describe("DocumentListItem", () => {
  it("shows only type, year, and title when the cover image fails to load", async () => {
    render(
      <MemoryRouter>
        <DocumentListItem item={item} token="token" />
      </MemoryRouter>
    );

    fireEvent.error(await screen.findByAltText("Обложка DevOps Playbook"));

    expect(screen.getByText("Нет превью")).toBeInTheDocument();
    expect(screen.getAllByText("Учебник")).toHaveLength(1);
    expect(screen.getByText("Demo Author")).toBeInTheDocument();
    expect(screen.queryByText("Generated demo PDF set")).not.toBeInTheDocument();
    expect(screen.queryByText(/Alias:/i)).not.toBeInTheDocument();
  });
});
