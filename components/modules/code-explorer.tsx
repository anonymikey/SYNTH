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

  const FileIcon = iconFor("fileCode");
  const DirIcon = iconFor("folder");
  const DirOpenIcon = iconFor("folderOpen");
  const ClockIcon = iconFor("clock");
  const SearchIcon = iconFor("search");

  return (
    <div className="flex h-full min-w-0 flex-col border-r border-border/60 bg-background/50">
      {/* Tab bar */}
      <div className="flex h-8 shrink-0 items-center gap-0 border-b border-border/40 px-1">
        {([
          { id: "files" as const, label: "Files", icon: iconFor("files") },
          { id: "search" as const, label: "Search", icon: SearchIcon },
          { id: "recent" as const, label: "Recent", icon: ClockIcon },
        ]).map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="ghost"
            className={`h-6 gap-1 px-2 text-[10px] ${
              tab === t.id
                ? "bg-synth-cyan/10 text-synth-cyan"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setTab(t.id);
              if (t.id !== "search") setQuery("");
            }}
          >
            <t.icon className="size-3" />
            {t.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Badge variant="outline" className="font-mono text-[7px] text-muted-foreground/60">
          {files.length}
        </Badge>
      </div>

      {/* Search/filter input */}
      {tab === "files" && (
        <div className="px-2 py-1.5">
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Filter files..."
            aria-label="Filter files"
            className="h-6 text-[10px]"
          />
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {/* FILES TAB */}
          {tab === "files" && (
            <div className="space-y-px" role="list" aria-label="Project file tree">
              {dirPaths.map((dirPath) => {
                const isExpanded = expandedDirs.has(dirPath);
                const children = tree.dirs.get(dirPath) ?? [];
                const dirName = dirPath.split("/").pop() ?? dirPath;
                const depth = dirPath.split("/").length - 1;
                return (
                  <div key={`dir-${dirPath}`}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-1.5 rounded-sm px-1.5 py-[3px] text-left text-muted-foreground hover:bg-synth-cyan/5 hover:text-foreground`}
                      style={{ paddingLeft: `${depth * 12 + 4}px` }}
                      onClick={() => toggleDir(dirPath)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <DirOpenIcon className="size-3.5 shrink-0 text-synth-cyan" />
                      ) : (
                        <DirIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className="text-[11px] font-medium">{dirName}/</span>
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
                <p className="px-2 py-6 text-center text-[10px] text-muted-foreground">No files match.</p>
              )}
            </div>
          )}

          {/* SEARCH TAB */}
          {tab === "search" && (
            <div className="space-y-px">
              <div className="px-1 py-1.5">
                <Input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search files and content..."
                  aria-label="Search files"
                  className="h-6 text-[10px]"
                />
              </div>
              {searching && (
                <p className="px-2 py-4 text-center text-[10px] text-muted-foreground">Searching...</p>
              )}
              {!searching && searchResults.length === 0 && query.trim().length >= 2 && (
                <p className="px-2 py-6 text-center text-[10px] text-muted-foreground">No results found.</p>
              )}
              {searchResults.map((result, i) => (
                <button
                  key={`${result.path}-${result.line ?? i}`}
                  type="button"
                  className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left hover:bg-synth-cyan/5"
                  onClick={() => onSelect(result.path)}
                >
                  <FileIcon className="mt-0.5 size-3.5 shrink-0 text-synth-cyan" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium text-foreground">
                      {result.path}{result.line ? `:${result.line}` : ""}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">
                      {result.snippet}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* RECENT TAB */}
          {tab === "recent" && (
            <div className="space-y-px">
              {recentFiles.length === 0 && (
                <p className="px-2 py-6 text-center text-[10px] text-muted-foreground">
                  No recently viewed files.
                </p>
              )}
              {recentFiles.map((filePath) => (
                <button
                  key={filePath}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-synth-cyan/5"
                  onClick={() => onSelect(filePath)}
                >
                  <ClockIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
                  <span className="min-w-0 truncate text-[11px] text-muted-foreground">{filePath}</span>
                </button>
              ))}
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
  const iconKey = ext === "css" || ext === "scss" ? "fileText" : ext === "json" ? "fileText" : "fileCode";
  const FileIcon = iconFor(iconKey);
  const fileName = file.path.split("/").pop() ?? file.path;

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-1.5 rounded-sm px-1.5 py-[3px] text-left ${
        isSelected
          ? "bg-synth-cyan/10 text-foreground"
          : "text-muted-foreground hover:bg-synth-cyan/5 hover:text-foreground"
      }`}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
      onClick={() => onSelect(file.path)}
      aria-pressed={isSelected}
    >
      <FileIcon
        className={`size-3.5 shrink-0 ${isSelected ? "text-synth-cyan" : "text-muted-foreground/40"}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate text-[11px]">{fileName}</span>
      {file.size > 0 && (
        <span className="shrink-0 font-mono text-[7px] text-muted-foreground/40">
          {file.size < 1024 ? `${file.size}B` : `${(file.size / 1024).toFixed(1)}K`}
        </span>
      )}
    </button>
  );
}
