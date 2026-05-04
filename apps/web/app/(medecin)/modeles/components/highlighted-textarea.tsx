"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  className?: string;
  minHeight?: string;
}

// Escape for pre display (no actual HTML insertion — React handles it)
function splitForHighlight(text: string) {
  const parts: { text: string; isVar: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = /\{\{[^}]+\}\}/g;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isVar: false });
    }
    parts.push({ text: match[0], isVar: true });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isVar: false });
  }
  return parts;
}

export function HighlightedTextarea({
  value,
  onChange,
  placeholder,
  dir = "ltr",
  className,
  minHeight = "400px",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const parts = splitForHighlight(value);

  return (
    <div
      className={cn("relative w-full font-mono text-sm", className)}
      style={{ minHeight }}
    >
      {/*
       * Highlight layer — behind the textarea (z-index lower).
       * Uses same padding/font as textarea so text positions match exactly.
       * Text is transparent so only the cyan highlight backgrounds are visible.
       */}
      <pre
        ref={highlightRef}
        aria-hidden
        className="absolute inset-0 z-0 m-0 overflow-hidden whitespace-pre-wrap break-words rounded-md border border-transparent bg-white px-3 py-2 font-mono text-sm leading-6 text-gray-900 pointer-events-none select-none dark:bg-gray-950 dark:text-gray-100"
        style={{ minHeight, direction: dir }}
      >
        {parts.map((part, i) =>
          part.isVar ? (
            <span
              key={i}
              className="bg-cyan-100 text-cyan-700 rounded px-0.5"
            >
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
        {/* Trailing newline to prevent last-line height collapse */}
        {"\n"}
      </pre>

      {/*
       * Actual textarea — on top (z-index higher), transparent background
       * so the highlight layer shows through, transparent text color so the
       * highlight colors are not obscured (caret remains visible via caret-color).
       */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        dir={dir}
        spellCheck={false}
        className={cn(
          "relative z-10 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm leading-6 outline-none resize-none",
          "text-transparent caret-gray-900 dark:caret-gray-100",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
          "placeholder:text-muted-foreground"
        )}
        style={{ minHeight }}
      />
    </div>
  );
}
