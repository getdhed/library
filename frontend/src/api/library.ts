import { request } from "./client";
import type {
  AdminStats,
  AuthPayload,
  DocumentAuditEvent,
  DocumentItem,
  DocumentTypeItem,
  HomePayload,
  LanguageItem,
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
  isLocal?: boolean | string;
  hasTranslation?: boolean | string;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
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

export function changeMyPassword(
  token: string,
  input: { oldPassword: string; newPassword: string }
) {
  return request<{ status: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
    token,
  });
}

export function getHome(token: string) {
  return request<HomePayload>("/home", { token });
}

export function getSuggestions(token: string, q: string, options?: { signal?: AbortSignal }) {
  return request<{ items: DocumentItem[] }>(
    `/search/suggest${buildQuery({ q })}`,
    { token, signal: options?.signal }
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

export function getLanguages() {
  return request<{ items: string[] }>("/catalog/languages");
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

export function hardDeleteDocument(token: string, id: number) {
  return request<void>(`/admin/documents/${id}/hard`, {
    method: "DELETE",
    token,
  });
}

export async function deleteAdminUser(token: string, id: number): Promise<void> {
  await request(`/admin/users/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function hardDeleteAdminUser(token: string, id: number): Promise<void> {
  await request(`/admin/users/${id}/hard`, {
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

export async function downloadAdminDBBackup(token: string) {
  const API_URL = import.meta.env.VITE_API_URL ?? "/api";
  const response = await fetch(`${API_URL}/admin/backup/db`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Не удалось скачать резервную копию");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  // Try to extract filename from Content-Disposition header if possible
  let filename = "library_backup.bak";
  const disposition = response.headers.get("Content-Disposition");
  if (disposition && disposition.indexOf("filename=") !== -1) {
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch.length === 2) {
      filename = filenameMatch[1];
    }
  }
  
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
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
  isActive: boolean,
  reason?: string
) {
  return request<User>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive, deactivationReason: reason }),
    token,
  });
}

export function resetAdminUserPassword(token: string, id: number, password: string) {
  return request<{ status: string }>(`/admin/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
    token,
  });
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
  download = false,
  version?: string
) {
  const params = new URLSearchParams();
  if (download) {
    params.set("download", "1");
  }
  if (version) {
    params.set("v", version);
  }
  const query = params.toString();
  return `${import.meta.env.VITE_API_URL ?? "/api"}/documents/${id}/file${query ? `?${query}` : ""}`;
}

export function documentCoverUrl(id: number, version?: string) {
  const params = new URLSearchParams();
  if (version) {
    params.set("v", version);
  }
  const query = params.toString();
  return `${import.meta.env.VITE_API_URL ?? "/api"}/documents/${id}/cover${query ? `?${query}` : ""}`;
}

export function submissionFileUrl(
  id: number,
  download = false,
  version?: string
) {
  const params = new URLSearchParams();
  if (download) {
    params.set("download", "1");
  }
  if (version) {
    params.set("v", version);
  }
  const query = params.toString();
  return `${import.meta.env.VITE_API_URL ?? "/api"}/submissions/${id}/file${query ? `?${query}` : ""}`;
}

export function adminGetDocumentTypes(token: string, page: number = 1, limit: number = 50) {
  return request<{ items: DocumentTypeItem[], total: number }>(`/admin/document-types?page=${page}&limit=${limit}`, { token });
}

export function adminCreateDocumentType(token: string, name: string) {
  return request<DocumentTypeItem>(`/admin/document-types`, {
    token,
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function adminUpdateDocumentType(token: string, id: number, name: string) {
  return request<void>(`/admin/document-types/${id}`, {
    token,
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function adminDeleteDocumentType(token: string, id: number) {
  return request<void>(`/admin/document-types/${id}`, {
    token,
    method: "DELETE",
  });
}

export function adminGetLanguages(token: string, page: number = 1, limit: number = 50) {
  return request<{ items: LanguageItem[], total: number }>(`/admin/languages?page=${page}&limit=${limit}`, { token });
}

export function adminCreateLanguage(token: string, name: string) {
  return request<LanguageItem>(`/admin/languages`, {
    token,
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function adminUpdateLanguage(token: string, id: number, name: string) {
  return request<void>(`/admin/languages/${id}`, {
    token,
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function adminToggleLanguageVisibility(token: string, id: number, isHidden: boolean) {
  return request<void>(`/admin/languages/${id}/visibility`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ isHidden }),
  });
}

export function adminDeleteLanguage(token: string, id: number) {
  return request<void>(`/admin/languages/${id}`, {
    token,
    method: "DELETE",
  });
}

export function adminToggleDocumentTypeVisibility(token: string, id: number, isHidden: boolean) {
  return request<void>(`/admin/document-types/${id}/visibility`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ isHidden }),
  });
}

export function adminUploadBackground(token: string, file: File) {
  const formData = new FormData();
  formData.append("image", file);

  return request<void>(`/admin/settings/background`, {
    token,
    method: "POST",
    body: formData,
  });
}

let bgCacheBuster = Date.now();

export function getBackgroundUrl() {
  return `${import.meta.env.VITE_BACKEND_URL ?? ""}/api/public/background?t=${bgCacheBuster}`;
}

export function refreshBackgroundCache() {
  bgCacheBuster = Date.now();
}
