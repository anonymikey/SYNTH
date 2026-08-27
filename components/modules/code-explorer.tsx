"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { iconFor } from "@/lib/icons";
import type { ProjectFileEntry, ProjectSearchResult } from "@/lib/project/use-project";

interface CodeExplorerProps {
  files: ProjectFileEntry[];
  selectedPath: string | null;
  recentFiles: string[];
  searchResults: ProjectSearchResult[];
  searching: boolean;
  onSelect: (path: string) => void;
  onSearch: (query: string) => void;
}

type ExplorerTab = "files" | "search" | "recent";

export function CodeExplorer({
  files,
  selectedPath,
  recentFiles,
  searchResults,
  searching,
  onSelect,
  onSearch,
}: CodeExplorerProps) {
  const [tab, setTab] = useState<ExplorerTab>("files");
  const [query, setQuery] = useState("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["src", "app", "components", "lib"]));

  // Build a tree structure from flat file list
  const tree = useMemo(() => {
    const dirs = new Map<string, ProjectFileEntry[]>();
    const rootFiles: ProjectFileEntry[] = [];

    for (const file of files) {
      const parts = file.path.split("/");
      if (parts.length === 1) {
        rootFiles.push(file);
      } else {
        const dirPath = parts.slice(0, -1).join("/");
        if (!dirs.has(dirPath)) dirs.set(dirPath, []);
        dirs.get(dirPath)!.push(file);
      }
    }

    return { dirs, rootFiles };
  }, [files]);

  // Collect directory entries (paths that have children)
  const dirPaths = useMemo(() => {
    const dirs = new Set<string>();
    for (const file of files) {
      const parts = file.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/"));
      }
    }
    return [...dirs].sort();
  }, [files]);

  const toggleDir = useCallback((dir: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  }, []);

  // Filter files by search query
  const filteredFiles = useMemo(() => {
    if (!query.trim()) return files;
    const lower = query.toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(lower));
  }, [files, query]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim().length >= 2) {
        setTab("search");
        onSearch(value);
      } else if (tab === "search") {
        setTab("files");
      }
    },
    [onSearch, tab],
  );

  const SearchIcon = iconFor("search");
  const ClockIcon = iconFor("clock");

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#0c0e16]/80">
      {/* Tab bar */}
      <div className="flex h-7 shrink-0 items-center gap-0 border-b border-white/[.06] px-1">
        {([
          { id: "files" as const, label: "Files", icon: iconFor("files") },
          { id: "search" as const, label: "Search", icon: SearchIcon },
          { id: "recent" as const, label: "Recent", icon: ClockIcon },
        ]).map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="ghost"
            className={`h-5 gap-1 px-1.5 text-[9px] ${
              tab === t.id
                ? "text-[#2dd4bf]/70 bg-[#2dd4bf]/[0.06]"
                : "text-white/30 hover:text-white/50"
            }`}
            onClick={() => {
              setTab(t.id);
              if (t.id !== "search") setQuery("");
            }}
          >
            <t.icon className="size-2.5" />
            {t.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Badge variant="outline" className="font-mono text-[6px] text-white/20 border-white/[0.06]">
          {files.length}
        </Badge>
      </div>

      {/* Search/filter input */}
      {tab === "files" && (
        <div className="px-1.5 py-1">
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Filter files..."
            aria-label="Filter files"
            className="h-5 text-[9px] bg-white/[0.03] border-white/[0.06]"
          />
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-0.5">
          {/* FILES TAB */}
          {tab === "files" && (
            <div className="space-y-px" role="list" aria-label="Project file tree">
              {dirPaths.map((dirPath) => {
                const isExpanded = expandedDirs.has(dirPath);
                const children = tree.dirs.get(dirPath) ?? [];
                const dirName = dirPath.split("/").pop() ?? dirPath;
                const depth = dirPath.split("/").length - 1;
                const DirIcon = iconFor(isExpanded ? "folderOpen" : "folder");
                return (
                  <div key={`dir-${dirPath}`}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-1 rounded-sm px-1 py-[2px] text-left text-white/40 hover:bg-[#2dd4bf]/[0.04] hover:text-white/60 transition-colors"
                      style={{ paddingLeft: `${depth * 10 + 4}px` }}
                      onClick={() => toggleDir(dirPath)}
                      aria-expanded={isExpanded}
                    >
                      <DirIcon className={`size-3 shrink-0 ${isExpanded ? "text-[#2dd4bf]/50" : "text-white/20"}`} />
                      <span className="text-[10px] font-medium">{dirName}/</span>
                    </button>
                    {isExpanded && children.map((file) => (
                      <FileRow key={file.path} file={file} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
                    ))}
                  </div>
                );
              })}
              {tree.rootFiles.map((file) => (
                <FileRow key={file.path} file={file} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
              ))}
              {filteredFiles.length === 0 && (
                <p className="px-2 py-4 text-center text-[9px] text-white/20">No files match.</p>
              )}
            </div>
          )}

          {/* SEARCH TAB */}
          {tab === "search" && (
            <div className="space-y-px">
              <div className="px-1 py-1">
                <Input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search files and content..."
                  aria-label="Search files"
                  className="h-5 text-[9px] bg-white/[0.03] border-white/[0.06]"
                />
              </div>
              {searching && (
                <p className="px-2 py-3 text-center text-[9px] text-white/20">Searching...</p>
              )}
              {!searching && searchResults.length === 0 && query.trim().length >= 2 && (
                <p className="px-2 py-4 text-center text-[9px] text-white/20">No results found.</p>
              )}
              {searchResults.map((result, i) => {
                const ResultFileIcon = iconFor("fileCode");
                return (
                  <button
                    key={`${result.path}-${result.line ?? i}`}
                    type="button"
                    className="flex w-full items-start gap-1.5 rounded-sm px-1.5 py-1.5 text-left hover:bg-[#2dd4bf]/[0.04] transition-colors"
                    onClick={() => onSelect(result.path)}
                  >
                    <ResultFileIcon className="mt-0.5 size-3 shrink-0 text-[#2dd4bf]/40" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-medium text-white/65">
                        {result.path}{result.line ? `:${result.line}` : ""}
                      </span>
                      <span className="mt-0.5 block truncate text-[8px] text-white/25">
                        {result.snippet}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* RECENT TAB */}
          {tab === "recent" && (
            <div className="space-y-px">
              {recentFiles.length === 0 && (
                <p className="px-2 py-4 text-center text-[9px] text-white/20">
                  No recently viewed files.
                </p>
              )}
              {recentFiles.map((filePath) => {
                const ClockSmallIcon = iconFor("clock");
                return (
                  <button
                    key={filePath}
                    type="button"
                    className="flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1.5 text-left hover:bg-[#2dd4bf]/[0.04] transition-colors"
                    onClick={() => onSelect(filePath)}
                  >
                    <ClockSmallIcon className="size-3 shrink-0 text-white/20" />
                    <span className="min-w-0 truncate text-[10px] text-white/40">{filePath}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FileRow({
  file,
  selectedPath,
  onSelect,
  depth,
}: {
  file: ProjectFileEntry;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const isSelected = file.path === selectedPath;
  const ext = file.extension;
  const fileName = file.path.split("/").pop() ?? file.path;

  // Extension color
  const extColor = (() => {
    switch (ext) {
      case "tsx":
      case "ts":
        return "text-blue-400";
      case "jsx":
      case "js":
        return "text-yellow-400";
      case "css":
      case "scss":
        return "text-pink-400";
      case "json":
        return "text-green-400";
      case "md":
        return "text-white/40";
      case "html":
        return "text-orange-400";
      default:
        return "text-white/30";
    }
  })();

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-1 rounded-sm px-1 py-[2px] text-left transition-colors ${
        isSelected
          ? "bg-[#2dd4bf]/[0.08] text-white/80"
          : "text-white/35 hover:bg-[#2dd4bf]/[0.04] hover:text-white/60"
      }`}
      style={{ paddingLeft: `${depth * 10 + 4}px` }}
      onClick={() => onSelect(file.path)}
      aria-pressed={isSelected}
    >
      <span className={`size-2 shrink-0 rounded-sm ${extColor}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-[10px]">{fileName}</span>
      {file.size > 0 && (
        <span className="shrink-0 font-mono text-[7px] text-white/15">
          {file.size < 1024 ? `${file.size}B` : `${(file.size / 1024).toFixed(1)}K`}
        </span>
      )}
    </button>
  );
}
