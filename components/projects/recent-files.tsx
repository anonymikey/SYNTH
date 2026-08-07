import { Button } from "@/components/ui/button";
import type { RecentFile } from "@/types/workspace";

export function RecentFiles({ files, onSelect }: { files: RecentFile[]; onSelect?: (file: RecentFile) => void }) {
  return <div className="space-y-1">{files.map((file) => <Button key={file.path} variant="ghost" className="h-auto w-full justify-start px-2 py-1.5 text-left text-xs" onClick={() => onSelect?.(file)}><span className="truncate">{file.path}</span></Button>)}</div>;
}
