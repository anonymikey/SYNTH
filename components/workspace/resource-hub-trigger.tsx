"use client";

import { useCallback, useState } from "react";
import { ResourceHub, type ResourceHubItem } from "@/components/workspace/resource-hub";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor } from "@/lib/icons";

interface ResourceHubTriggerProps {
  variant?: "button" | "icon";
  size?: "default" | "sm";
  label?: string;
  onResourcesUpdate?: (items: ResourceHubItem[]) => void;
  onFilesSelected?: (files: File[]) => void;
  onCodePasted?: (code: string) => void;
}

export function ResourceHubTrigger({
  variant = "button",
  size = "default",
  label = "Add context",
  onResourcesUpdate,
  onFilesSelected,
  onCodePasted,
}: ResourceHubTriggerProps) {
  const [open, setOpen] = useState(false);
  const [resources, setResources] = useState<ResourceHubItem[]>([]);

  const PlusIcon = iconFor("plus");

  const handleResourceSelect = useCallback(
    (item: ResourceHubItem) => {
      setResources((prev) => {
        const next = [item, ...prev.filter((r) => r.id !== item.id)];
        onResourcesUpdate?.(next);
        return next;
      });
    },
    [onResourcesUpdate, onFilesSelected]
  );

  const handleGitHubConnect = useCallback(() => {
    window.dispatchEvent(new CustomEvent("synth:open-import", { detail: "github" }));
  }, []);

  const handleFigmaConnect = useCallback(() => {
    window.dispatchEvent(new CustomEvent("synth:open-import", { detail: "figma" }));
  }, []);

  const handleUploadFiles = useCallback((files: File[]) => {
    const newItems = files.map<ResourceHubItem>((file) => ({
      id: crypto.randomUUID(),
      type: "upload",
      name: file.name,
      source: file.name,
      description: `${(file.size / 1024).toFixed(1)} KB`,
      tags: [file.type || "file"],
    }));
    setResources((prev) => [...newItems, ...prev]);
    onResourcesUpdate?.(newItems);
    onFilesSelected?.(files);
  }, [onResourcesUpdate, onFilesSelected]);

  const handlePasteCode = useCallback((code: string) => {
    const item: ResourceHubItem = {
      id: crypto.randomUUID(),
      type: "paste",
      name: "Pasted Code",
      description: `${code.split("\n").length} lines`,
      tags: ["snippet"],
    };
    setResources((prev) => [item, ...prev]);
    onResourcesUpdate?.([item]);
    onCodePasted?.(code);
  }, [onResourcesUpdate, onCodePasted]);

  const handleMCPConnect = useCallback(() => {
    window.dispatchEvent(new CustomEvent("synth:open-mcp"));
  }, []);

  const handlePluginAdd = useCallback(() => {
    window.dispatchEvent(new CustomEvent("synth:open-plugins"));
  }, []);

  return (
    <>
      {variant === "icon" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <PlusIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size={size === "sm" ? "sm" : "default"}
          onClick={() => setOpen(true)}
          className="gap-1"
        >
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      )}

      <ResourceHub
        open={open}
        onOpenChange={setOpen}
        onResourceSelect={handleResourceSelect}
        onGitHubConnect={handleGitHubConnect}
        onFigmaConnect={handleFigmaConnect}
        onUploadFiles={handleUploadFiles}
        onPasteCode={handlePasteCode}
        onMCPConnect={handleMCPConnect}
        onPluginAdd={handlePluginAdd}
        resources={resources}
      />
    </>
  );
}
