"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SynthBrand } from "@/components/branding/synth-brand";

export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-sm"><DialogHeader><SynthBrand showByline /><DialogTitle className="sr-only">About SYNTH</DialogTitle><DialogDescription className="pt-2">A modular local-first AI workspace for conversations, coding, research, automation, and creative workflows.</DialogDescription></DialogHeader><div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground"><p><span className="font-semibold text-foreground">SYNTH</span> keeps every AI capability behind one provider-neutral engine.</p><p className="mt-2">Built by ANONYMIKETECH · Created by ANONYMIKE</p></div></DialogContent></Dialog>;
}
