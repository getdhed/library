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
  favoriteAlias?: string;
  similarity?: number;
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
