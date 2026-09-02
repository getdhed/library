import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchProtectedBlob } from "../api/protectedFiles";
import { useProtectedBlobUrl } from "./useProtectedBlobUrl";

vi.mock("../api/protectedFiles", () => ({
  fetchProtectedBlob: vi.fn(),
}));

describe("useProtectedBlobUrl", () => {
  beforeEach(() => {
    vi.mocked(fetchProtectedBlob).mockResolvedValue(
      new Blob(["pdf"], { type: "application/pdf" })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches a protected resource and revokes its blob URL on cleanup", async () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:protected-pdf");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL");

    const { result, unmount } = renderHook(() =>
      useProtectedBlobUrl("/api/documents/1/file?v=1", "header-secret")
    );

    await waitFor(() => {
      expect(result.current.url).toBe("blob:protected-pdf");
    });
    expect(fetchProtectedBlob).toHaveBeenCalledWith(
      "/api/documents/1/file?v=1",
      "header-secret",
      expect.any(AbortSignal)
    );
    expect(createObjectURL).toHaveBeenCalledOnce();

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:protected-pdf");
  });
});
