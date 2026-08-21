"use client";

import { useEffect, useRef } from "react";
import { isTextInput } from "./shortcut-registry";

interface UseShortcutOptions {
  /** Key to match (lowercase) */
  key: string;
  /** Require Cmd/Ctrl modifier */
  meta?: boolean;
  /** Require Shift modifier */
  shift?: boolean;
  /** Require Alt modifier */
  alt?: boolean;
  /** Handler */
  handler: (event: KeyboardEvent) => void;
  /** Enable/disable the shortcut */
  enabled?: boolean;
  /** Capture the event (prevent default) */
  preventDefault?: boolean;
  /** Whether this shortcut should work even when text input is focused */
  allowInInput?: boolean;
}

/**
 * Register a keyboard shortcut.
 * Automatically handles modifier detection and text-input guards.
 */
export function useShortcut({
  key,
  meta = false,
  shift = false,
  alt = false,
  handler,
  enabled = true,
  preventDefault = true,
  allowInInput = false,
}: UseShortcutOptions) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;

      const isMeta = event.metaKey || event.ctrlKey;
      if (meta && !isMeta) return;
      if (!meta && isMeta) return;
      if (shift && !event.shiftKey) return;
      if (!shift && event.shiftKey) return;
      if (alt && !event.altKey) return;
      if (!alt && event.altKey) return;

      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      // Guard: don't capture single-key shortcuts while typing (unless allowInInput)
      if (!meta && !shift && !alt && !allowInInput && isTextInput(document.activeElement as HTMLElement | null)) {
        return;
      }

      if (preventDefault) event.preventDefault();
      handlerRef.current(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, meta, shift, alt, enabled, preventDefault, allowInInput]);
}

interface ShortcutDef {
  key: string;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (event: KeyboardEvent) => void;
  enabled?: boolean;
  allowInInput?: boolean;
}

/**
 * Register multiple shortcuts in one hook call.
 * More efficient than multiple useShortcut calls.
 */
export function useShortcuts(shortcuts: ShortcutDef[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        const isMeta = event.metaKey || event.ctrlKey;
        if (shortcut.meta && !isMeta) continue;
        if (!shortcut.meta && isMeta) continue;
        if (shortcut.shift && !event.shiftKey) continue;
        if (!shortcut.shift && event.shiftKey) continue;
        if (shortcut.alt && !event.altKey) continue;
        if (!shortcut.alt && event.altKey) continue;

        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

        // Guard: don't capture single-key shortcuts while typing
        if (!shortcut.meta && !shortcut.shift && !shortcut.alt && !shortcut.allowInInput && isTextInput(document.activeElement as HTMLElement | null)) {
          continue;
        }

        event.preventDefault();
        shortcut.handler(event);
        return; // Only fire first match
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
