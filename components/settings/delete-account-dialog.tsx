"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  async function deleteAccount() {
    if (confirmation !== "DELETE") return;
    setPending(true);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Account deletion failed.");
      await createClient().auth.signOut();
      window.location.assign("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not delete your account.");
      setPending(false);
    }
  }

  function closeDialog(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) setConfirmation("");
  }

  return (
    <>
      <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setOpen(true)}>
        <Trash2 data-icon="inline-start" /> Delete account
      </Button>
      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md border-destructive/25 bg-card">
          <DialogHeader>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle aria-hidden="true" /></div>
            <DialogTitle className="text-xl">Delete your SYNTH account?</DialogTitle>
            <DialogDescription className="leading-6">This permanently deletes your profile, settings, projects, conversations, and usage history. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label htmlFor="delete-account-confirmation" className="text-sm font-medium">Type <span className="font-mono text-destructive">DELETE</span> to confirm</label>
            <Input id="delete-account-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} placeholder="DELETE" aria-describedby="delete-account-help" className="font-mono uppercase tracking-[0.18em]" />
            <p id="delete-account-help" className="text-xs leading-5 text-muted-foreground">You will be signed out immediately after the account is removed.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog(false)} disabled={pending}>Keep account</Button>
            <Button variant="destructive" onClick={deleteAccount} disabled={confirmation !== "DELETE" || pending}>{pending && <Loader2 data-icon="inline-start" className="animate-spin" />} {pending ? "Deleting…" : "Delete permanently"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
