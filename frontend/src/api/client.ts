const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers ?? {});

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text; // non-JSON response body
    }
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload)
        ? String((payload as any).error)
        : (typeof payload === "string" && payload.trim() !== "")
          ? payload
          : "request_failed";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
