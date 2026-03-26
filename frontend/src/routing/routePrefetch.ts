import { useEffect } from "react";
import type { User } from "../types";

export const routeLoaders = {
  layout: () => import("../components/Layout"),
  home: () => import("../pages/HomePage"),
  searchResults: () => import("../pages/SearchResultsPage"),
  book: () => import("../pages/BookPage"),
  browse: () => import("../pages/BrowsePage"),
  favorites: () => import("../pages/FavoritesPage"),
  settings: () => import("../pages/SettingsPage"),
  submit: () => import("../pages/SubmitPage"),
  myPdfs: () => import("../pages/MyPdfsPage"),
  adminDocuments: () => import("../pages/admin/AdminDocumentsPage"),
  adminStats: () => import("../pages/admin/AdminStatsPage"),
  login: () => import("../pages/LoginPage"),
  register: () => import("../pages/RegisterPage"),
} as const;

export type RouteChunk = keyof typeof routeLoaders;

type NavigatorWithHints = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
  deviceMemory?: number;
};

const prefetchedChunks = new Set<RouteChunk>();

function normalizePath(path: string) {
  const withoutQuery = path.split("?")[0] ?? "/";
  return withoutQuery || "/";
}

function uniqueChunks(chunks: RouteChunk[]) {
  return Array.from(new Set(chunks));
}

function canUsePrefetch() {
  if (import.meta.env.MODE === "test") {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  if (document.visibilityState === "hidden") {
    return false;
  }

  const nav = navigator as NavigatorWithHints;
  const connection = nav.connection;
  if (connection?.saveData) {
    return false;
  }

  if (connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") {
    return false;
  }

  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) {
    return false;
  }

  return true;
}

function scheduleWhenIdle(task: () => void) {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(() => task(), { timeout: 1400 });
    return () => {
      w.cancelIdleCallback?.(id);
    };
  }

  const timeoutId = window.setTimeout(task, 700);
  return () => {
    window.clearTimeout(timeoutId);
  };
}

export async function prefetchRouteChunk(chunk: RouteChunk) {
  if (prefetchedChunks.has(chunk)) {
    return;
  }

  prefetchedChunks.add(chunk);
  try {
    await routeLoaders[chunk]();
  } catch {
    prefetchedChunks.delete(chunk);
  }
}

function getRouteChunksForPath(path: string): RouteChunk[] {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === "/") {
    return ["home"];
  }
  if (normalizedPath.startsWith("/search")) {
    return ["searchResults"];
  }
  if (normalizedPath.startsWith("/catalog")) {
    return ["browse"];
  }
  if (normalizedPath.startsWith("/favorites")) {
    return ["favorites"];
  }
  if (normalizedPath.startsWith("/settings")) {
    return ["settings"];
  }
  if (normalizedPath.startsWith("/account/pdfs")) {
    return ["myPdfs"];
  }
  if (normalizedPath.startsWith("/submit")) {
    return ["submit"];
  }
  if (normalizedPath.startsWith("/documents/")) {
    return ["book"];
  }
  if (normalizedPath.startsWith("/admin/documents")) {
    return ["adminDocuments"];
  }
  if (normalizedPath.startsWith("/admin/stats")) {
    return ["adminStats"];
  }
  if (normalizedPath.startsWith("/login")) {
    return ["login"];
  }
  if (normalizedPath.startsWith("/register")) {
    return ["register"];
  }

  return [];
}

function getLikelyNextChunks(
  currentPath: string,
  role: User["role"] | undefined
): RouteChunk[] {
  const normalizedPath = normalizePath(currentPath);

  if (role === "admin") {
    if (normalizedPath.startsWith("/admin/documents")) {
      return ["adminStats", "searchResults", "browse"];
    }
    if (normalizedPath.startsWith("/admin/stats")) {
      return ["adminDocuments", "searchResults", "browse"];
    }
  }

  if (normalizedPath === "/") {
    return role === "admin"
      ? ["searchResults", "browse", "adminDocuments"]
      : ["searchResults", "browse", "favorites"];
  }

  if (normalizedPath.startsWith("/search")) {
    return role === "admin"
      ? ["browse", "book", "adminDocuments"]
      : ["browse", "book", "favorites"];
  }

  if (normalizedPath.startsWith("/catalog")) {
    return role === "admin"
      ? ["searchResults", "book", "adminDocuments"]
      : ["searchResults", "book", "favorites"];
  }

  if (normalizedPath.startsWith("/favorites")) {
    return ["browse", "searchResults", "book"];
  }

  if (normalizedPath.startsWith("/settings")) {
    return role === "admin"
      ? ["adminDocuments", "searchResults"]
      : ["myPdfs", "browse", "searchResults"];
  }

  if (normalizedPath.startsWith("/account/pdfs")) {
    return ["submit", "browse", "searchResults"];
  }

  if (normalizedPath.startsWith("/submit")) {
    return ["myPdfs", "browse", "searchResults"];
  }

  if (normalizedPath.startsWith("/documents/")) {
    return ["searchResults", "browse", "favorites"];
  }

  return role === "admin"
    ? ["adminDocuments", "adminStats", "searchResults"]
    : ["searchResults", "browse", "favorites"];
}

export async function prefetchPath(path: string) {
  if (!canUsePrefetch()) {
    return;
  }

  const chunks = uniqueChunks(getRouteChunksForPath(path));
  for (const chunk of chunks) {
    await prefetchRouteChunk(chunk);
  }
}

export function useSmartRoutePrefetch(
  currentPath: string,
  role: User["role"] | undefined
) {
  useEffect(() => {
    if (!role || !canUsePrefetch()) {
      return;
    }

    const chunks = uniqueChunks(getLikelyNextChunks(currentPath, role));
    if (chunks.length === 0) {
      return;
    }

    const cancel = scheduleWhenIdle(() => {
      void (async () => {
        for (const chunk of chunks) {
          await prefetchRouteChunk(chunk);
        }
      })();
    });

    return cancel;
  }, [currentPath, role]);
}
