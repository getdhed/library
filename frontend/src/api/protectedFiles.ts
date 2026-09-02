import { ApiError } from "./client";

async function protectedFileError(response: Response) {
  const body = await response.text();
  if (!body) {
    return "request_failed";
  }

  try {
    const payload = JSON.parse(body) as { error?: unknown };
    return typeof payload.error === "string" ? payload.error : "request_failed";
  } catch {
    return body;
  }
}

export async function fetchProtectedBlob(
  url: string,
  token: string,
  signal?: AbortSignal
) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await protectedFileError(response), response.status);
  }

  return response.blob();
}

export async function downloadProtectedFile(
  url: string,
  token: string,
  fileName: string
) {
  const blob = await fetchProtectedBlob(url, token);
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  }
}
