"use client";

import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";

export interface ResourceHubItem {
  id: string;
  type: "github" | "upload" | "figma" | "mcp" | "plugin" | "paste";
  name: string;
  source?: string;
  description?: string;
  tags?: string[];
  icon?: string;
}

interface ResourceHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResourceSelect?: (item: ResourceHubItem) => void;
  onGitHubConnect?: () => void;
  onFigmaConnect?: () => void;
  onUploadFiles?: (files: File[]) => void;
  onPasteCode?: (code: string) => void;
  onMCPConnect?: () => void;
  onPluginAdd?: () => void;
  resources?: ResourceHubItem[];
}

export function ResourceHub({
  open,
  onOpenChange,
  onResourceSelect,
  onGitHubConnect,
  onFigmaConnect,
  onUploadFiles,
  onPasteCode,
  onMCPConnect,
  onPluginAdd,
  resources = [],
}: ResourceHubProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pastedCode, setPastedCode] = useState("");
  const [pasteName, setPasteName] = useState("snippet");
  const [pasteLanguage, setPasteLanguage] = useState("tsx");
  const [activeTab, setActiveTab] = useState("import");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const GithubIcon = iconFor("github");
  const FigmaIcon = iconFor("figma");
  const UploadIcon = iconFor("upload");
  const CodeIcon = iconFor("code-2");
  const MCPIcon = iconFor("cpu");
  const PluginIcon = iconFor("package");

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.currentTarget.files || []);
      if (files.length) {
        setStagedFiles(files);
        toast.success(`${files.length} file${files.length === 1 ? "" : "s"} ready to import`);
      }
    },
    [onUploadFiles, onOpenChange]
  );

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) setStagedFiles(files);
  }, []);

  const importStagedFiles = useCallback(() => {
    if (!stagedFiles.length) return;
    onUploadFiles?.(stagedFiles);
    toast.success(`${stagedFiles.length} file${stagedFiles.length === 1 ? "" : "s"} added to context`);
    setStagedFiles([]);
    onOpenChange(false);
  }, [stagedFiles, onUploadFiles, onOpenChange]);

  const handlePasteCode = useCallback(() => {
    if (!pastedCode.trim()) {
      toast.error("Code cannot be empty");
      return;
    }
    onPasteCode?.(pastedCode);
    toast.success("Code pasted to context");
    setPastedCode("");
    setPasteName("snippet");
    setPasteLanguage("tsx");
    setPasteDialogOpen(false);
    onOpenChange(false);
  }, [pastedCode, onPasteCode, onOpenChange, pasteName, pasteLanguage]);

  const handleGitHub = useCallback(() => {
    onGitHubConnect?.();
    onOpenChange(false);
  }, [onGitHubConnect, onOpenChange]);

  const handleFigma = useCallback(() => {
    onFigmaConnect?.();
    onOpenChange(false);
  }, [onFigmaConnect, onOpenChange]);

  const handleMCP = useCallback(() => {
    onMCPConnect?.();
    onOpenChange(false);
  }, [onMCPConnect, onOpenChange]);

  const handlePlugin = useCallback(() => {
    onPluginAdd?.();
    onOpenChange(false);
  }, [onPluginAdd, onOpenChange]);

  return (
    <>
      {/* Main resource dialog */}
      <Dialog open={open && !pasteDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:rounded-xl">
          <DialogHeader>
              <DialogTitle>Add context</DialogTitle>
              <DialogDescription>
                Bring in only the files, designs, and tools SYNTH needs for this task.
              </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="connect">Connect</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            {/* Import Tab */}
            <TabsContent value="import" className="space-y-4">
              <div
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-xl border border-dashed p-4 text-center transition-colors ${isDragging ? "border-synth-cyan bg-synth-cyan/10" : "border-border/60 bg-muted/20"}`}
              >
                <UploadIcon className="mx-auto mb-2 size-5 text-synth-cyan" />
                <p className="text-sm text-foreground">Drop files here or choose Upload</p>
                <p className="mt-1 text-xs text-muted-foreground">Code, docs, JSON, styles, and project assets</p>
              </div>
              {stagedFiles.length > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-synth-cyan/30 bg-synth-cyan/5 p-3">
                  <span className="text-xs text-foreground">{stagedFiles.length} file{stagedFiles.length === 1 ? "" : "s"} selected</span>
                  <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setStagedFiles([])}>Cancel</Button><Button size="sm" onClick={importStagedFiles}>Add to context</Button></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {/* GitHub */}
                <button
                  type="button"
                  onClick={handleGitHub}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border/50 bg-card/40 p-3 transition-all hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-foreground/10">
                      <GithubIcon className="size-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">GitHub</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Connect a repository for project context</p>
                </button>

                {/* Figma */}
                <button
                  type="button"
                  onClick={handleFigma}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border/50 bg-card/40 p-3 transition-all hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[#a259ff]/10">
                      <FigmaIcon className="size-4 text-[#a259ff]" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Figma</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Bring in a design file or URL</p>
                </button>

                {/* Upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border/50 bg-card/40 p-3 transition-all hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-synth-cyan/10">
                      <UploadIcon className="size-4 text-synth-cyan" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Upload</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Upload from computer</p>
                </button>

                {/* Paste Code */}
                <button
                  type="button"
                  onClick={() => setPasteDialogOpen(true)}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border/50 bg-card/40 p-3 transition-all hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-synth-cyan/10">
                      <CodeIcon className="size-4 text-synth-cyan" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Paste Code</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Paste code directly</p>
                </button>
              </div>
            </TabsContent>

            {/* Connect Tab */}
            <TabsContent value="connect" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* MCP */}
                <button
                  type="button"
                  onClick={handleMCP}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border/50 bg-card/40 p-3 transition-all hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                      <MCPIcon className="size-4 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium text-foreground">MCP</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Connect an approved context server</p>
                </button>

                {/* Plugin */}
                <button
                  type="button"
                  onClick={handlePlugin}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border/50 bg-card/40 p-3 transition-all hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10">
                      <PluginIcon className="size-4 text-purple-500" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Plugin</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Add a workspace capability</p>
                </button>
              </div>
            </TabsContent>

            {/* Recent Tab */}
            <TabsContent value="recent" className="space-y-2">
              {resources.length === 0 ? (
                <div className="rounded-lg border border-border/30 bg-muted/20 p-8 text-center">
                  <p className="text-sm text-muted-foreground">No recent resources yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {resources.map((resource) => (
                    <button
                      key={resource.id}
                      type="button"
                      onClick={() => {
                        onResourceSelect?.(resource);
                        onOpenChange(false);
                      }}
                      className="w-full rounded-lg border border-border/50 bg-card/40 p-3 text-left transition-all hover:border-border hover:bg-card/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{resource.name}</p>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{resource.description}</p>
                          )}
                          {resource.tags && resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {resource.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{resource.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Paste Code Dialog */}
      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste Code</DialogTitle>
            <DialogDescription>
              Paste code that you want to add as context to your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={pasteName} onChange={(event) => setPasteName(event.target.value)} placeholder="Snippet name" className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground" />
              <select value={pasteLanguage} onChange={(event) => setPasteLanguage(event.target.value)} className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"><option value="tsx">TSX</option><option value="ts">TypeScript</option><option value="js">JavaScript</option><option value="css">CSS</option><option value="json">JSON</option><option value="md">Markdown</option></select>
            </div>
            <textarea
              value={pastedCode}
              onChange={(e) => setPastedCode(e.target.value)}
              placeholder="Paste your code here..."
              className="min-h-[200px] w-full rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-synth-cyan"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPasteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handlePasteCode}
                disabled={!pastedCode.trim()}
                className="bg-synth-cyan text-[#080a12] hover:bg-synth-cyan/90"
              >
                Add Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".ts,.tsx,.js,.jsx,.json,.css,.html,.md,.py,.java,.go,.rs,.cpp"
      />
    </>
  );
}
