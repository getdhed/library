export interface Document {
  id: string;
  title: string;
  type: string;
  category: string;
  faculty: string;
  department: string;
  year: number;
  visible: boolean;
  sizeMb: number;
  tags: string[];
  url: string;
  createdAt: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
}

