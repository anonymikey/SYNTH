"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";

function FeedbackToaster() {
  const { theme } = useTheme();

  return <Toaster theme={theme} position="bottom-center" richColors />;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={250}>
        {children}
        <FeedbackToaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
