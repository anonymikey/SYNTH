"use client";

import { useCallback, useRef } from "react";
import { useShortcuts } from "./use-shortcut";

interface SynthShortcutActions {
  /** Open/close the command palette */
  toggleCommandPalette: () => void;
  /** Create a new conversation */
  newChat: () => void;
  /** Toggle the sidebar */
  toggleSidebar: () => void;
  /** Toggle the context panel */
  toggleContext: () => void;
  /** Focus the chat composer */
  focusComposer: () => void;
  /** Navigate to previous conversation */
  prevConversation: () => void;
  /** Navigate to next conversation */
  nextConversation: () => void;
  /** Close all overlays */
  closeOverlays: () => void;
  /** Toggle dark/light theme */
  toggleTheme?: () => void;
  /** Focus quick file search (Code module) */
  quickFileSearch?: () => void;
  /** Open model selector */
  openModelSelector?: () => void;
}

/**
 * Register all centralized SYNTH workspace shortcuts.
 * Call this once from WorkspaceShellInner.
 */
export function useSynthShortcuts(actions: SynthShortcutActions) {
  // Store latest actions in ref so handlers are always fresh
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const closeOverlays = useCallback(() => {
    actionsRef.current.closeOverlays();
  }, []);

  useShortcuts([
    // Command Palette: Cmd+K
    {
      key: "k",
      meta: true,
      handler: () => actionsRef.current.toggleCommandPalette(),
    },
    // New Chat: Cmd+N
    {
      key: "n",
      meta: true,
      handler: () => actionsRef.current.newChat(),
    },
    // Toggle Sidebar: Cmd+B
    {
      key: "b",
      meta: true,
      handler: () => actionsRef.current.toggleSidebar(),
    },
    // Toggle Context: Cmd+Shift+B
    {
      key: "b",
      meta: true,
      shift: true,
      handler: () => actionsRef.current.toggleContext(),
    },
    // Focus Composer: Cmd+/
    {
      key: "/",
      meta: true,
      handler: () => actionsRef.current.focusComposer(),
    },
    // Model Selector: Cmd+Shift+M
    {
      key: "m",
      meta: true,
      shift: true,
      handler: () => actionsRef.current.openModelSelector?.(),
    },
    // Escape: close overlays
    {
      key: "Escape",
      handler: () => closeOverlays(),
      allowInInput: true,
    },
    // Previous Conversation: Cmd+ArrowUp
    {
      key: "ArrowUp",
      meta: true,
      handler: () => actionsRef.current.prevConversation(),
    },
    // Next Conversation: Cmd+ArrowDown
    {
      key: "ArrowDown",
      meta: true,
      handler: () => actionsRef.current.nextConversation(),
    },
    // Toggle Theme: Cmd+Shift+L
    {
      key: "l",
      meta: true,
      shift: true,
      handler: () => actionsRef.current.toggleTheme?.(),
    },
  ]);
}
