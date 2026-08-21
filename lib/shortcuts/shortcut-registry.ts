"use client";

/**
 * SYNTH Keyboard Shortcut Registry
 *
 * Centralized definition of all keyboard shortcuts.
 * Components register handlers via the useShortcut or useShortcuts hooks.
 */

export type ShortcutKey =
  | "k"
  | "n"
  | "b"
  | "/"
  | "m"
  | "a"
  | "c"
  | "f"
  | "p"
  | "o"
  | "l"
  | "escape"
  | "arrowup"
  | "arrowdown"
  | "home"
  | "enter";

export interface ShortcutDefinition {
  id: string;
  label: string;
  description: string;
  keys: string; // Display string like "⌘K"
  group: "Global" | "Chat" | "Code" | "Model" | "Navigation";
  /** If true, the shortcut should work even when a text input is focused */
  allowInInput?: boolean;
}

/**
 * Master list of all SYNTH shortcuts.
 * Used by the Command Palette and shortcut help.
 */
export const SYNTH_SHORTCUTS: ShortcutDefinition[] = [
  // ── Global ──────────────────────────────────────────────
  { id: "command-palette", label: "Command Palette", description: "Open command palette", keys: "⌘K", group: "Global" },
  { id: "new-chat", label: "New Conversation", description: "Start a new conversation", keys: "⌘N", group: "Global" },
  { id: "toggle-sidebar", label: "Toggle Sidebar", description: "Show or hide sidebar", keys: "⌘B", group: "Global" },
  { id: "toggle-context", label: "Toggle Context Panel", description: "Show or hide context panel", keys: "⌘⇧B", group: "Global" },
  { id: "escape", label: "Close", description: "Close overlays and dismiss", keys: "Esc", group: "Global", allowInInput: true },

  // ── Chat ────────────────────────────────────────────────
  { id: "focus-composer", label: "Focus Composer", description: "Focus the chat input", keys: "⌘/", group: "Chat" },
  { id: "send-message", label: "Send Message", description: "Send current message (or Enter)", keys: "⌘↵", group: "Chat", allowInInput: true },
  { id: "regenerate", label: "Regenerate", description: "Regenerate last response", keys: "R", group: "Chat" },
  { id: "copy-response", label: "Copy Response", description: "Copy assistant response", keys: "C", group: "Chat" },

  // ── Navigation ──────────────────────────────────────────
  { id: "previous-conversation", label: "Previous Chat", description: "Navigate to previous conversation", keys: "⌘↑", group: "Navigation" },
  { id: "next-conversation", label: "Next Chat", description: "Navigate to next conversation", keys: "⌘↓", group: "Navigation" },

  // ── Code ────────────────────────────────────────────────
  { id: "quick-file-search", label: "Quick File Search", description: "Search files in project", keys: "⌘P", group: "Code" },
  { id: "search-file", label: "Search in File", description: "Search current file", keys: "⌘F", group: "Code" },
  { id: "repository-search", label: "Repository Search", description: "Search across repository", keys: "⌘⇧F", group: "Code" },
  { id: "symbol-navigation", label: "Symbol Navigation", description: "Navigate symbols", keys: "⌘⇧O", group: "Code" },

  // ── Model ───────────────────────────────────────────────
  { id: "model-selector", label: "Model Selector", description: "Open model selector", keys: "⌘⇧M", group: "Model" },
  { id: "agent-selector", label: "Agent Selector", description: "Open agent/mode selector", keys: "⌘⇧A", group: "Model" },

  // ── Theme ───────────────────────────────────────────────
  { id: "toggle-theme", label: "Toggle Theme", description: "Switch dark/light theme", keys: "⌘⇧L", group: "Global" },
];

/**
 * Check if an element is a text input (should not capture single-key shortcuts)
 */
export function isTextInput(element: HTMLElement | null): boolean {
  if (!element) return false;
  const tag = element.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    element.isContentEditable ||
    element.getAttribute("role") === "textbox"
  );
}

/**
 * Check if any overlay is open that should capture Escape
 */
export function isOverlayOpen(): boolean {
  return (
    !!document.querySelector("[data-state='open'][role='dialog']") ||
    !!document.querySelector("[data-state='open'][role='menu']") ||
    !!document.querySelector("[data-state='open'][role='listbox']")
  );
}

/**
 * Get shortcuts grouped by category for display
 */
export function getShortcutsByGroup(): Record<string, ShortcutDefinition[]> {
  const groups: Record<string, ShortcutDefinition[]> = {};
  for (const shortcut of SYNTH_SHORTCUTS) {
    if (!groups[shortcut.group]) groups[shortcut.group] = [];
    groups[shortcut.group].push(shortcut);
  }
  return groups;
}

/**
 * Look up a shortcut by ID
 */
export function findShortcut(id: string): ShortcutDefinition | undefined {
  return SYNTH_SHORTCUTS.find((s) => s.id === id);
}
