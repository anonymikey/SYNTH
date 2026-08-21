"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TextTypeProps {
  text: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
  className?: string;
  loop?: boolean;
}

export function TextType({
  text,
  typingSpeed = 75,
  deletingSpeed = 40,
  pauseDuration = 1500,
  showCursor = true,
  cursorCharacter = "|",
  className,
  loop = true,
}: TextTypeProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const tick = useCallback(() => {
    if (!mountedRef.current) return;

    const fullText = text[currentTextIndex];
    if (!fullText) return;

    if (!isDeleting) {
      // Typing
      if (currentText.length < fullText.length) {
        setCurrentText(fullText.slice(0, currentText.length + 1));
        timeoutRef.current = setTimeout(tick, typingSpeed);
      } else {
        // Finished typing — pause, then start deleting (if looping)
        if (loop || currentTextIndex < text.length - 1) {
          timeoutRef.current = setTimeout(() => {
            if (mountedRef.current) setIsDeleting(true);
          }, pauseDuration);
        }
      }
    } else {
      // Deleting
      if (currentText.length > 0) {
        setCurrentText(fullText.slice(0, currentText.length - 1));
        timeoutRef.current = setTimeout(tick, deletingSpeed);
      } else {
        // Finished deleting — move to next phrase
        setIsDeleting(false);
        setCurrentTextIndex((prev) => (prev + 1) % text.length);
        timeoutRef.current = setTimeout(tick, typingSpeed);
      }
    }
  }, [currentText, currentTextIndex, isDeleting, text, typingSpeed, deletingSpeed, pauseDuration, loop]);

  useEffect(() => {
    timeoutRef.current = setTimeout(tick, typingSpeed);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [tick, typingSpeed]);

  return (
    <span className={cn("inline", className)}>
      <span>{currentText}</span>
      {showCursor && (
        <span className="text-synth-cyan animate-pulse ml-px">{cursorCharacter}</span>
      )}
    </span>
  );
}
