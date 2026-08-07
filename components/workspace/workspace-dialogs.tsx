"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";

export function NotificationsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const BellIcon = iconFor("bell");
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="flex items-center gap-2"><BellIcon className="size-4 text-synth-cyan" /> Notifications</DialogTitle><DialogDescription>Your SYNTH workspace activity appears here.</DialogDescription></DialogHeader><div className="rounded-lg border border-border bg-muted/30 p-3"><div className="flex items-start gap-3"><span className="mt-1 size-2 rounded-full bg-synth-success shadow-[0_0_10px_var(--synth-success)]" /><div className="min-w-0"><p className="text-xs font-medium">Local engine ready</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">SYNTH is using the deterministic local demo provider because Ollama is not connected.</p></div><Badge variant="outline" className="ml-auto text-[9px]">new</Badge></div></div><Button variant="outline" onClick={() => onOpenChange(false)}>Mark all as read</Button></DialogContent></Dialog>;
}
