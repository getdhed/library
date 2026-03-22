import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DocumentListItem from "./DocumentListItem";

vi.mock("../api/library", () => ({
  documentCoverUrl: vi.fn(() => "/api/documents/1/cover"),
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
  isVisible: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  departmentId: 1,
  department: "Кафедра программной инженерии",
  facultyId: 1,
  faculty: "ФКТИ",
  tags: [],
  isFavorite: false,
};

describe("DocumentListItem", () => {
  it("shows a placeholder when the cover image fails to load", () => {
    render(
      <MemoryRouter>
        <DocumentListItem item={item} token="token" />
      </MemoryRouter>
    );

    fireEvent.error(screen.getByAltText("Обложка DevOps Playbook"));

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getAllByText("Учебник")).toHaveLength(2);
  });
});
