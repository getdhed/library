import { request } from "./client";
import type {
  AdminStats,
  AuthPayload,
  DocumentAuditEvent,
  DocumentItem,
  HomePayload,
  PagedAuditEvents,
  PagedDocuments,
  PagedUsers,
  SearchHistoryItem,
  SubmissionItem,
  User,
} from "../types";

export type DocumentQuery = {
  q?: string;
  type?: string;
  author?: string;
  tags?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  yearFrom?: string | number;
  yearTo?: string | number;
  includeDeleted?: string | number;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== 0) {
      query.set(key, String(value));
    }
  });
  const raw = query.toString();
  return raw ? `?${raw}` : "";
}

export function register(input: {
  username: string;
  password: string;
  fullName: string;
}) {
  return request<AuthPayload>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: { username: string; password: string }) {
  return request<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getMe(token: string) {
  return request<User>("/me", { token });
}

export function getHome(token: string) {
  return request<HomePayload>("/home", { token });
}

export function getSuggestions(token: string, q: string) {
  return request<{ items: DocumentItem[] }>(
    `/search/suggest${buildQuery({ q })}`,
    { token }
  );
}

export function getDocuments(token: string, query: DocumentQuery) {
  return request<PagedDocuments>(`/documents${buildQuery(query)}`, { token });
}

export function getDocument(token: string, id: number) {
  return request<DocumentItem>(`/documents/${id}`, { token });
}

export function getSubmission(token: string, id: number) {
  return request<SubmissionItem>(`/submissions/${id}`, { token });
}

export function markOpened(token: string, id: number) {
  return request<void>(`/documents/${id}/open`, { method: "POST", token });
}

export function favoriteDocument(token: string, id: number) {
  return request<void>(`/documents/${id}/favorite`, { method: "POST", token });
}

export function unfavoriteDocument(token: string, id: number) {
  return request<void>(`/documents/${id}/favorite`, {
    method: "DELETE",
    token,
  });
}

export function toggleDocumentFavorite(
  token: string,
  id: number,
  isFavorite: boolean
) {
  return isFavorite
    ? unfavoriteDocument(token, id)
    : favoriteDocument(token, id);
}


export function getDocumentTypes() {
  return request<{ items: string[] }>("/catalog/document-types");
}

export function getRecent(token: string) {
  return request<{ items: DocumentItem[] }>("/profile/recent", { token });
}

export function getFavorites(token: string) {
  return request<{ items: DocumentItem[] }>("/profile/favorites", { token });
}

export function getSearchHistory(token: string) {
  return request<{ items: SearchHistoryItem[] }>("/profile/search-history", {
    token,
  });
}

export function createSubmission(token: string, formData: FormData) {
  return request<SubmissionItem>("/submissions", {
    method: "POST",
    body: formData,
    token,
  });
}

export function getMySubmissions(token: string) {
  return request<{ items: SubmissionItem[] }>("/profile/submissions", { token });
}

export function getAdminDocuments(token: string, query: DocumentQuery) {
  return request<PagedDocuments>(`/admin/documents${buildQuery(query)}`, {
    token,
  });
}

export function getAdminSubmissions(token: string, status?: string) {
  return request<{ items: SubmissionItem[] }>(
    `/admin/submissions${buildQuery({ status })}`,
    { token }
  );
}

export function createDocument(token: string, formData: FormData) {
  return request<DocumentItem>("/admin/documents", {
    method: "POST",
    body: formData,
    token,
  });
}

export function updateDocument(token: string, id: number, formData: FormData) {
  return request<DocumentItem>(`/admin/documents/${id}`, {
    method: "PUT",
    body: formData,
    token,
  });
}

export function deleteDocument(token: string, id: number) {
  return request<void>(`/admin/documents/${id}`, {
    method: "DELETE",
    token,
  });
}

export function restoreDocument(token: string, id: number) {
  return request<void>(`/admin/documents/${id}/restore`, {
    method: "POST",
    token,
  });
}




export function getAdminStats(
  token: string,
  query: { dateFrom?: string; dateTo?: string } = {}
) {
  return request<AdminStats>(`/admin/stats${buildQuery(query)}`, { token });
}

export function getAdminDocumentAudit(token: string, id: number) {
  return request<{ items: DocumentAuditEvent[] }>(
    `/admin/documents/${id}/audit`,
    { token }
  );
}

export function getAdminAudit(
  token: string,
  query: { q?: string; action?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {}
) {
  return request<PagedAuditEvents>(
    `/admin/audit${buildQuery(query)}`,
    { token }
  );
}

export function getAdminUsers(
  token: string,
  query: { q?: string; role?: string; status?: string; page?: number; pageSize?: number } = {}
) {
  return request<PagedUsers>(`/admin/users${buildQuery(query)}`, {
    token,
  });
}

export function createAdminUser(
  token: string,
  input: { username: string; fullName: string; role: User["role"]; password?: string }
) {
  return request<{ user: User; temporaryPassword: string }>("/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
    token,
  });
}

export function updateAdminUser(
  token: string,
  id: number,
  input: { username: string; fullName: string; role: User["role"] }
) {
  return request<User>(`/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
    token,
  });
}

export function setAdminUserStatus(
  token: string,
  id: number,
  isActive: boolean
) {
  return request<User>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
    token,
  });
}

export function resetAdminUserPassword(token: string, id: number) {
  return request<{ user: User; temporaryPassword: string }>(
    `/admin/users/${id}/reset-password`,
    {
      method: "POST",
      token,
    }
  );
}

export function approveSubmission(token: string, id: number, formData: FormData) {
  return request<DocumentItem>(`/admin/submissions/${id}/approve`, {
    method: "POST",
    body: formData,
    token,
  });
}

export function rejectSubmission(
  token: string,
  id: number,
  moderationNote: string
) {
  return request<SubmissionItem>(`/admin/submissions/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ moderationNote }),
    token,
  });
}

export function documentFileUrl(
  id: number,
  token: string,
  download = false,
  version?: string
) {
  const params = new URLSearchParams();
  if (download) {
    params.set("download", "1");
  }
  params.set("token", token);
  if (version) {
    params.set("v", version);
  }
  return `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080"}/api/documents/${id}/file?${params.toString()}`;
}

export function documentCoverUrl(id: number, token: string, version?: string) {
  const params = new URLSearchParams();
  params.set("token", token);
  if (version) {
    params.set("v", version);
  }
  return `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080"}/api/documents/${id}/cover?${params.toString()}`;
}

export function submissionFileUrl(
  id: number,
  token: string,
  download = false,
  version?: string
) {
  const params = new URLSearchParams();
  if (download) {
    params.set("download", "1");
  }
  params.set("token", token);
  if (version) {
    params.set("v", version);
  }
  return `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080"}/api/submissions/${id}/file?${params.toString()}`;
}
