/**
 * useProject — client-side hook for project/file state.
 * Fetches project metadata, file tree, file content, and search results
 * from the server-side API routes. Never touches the filesystem directly.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectFileEntry {
  path: string;
  isDirectory: boolean;
  extension: string;
  size: number;
  updatedAt: string;
}

export interface ProjectFileContent {
  path: string;
  content: string;
  language: string;
  lineCount: number;
  byteSize: number;
}

export interface ProjectSearchResult {
  path: string;
  line?: number;
  snippet: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  adapterType: "local" | "demo" | "github";
  language: string;
  framework: string;
  fileCount: number;
  version: string;
  readOnly: boolean;
  github?: {
    owner: string;
    repo: string;
    ref: string;
    url: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useProject() {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [files, setFiles] = useState<ProjectFileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<ProjectFileContent | null>(null);
  const [searchResults, setSearchResults] = useState<ProjectSearchResult[]>([]);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const recentFilesRef = useRef<string[]>([]);

  /* --- Fetch project metadata with timeout --- */
  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoadingProject(false);
        setError("Project load timed out. Using demo mode.");
      }
    }, 8000); // 8 second timeout

    (async () => {
      try {
        setLoadingProject(true);
        const res = await fetch("/api/project", {
          signal: AbortSignal.timeout(6000), // 6 second fetch timeout
        });
        if (!res.ok) throw new Error("Failed to load project");
        const data = await res.json();
        if (!cancelled) {
          setProject(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Project load failed";
          // If it's a timeout, use demo adapter as fallback
          if (msg.includes("timeout") || msg.includes("Timeout")) {
            try {
              const fallbackRes = await fetch("/api/project");
              if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                if (!cancelled) setProject(fallbackData);
              }
            } catch {
              // Silently fail, demo mode will be used
            }
          } else {
            setError(msg);
          }
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setLoadingProject(false);
      }
    })();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, []);

  /* --- Fetch file tree --- */
  const refreshFiles = useCallback(async (relativePath?: string) => {
    setLoadingFiles(true);
    try {
      const url = relativePath ? `/api/project/files?path=${encodeURIComponent(relativePath)}` : "/api/project/files";
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error("Failed to list files");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "File listing failed");
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (project) refreshFiles();
  }, [project, refreshFiles]);

  /* --- Read file content --- */
  const loadFile = useCallback(async (filePath: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingContent(true);
    setError(null);
    setSelectedPath(filePath);

    try {
      const res = await fetch(`/api/project/file?path=${encodeURIComponent(filePath)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to read ${filePath}`);
      }
      const data = await res.json();
      setFileContent(data.file);

      // Update recent files
      recentFilesRef.current = [
        filePath,
        ...recentFilesRef.current.filter((p) => p !== filePath),
      ].slice(0, 10);
      setRecentFiles([...recentFilesRef.current]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "File read failed");
      setFileContent(null);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  /* --- Search files --- */
  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/project/search?q=${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  /* --- Clear selection --- */
  const clearSelection = useCallback(() => {
    setSelectedPath(null);
    setFileContent(null);
  }, []);

  return {
    project,
    files,
    selectedPath,
    fileContent,
    searchResults,
    recentFiles,
    loadingProject,
    loadingFiles,
    loadingContent,
    searching,
    error,
    loadFile,
    search,
    refreshFiles,
    clearSelection,
    setSelectedPath,
  };
}
