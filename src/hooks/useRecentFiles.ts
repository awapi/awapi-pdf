import { useState, useCallback } from "react";

const STORAGE_KEY = "awapi-recent-files";
const MAX_RECENT = 5;

export interface RecentFile {
  path: string;
  name: string;
}

function loadRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentFile[];
  } catch {
    return [];
  }
}

function saveRecentFiles(files: RecentFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch {
    // ignore storage errors
  }
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecentFiles);

  const addRecentFile = useCallback((path: string, name: string) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f.path !== path);
      const next = [{ path, name }, ...filtered].slice(0, MAX_RECENT);
      saveRecentFiles(next);
      return next;
    });
  }, []);

  return { recentFiles, addRecentFile };
}
