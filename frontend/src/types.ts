export interface User {
  id: number;
  username: string;
  fullName: string;
  role: "user" | "admin" | "superadmin";
  avatarUrl?: string;
  isActive: boolean;
  deactivationReason?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  lastLoginAt?: string;
}

export interface DocumentItem {
  id: number;
  title: string;
  titleTranslations?: Record<string, string>;
  author: string;
  executor?: string;
  scientificAdvisor?: string;
  year: number;
  type: string;
  placeOfPublication?: string;
  publisher?: string;
  periodicalName?: string;
  volume?: string;
  description: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  coverPath?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isFavorite: boolean;
  similarity?: number;
  deletedAt?: string;
  isLocal?: boolean;
  viewsCount: number;
}

export interface DocumentTypeItem {
  id: number;
  name: string;
  isHidden: boolean;
}

export interface LanguageItem {
  id: number;
  name: string;
  isHidden: boolean;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";
export type SubmissionSource = "user_upload" | "admin_import";

export interface SubmissionItem {
  id: number;
  userId: number;
  title: string;
  titleTranslations?: Record<string, string>;
  source: SubmissionSource;
  author?: string;
  executor?: string;
  scientificAdvisor?: string;
  placeOfPublication?: string;
  publisher?: string;
  periodicalName?: string;
  volume?: string;
  year?: number;
  type?: string;
  description?: string;
  tags?: string;
  comment?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  coverPath?: string;
  status: SubmissionStatus;
  moderationNote?: string;
  approvedDocumentId?: number;
  reviewedBy?: number;
  reviewerName?: string;
  reviewerUsername?: string;
  reviewerEmail?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  uploaderName?: string;
  uploaderUsername?: string;
  isLocal: boolean;
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

export interface PagedUsers {
  items: User[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface NamedStat {
  name: string;
  count: number;
}

export interface AdminStats {
  documentsCount: number;
  localDocumentsCount: number;
  externalDocumentsCount: number;
  visitsInPeriod: number;
  viewsToday: number;
  downloadsToday: number;
  searchesToday: number;
  uploadedInPeriod: number;
  uploadPeriodFrom: string;
  uploadPeriodTo: string;
  topQueries: NamedStat[];
  topDocuments: NamedStat[];
  documentsByType: NamedStat[];
  appLoadByHour: NamedStat[];
}

export interface DocumentAuditEvent {
  id: number;
  action: string;
  actorId?: number;
  actorName?: string;
  actorUsername?: string;
  documentId?: number;
  submissionId?: number;
  documentTitle: string;
  fileName: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface PagedAuditEvents {
  items: DocumentAuditEvent[];
  page: number;
  pageSize: number;
  total: number;
}
