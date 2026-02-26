import { Document, SearchHistoryItem } from "./types";

export const mockDocuments: Document[] = [
  {
    id: "1",
    title: "Алгоритмы и структуры данных",
    type: "Учебник",
    category: "ФКТИ > Кафедра программной инженерии > 2 курс",
    faculty: "ФКТИ",
    department: "Кафедра программной инженерии",
    year: 2022,
    visible: true,
    sizeMb: 12.3,
    tags: ["алгоритмы", "структуры данных", "программирование"],
    url: "https://example.com/docs/algorithms.pdf",
    createdAt: "2022-09-01T00:00:00.000Z",
  },
  {
    id: "2",
    title: "Математический анализ. Конспект лекций",
    type: "Конспект",
    category: "ФМиКН > Кафедра высшей математики > 1 курс",
    faculty: "ФМиКН",
    department: "Кафедра высшей математики",
    year: 2021,
    visible: true,
    sizeMb: 5.8,
    tags: ["матан", "лекции"],
    url: "https://example.com/docs/math-analysis.pdf",
    createdAt: "2021-09-01T00:00:00.000Z",
  },
  {
    id: "3",
    title: "Методичка по базам данных",
    type: "Методичка",
    category: "ФКТИ > Кафедра информационных систем > 3 курс",
    faculty: "ФКТИ",
    department: "Кафедра информационных систем",
    year: 2023,
    visible: true,
    sizeMb: 9.1,
    tags: ["sql", "postgres", "базы данных"],
    url: "https://example.com/docs/databases.pdf",
    createdAt: "2023-02-10T00:00:00.000Z",
  },
];

export const mockSearchHistory: SearchHistoryItem[] = [
  {
    id: "h1",
    query: "алгоритмы",
    timestamp: new Date().toISOString(),
  },
  {
    id: "h2",
    query: "матан 1 курс",
    timestamp: new Date().toISOString(),
  },
];

export function searchDocumentsLocal(query: string): Document[] {
  const q = query.trim().toLowerCase();
  if (!q) return mockDocuments;

  const parts = q.split(/\s+/);
  return mockDocuments.filter((doc) => {
    const title = doc.title.toLowerCase();
    return parts.every((part) => title.includes(part));
  });
}

export function getRecentDocuments(): Document[] {
  // для прототипа просто вернём все
  return mockDocuments;
}

export function getDocumentById(id: string): Document | undefined {
  return mockDocuments.find((d) => d.id === id);
}

