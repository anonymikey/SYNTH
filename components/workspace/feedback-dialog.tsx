"use client";

import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FeedbackCategory = "bug" | "feature" | "improvement" | "question" | "other";

interface FeedbackFormData {
  category: FeedbackCategory;
  message: string;
  email: string;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  improvement: "Improvement Suggestion",
  question: "Question",
  other: "Other",
};

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [formData, setFormData] = useState<FeedbackFormData>({
    category: "improvement",
    message: "",
    email: "",
  });

  async function submitFeedback() {
    if (!formData.message.trim()) {
      toast.error("Please enter your feedback message.");
      return;
    }

    setPending(true);
    try {
      // Simulate API call - in production, this would POST to /api/feedback
      await new Promise((resolve) => setTimeout(resolve, 800));

      console.log("Feedback submitted:", {
        category: formData.category,
        message: formData.message,
        email: formData.email || undefined,
        timestamp: new Date().toISOString(),
      });

      toast.success("Thank you! Your feedback has been recorded.");
      setOpen(false);
      setFormData({ category: "improvement", message: "", email: "" });
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function closeDialog(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setFormData({ category: "improvement", message: "", email: "" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="size-4" />
          Send Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-synth-cyan/10 text-synth-cyan">
            <MessageSquare aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl">Send Feedback</DialogTitle>
          <DialogDescription className="leading-6">
            Help us improve SYNTH. Your feedback goes directly to the development team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <label htmlFor="feedback-category" className="text-sm font-medium">
              Category
            </label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value as FeedbackCategory })
              }
            >
              <SelectTrigger id="feedback-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label htmlFor="feedback-message" className="text-sm font-medium">
              Message <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="feedback-message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Tell us what you think, what&apos;s broken, or what you&apos;d like to see..."
              rows={4}
              className="resize-none"
              aria-describedby="feedback-message-help"
            />
            <p id="feedback-message-help" className="text-xs text-muted-foreground">
              Be as specific as possible. Include steps to reproduce if reporting a bug.
            </p>
          </div>

          {/* Email (optional) */}
          <div className="space-y-2">
            <label htmlFor="feedback-email" className="text-sm font-medium">
              Email <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="feedback-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
            />
            <p className="text-xs text-muted-foreground">
              Only if you&apos;d like us to follow up with you.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => closeDialog(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={submitFeedback}
            disabled={!formData.message.trim() || pending}
            className="gap-2"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Sending..." : "Send Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
