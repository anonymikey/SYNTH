"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MarkdownRendererProps {
  content: string;
  /** Variant for different contexts: 'assistant' uses theme colors, 'forge' uses its own */
  variant?: "assistant" | "forge" | "neutral";
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Inline Markdown Parser                                             */
/* ------------------------------------------------------------------ */

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; children: InlineToken[] }
  | { type: "italic"; children: InlineToken[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: InlineToken[] };

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Inline code (highest priority — skip contents)
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ type: "code", value: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Links: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push({
        type: "link",
        href: linkMatch[2],
        children: parseInline(linkMatch[1]),
      });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      tokens.push({ type: "bold", children: parseInline(boldMatch[1]) });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*(.+?)\*|_(.+?)_)/);
    if (italicMatch) {
      const inner = italicMatch[2] ?? italicMatch[3];
      tokens.push({ type: "italic", children: parseInline(inner) });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Plain text — consume until the next special character
    const nextSpecial = remaining.search(/[`*\[_]/);
    if (nextSpecial === -1) {
      tokens.push({ type: "text", value: remaining });
      remaining = "";
    } else if (nextSpecial === 0) {
      // Bare special char that didn't match any pattern — emit as text
      tokens.push({ type: "text", value: remaining[0] });
      remaining = remaining.slice(1);
    } else {
      tokens.push({ type: "text", value: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens;
}

/* ------------------------------------------------------------------ */
/*  Block-level types                                                  */
/* ------------------------------------------------------------------ */

type BlockToken =
  | { type: "heading"; level: 1 | 2 | 3; children: InlineToken[] }
  | { type: "paragraph"; children: InlineToken[] }
  | { type: "bullet-list"; items: InlineToken[][] }
  | { type: "ordered-list"; items: InlineToken[][] }
  | { type: "code-block"; lang: string; code: string }
  | { type: "blockquote"; children: InlineToken[] }
  | { type: "hr" }
  | { type: "table"; headers: string[]; rows: string[][] };

/* ------------------------------------------------------------------ */
/*  Block-level Parser                                                 */
/* ------------------------------------------------------------------ */

function parseBlocks(markdown: string): BlockToken[] {
  const lines = markdown.split("\n");
  const blocks: BlockToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule: ---, ***, ___
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Fenced code block
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "code-block",
        lang,
        code: codeLines.join("\n").trimEnd(),
      });
      i++; // skip closing ```
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({
        type: "heading",
        level,
        children: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        children: parseInline(quoteLines.join("\n")),
      });
      continue;
    }

    // Unordered list (- or * at start)
    if (/^[\-\*]\s+/.test(line)) {
      const items: InlineToken[][] = [];
      while (i < lines.length && /^[\-\*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\-\*]\s+/, "");
        items.push(parseInline(itemText));
        i++;
      }
      blocks.push({ type: "bullet-list", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: InlineToken[][] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, "");
        items.push(parseInline(itemText));
        i++;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    // Table (starts with |)
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (row: string) =>
          row
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim());
        const headers = parseRow(tableLines[0]);
        // Skip separator row (|---|---|)
        const dataRows = tableLines.slice(2).map(parseRow);
        blocks.push({ type: "table", headers, rows: dataRows });
      }
      continue;
    }

    // Paragraph — collect consecutive non-empty lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,3}\s/) &&
      !lines[i].match(/^```/) &&
      !lines[i].startsWith(">") &&
      !lines[i].match(/^[\-\*]\s+/) &&
      !lines[i].match(/^\d+\.\s+/) &&
      !lines[i].trim().startsWith("|") &&
      !/^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: "paragraph",
        children: parseInline(paraLines.join("\n")),
      });
    }
  }

  return blocks;
}

/* ------------------------------------------------------------------ */
/*  Inline Renderer                                                    */
/* ------------------------------------------------------------------ */

function InlineRenderer({
  tokens,
  variant,
}: {
  tokens: InlineToken[];
  variant: "assistant" | "forge" | "neutral";
}) {
  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case "text":
            return <span key={i}>{token.value}</span>;
          case "bold":
            return (
              <strong
                key={i}
                className={cn(
                  "font-semibold",
                  variant === "forge" ? "text-white/85" : "text-foreground"
                )}
              >
                <InlineRenderer tokens={token.children} variant={variant} />
              </strong>
            );
          case "italic":
            return (
              <em key={i} className="italic opacity-90">
                <InlineRenderer tokens={token.children} variant={variant} />
              </em>
            );
          case "code":
            return (
              <code
                key={i}
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[0.85em]",
                  variant === "forge"
                    ? "bg-white/[0.06] text-[#2dd4bf]/80"
                    : "bg-muted text-foreground/80"
                )}
              >
                {token.value}
              </code>
            );
          case "link":
            return (
              <a
                key={i}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "underline underline-offset-2 transition-colors",
                  variant === "forge"
                    ? "text-[#2dd4bf]/70 hover:text-[#2dd4bf]"
                    : "text-primary hover:text-primary/80"
                )}
              >
                <InlineRenderer tokens={token.children} variant={variant} />
              </a>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Block Renderer                                                     */
/* ------------------------------------------------------------------ */

function BlockRenderer({
  blocks,
  variant,
}: {
  blocks: BlockToken[];
  variant: "assistant" | "forge" | "neutral";
}) {
  const headingClasses = {
    1: cn(
      "text-xl font-bold tracking-tight mt-6 mb-3 first:mt-0",
      variant === "forge" ? "text-white/90" : "text-foreground"
    ),
    2: cn(
      "text-lg font-semibold tracking-tight mt-5 mb-2 first:mt-0",
      variant === "forge" ? "text-white/85" : "text-foreground"
    ),
    3: cn(
      "text-base font-semibold mt-4 mb-2 first:mt-0",
      variant === "forge" ? "text-white/80" : "text-foreground"
    ),
  };

  const bodyText = variant === "forge" ? "text-white/65" : "text-foreground/85";
  const mutedText = variant === "forge" ? "text-white/40" : "text-muted-foreground";

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <div key={i} className={headingClasses[block.level]}>
                <InlineRenderer tokens={block.children} variant={variant} />
              </div>
            );

          case "paragraph":
            return (
              <p
                key={i}
                className={cn("leading-7 mb-3 last:mb-0", bodyText)}
              >
                <InlineRenderer tokens={block.children} variant={variant} />
              </p>
            );

          case "bullet-list":
            return (
              <ul
                key={i}
                className={cn(
                  "my-2 space-y-1.5 pl-5",
                  variant === "forge" ? "list-disc" : "list-disc"
                )}
              >
                {block.items.map((item, j) => (
                  <li key={j} className={cn("leading-6", bodyText)}>
                    <InlineRenderer tokens={item} variant={variant} />
                  </li>
                ))}
              </ul>
            );

          case "ordered-list":
            return (
              <ol
                key={i}
                className="my-2 space-y-1.5 pl-5 list-decimal"
              >
                {block.items.map((item, j) => (
                  <li key={j} className={cn("leading-6", bodyText)}>
                    <InlineRenderer tokens={item} variant={variant} />
                  </li>
                ))}
              </ol>
            );

          case "code-block":
            return (
              <CodeBlock
                key={i}
                code={block.code}
                lang={block.lang}
                variant={variant}
              />
            );

          case "blockquote":
            return (
              <blockquote
                key={i}
                className={cn(
                  "my-3 border-l-2 pl-4 italic",
                  variant === "forge"
                    ? "border-[#9670ff]/30 text-white/50"
                    : "border-primary/30 text-muted-foreground"
                )}
              >
                <InlineRenderer tokens={block.children} variant={variant} />
              </blockquote>
            );

          case "hr":
            return (
              <hr
                key={i}
                className={cn(
                  "my-6 border-t",
                  variant === "forge"
                    ? "border-white/[0.06]"
                    : "border-border"
                )}
              />
            );

          case "table":
            return (
              <div
                key={i}
                className={cn(
                  "my-3 overflow-x-auto rounded-lg border",
                  variant === "forge"
                    ? "border-white/[0.06]"
                    : "border-border"
                )}
              >
                <table className="w-full text-xs">
                  <thead>
                    <tr
                      className={cn(
                        "border-b",
                        variant === "forge"
                          ? "border-white/[0.06] bg-white/[0.02]"
                          : "border-border bg-muted/30"
                      )}
                    >
                      {block.headers.map((header, j) => (
                        <th
                          key={j}
                          className={cn(
                            "px-3 py-2 text-left font-semibold",
                            variant === "forge"
                              ? "text-white/70"
                              : "text-foreground"
                          )}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr
                        key={j}
                        className={cn(
                          "border-b last:border-0",
                          variant === "forge"
                            ? "border-white/[0.04]"
                            : "border-border/50"
                        )}
                      >
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            className={cn("px-3 py-2", bodyText)}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          default:
            return null;
        }
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Code Block with Copy Button                                        */
/* ------------------------------------------------------------------ */

function CodeBlock({
  code,
  lang,
  variant,
}: {
  code: string;
  lang: string;
  variant: "assistant" | "forge" | "neutral";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const mutedText = variant === "forge" ? "text-white/40" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "my-3 overflow-hidden rounded-xl border",
        variant === "forge"
          ? "border-white/[0.06] bg-[#080a0f]"
          : "border-border bg-muted/30"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-3 py-1.5",
          variant === "forge"
            ? "border-white/[0.06] bg-white/[0.02]"
            : "border-border/60 bg-muted/20"
        )}
      >
        <span
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.12em]",
            mutedText
          )}
        >
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] transition-colors",
            copied
              ? "text-synth-success"
              : variant === "forge"
                ? "text-white/30 hover:text-white/60"
                : "text-muted-foreground/60 hover:text-foreground"
          )}
        >
          {copied ? (
            <>
              <Check className="size-2.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-2.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3">
        <code
          className={cn(
            "font-mono text-xs leading-5",
            variant === "forge" ? "text-white/60" : "text-foreground/80"
          )}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Export                                                         */
/* ------------------------------------------------------------------ */

export function MarkdownRenderer({
  content,
  variant = "assistant",
  className,
}: MarkdownRendererProps) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className={cn("text-sm", className)}>
      <BlockRenderer blocks={blocks} variant={variant} />
    </div>
  );
}
