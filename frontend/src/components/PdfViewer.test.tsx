import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProtectedBlob } from "../api/protectedFiles";
import PdfViewer from "./PdfViewer";

vi.mock("../api/protectedFiles", () => ({
  fetchProtectedBlob: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PdfViewer", () => {
  it("passes only a blob URL to PDF.js", async () => {
    vi.mocked(fetchProtectedBlob).mockResolvedValue(
      new Blob(["pdf"], { type: "application/pdf" })
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:protected-pdf");

    render(
      <PdfViewer
        url="/api/documents/1/file?v=1"
        token="header-secret"
      />
    );

    const frame = await screen.findByTitle("PDF Viewer");
    const source = frame.getAttribute("src") ?? "";
    expect(source).toContain("file=blob%3Aprotected-pdf");
    expect(source).not.toContain("header-secret");
    expect(source).not.toContain("%2Fapi%2Fdocuments");
  });
});
