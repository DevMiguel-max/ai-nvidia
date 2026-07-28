"use client";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  value: string;
  isStreaming: boolean;
}

// While a message is still streaming, re-highlighting a growing syntax tree
// on every token is wasted work and can visibly jank on long code blocks.
// We render plain monospace text during streaming and swap to full
// highlighting once the message is done — the expensive path only runs once.
export function CodeBlock({ language, value, isStreaming }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between bg-surface px-3 py-1.5 text-xs text-muted">
        <span className="font-mono">{language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 transition-colors hover:text-foreground">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {isStreaming ? (
        <pre className="overflow-x-auto bg-canvas p-3 font-mono text-xs leading-relaxed text-foreground">
          <code>{value}</code>
        </pre>
      ) : (
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            background: "var(--color-canvas)",
            fontSize: "0.8rem",
            padding: "0.75rem",
          }}
          codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
        >
          {value}
        </SyntaxHighlighter>
      )}
    </div>
  );
}
