import { afterEach, describe, expect, it, vi } from "vitest";
import {
  documentCoverUrl,
  documentFileUrl,
  submissionFileUrl,
} from "./library";
import { downloadProtectedFile, fetchProtectedBlob } from "./protectedFiles";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("protected file access", () => {
  it("builds file URLs without credentials", () => {
    expect(documentFileUrl(7, true, "2026-09-02")).toBe(
      "/api/documents/7/file?download=1&v=2026-09-02"
    );
    expect(documentCoverUrl(7, "2026-09-02")).toBe(
      "/api/documents/7/cover?v=2026-09-02"
    );
    expect(submissionFileUrl(9)).toBe("/api/submissions/9/file");
  });

  it("sends the JWT only in the Authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(["pdf"], { type: "application/pdf" }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchProtectedBlob("/api/documents/7/file?v=1", "header-secret");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/documents/7/file?v=1",
      expect.objectContaining({
        headers: { Authorization: "Bearer header-secret" },
      })
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain("header-secret");
  });

  it("revokes the temporary download URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Blob(["pdf"], { type: "application/pdf" }), {
          status: 200,
        })
      )
    );
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:download");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL");
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    await downloadProtectedFile(
      "/api/documents/7/file?download=1",
      "header-secret",
      "document.pdf"
    );

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:download");
  });
});
