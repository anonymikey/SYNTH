"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";
import { iconFor } from "@/lib/icons";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const Icon = iconFor(theme === "dark" ? "sun" : "moon");
  return <Button variant="outline" size="icon-sm" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><Icon className="size-4" /></Button>;
}
