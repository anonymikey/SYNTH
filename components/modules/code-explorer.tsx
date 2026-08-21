"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

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
    [onSearch, tab]
  );

  const FileIcon = iconFor("fileCode");
  const DirIcon = iconFor("folder");
  const DirOpenIcon = iconFor("folderOpen");
  const ClockIcon = iconFor("clock");
  const SearchIcon = iconFor("search");

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Explorer</CardTitle>
          <Badge variant="outline" className="font-mono text-[9px]">{files.length}</Badge>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1">
          <Button
            type="button"
            variant={tab === "files" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={() => { setTab("files"); setQuery(""); }}
          >
            {(() => { const Ic = iconFor("files"); return <Ic className="size-3" />; })()} Files
          </Button>
          <Button
            type="button"
            variant={tab === "search" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={() => setTab("search")}
          >
            <SearchIcon className="size-3" /> Search
          </Button>
          <Button
            type="button"
            variant={tab === "recent" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={() => setTab("recent")}
          >
            <ClockIcon className="size-3" /> Recent
          </Button>
        </div>
        {tab === "files" && (
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Filter files..."
            aria-label="Filter files"
            className="h-7 text-xs"
          />
        )}
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[20rem] lg:h-[32rem]">
          {/* FILES TAB */}
          {tab === "files" && (
            <div className="space-y-0.5 pr-2" role="list" aria-label="Project file tree">
              {/* Directories first */}
              {dirPaths.map((dirPath) => {
                const isExpanded = expandedDirs.has(dirPath);
                const children = tree.dirs.get(dirPath) ?? [];
                const dirName = dirPath.split("/").pop() ?? dirPath;
                return (
                  <div key={`dir-${dirPath}`}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left text-muted-foreground hover:text-foreground"
                      onClick={() => toggleDir(dirPath)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded
                        ? <DirOpenIcon className="size-3.5 shrink-0 text-synth-cyan" />
                        : <DirIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                      }
                      <span className="text-[11px] font-medium">{dirName}/</span>
                    </Button>
                    {isExpanded && children.map((file) => (
                      <FileRow key={file.path} file={file} selectedPath={selectedPath} onSelect={onSelect} depth={1} />
                    ))}
                  </div>
                );
              })}
              {/* Root files */}
              {tree.rootFiles.map((file) => (
                <FileRow key={file.path} file={file} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
              ))}
              {filteredFiles.length === 0 && (
                <p className="px-2 py-5 text-center text-[11px] text-muted-foreground">No files match that filter.</p>
              )}
            </div>
          )}

          {/* SEARCH TAB */}
          {tab === "search" && (
            <div className="space-y-0.5 pr-2">
              <Input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search files and content..."
                aria-label="Search files"
                className="h-7 text-xs"
              />
              {searching && (
                <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">Searching...</p>
              )}
              {!searching && searchResults.length === 0 && query.trim().length >= 2 && (
                <p className="px-2 py-5 text-center text-[11px] text-muted-foreground">No results found.</p>
              )}
              {searchResults.map((result, i) => (
                <Button
                  key={`${result.path}-${result.line ?? i}`}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start gap-2 px-2 py-2 text-left"
                  onClick={() => onSelect(result.path)}
                >
                  <FileIcon className="size-3.5 shrink-0 text-synth-cyan" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium text-foreground">{result.path}{result.line ? `:${result.line}` : ""}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{result.snippet}</span>
                  </span>
                </Button>
              ))}
            </div>
          )}

          {/* RECENT TAB */}
          {tab === "recent" && (
            <div className="space-y-0.5 pr-2">
              {recentFiles.length === 0 && (
                <p className="px-2 py-5 text-center text-[11px] text-muted-foreground">No recently viewed files.</p>
              )}
              {recentFiles.map((filePath) => (
                <Button
                  key={filePath}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start gap-2 px-2 py-2 text-left"
                  onClick={() => onSelect(filePath)}
                >
                  <ClockIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="min-w-0 truncate text-[11px] text-muted-foreground">{filePath}</span>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
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
  const FileIcon = iconFor(file.extension === "css" ? "fileText" : "fileCode");
  const fileName = file.path.split("/").pop() ?? file.path;

  return (
    <Button
      type="button"
      variant="ghost"
      className={`h-auto w-full justify-start gap-2 px-2 py-1.5 text-left ${depth > 0 ? "ml-3" : ""} ${isSelected ? "border border-synth-cyan/25 bg-synth-cyan/5 text-foreground" : "text-muted-foreground"}`}
      onClick={() => onSelect(file.path)}
      aria-pressed={isSelected}
    >
      <FileIcon className={`size-3.5 shrink-0 ${isSelected ? "text-synth-cyan" : "text-muted-foreground/60"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-[11px]">{fileName}</span>
      {file.size > 0 && (
        <span className="shrink-0 font-mono text-[8px] text-muted-foreground/50">
          {file.size < 1024 ? `${file.size}B` : `${(file.size / 1024).toFixed(1)}K`}
        </span>
      )}
    </Button>
  );
}
