export interface User {
  id: number;
  email: string;
  fullName: string;
  role: "user" | "admin";
  avatarUrl?: string;
  createdAt: string;
}

export interface Faculty {
  id: number;
  name: string;
  slug: string;
}

export interface Department {
  id: number;
  facultyId: number;
  name: string;
  slug: string;
  faculty?: string;
}

export interface DocumentItem {
  id: number;
  title: string;
  author: string;
  year: number;
  type: string;
  description: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  coverPath?: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  departmentId: number;
  department: string;
  facultyId: number;
  faculty: string;
  tags: string[];
  isFavorite: boolean;
  similarity?: number;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";
export type SubmissionSource = "user_upload" | "admin_import";

export interface SubmissionItem {
  id: number;
  userId: number;
  title: string;
  author?: string;
  departmentId?: number;
  department?: string;
  facultyId?: number;
  faculty?: string;
  comment?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  coverPath?: string;
  status: SubmissionStatus;
  source: SubmissionSource;
  moderationNote?: string;
  approvedDocumentId?: number;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  uploaderName?: string;
  uploaderEmail?: string;
}

export interface ImportFolderResult {
  queued: number;
  errors: Array<{
    fileName: string;
    error: string;
  }>;
}

export interface SearchHistoryItem {
  id: number;
  query: string;
  createdAt: string;
}

export interface PagedDocuments {
  items: DocumentItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface HomePayload {
  recent: DocumentItem[];
  favorites: DocumentItem[];
  searchHistory: SearchHistoryItem[];
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface NamedStat {
  name: string;
  count: number;
}

export interface FacultyDocStat {
  faculty: string;
  count: number;
}

export interface AdminStats {
  documentsCount: number;
  viewsToday: number;
  downloadsToday: number;
  searchesToday: number;
  topQueries: NamedStat[];
  topDocuments: NamedStat[];
  documentsByFaculty: FacultyDocStat[];
}
