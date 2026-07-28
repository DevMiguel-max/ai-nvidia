"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Brain } from "lucide-react";

interface ThinkingBlockProps {
  text: string;
  isStreaming: boolean;
}

export function ThinkingBlock({ text, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(isStreaming);

  // Auto-collapse the moment reasoning finishes and the real answer starts —
  // the signature "thinking resolves into an answer" beat. Users can still
  // toggle it back open freely afterward; this only fires on that one transition.
  useEffect(() => {
    if (!isStreaming) setExpanded(false);
  }, [isStreaming]);

  if (!text) return null;

  return (
    <div className="w-full rounded-xl border border-border bg-canvas/60">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted transition-colors hover:text-foreground"
      >
        <Brain size={13} className={isStreaming ? "animate-pulse text-accent" : ""} />
        <span className="font-mono">{isStreaming ? "thinking…" : "thought process"}</span>
        <ChevronDown size={13} className={`ml-auto transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-border px-3 py-2 font-mono text-xs leading-relaxed text-muted">
          {text}
        </div>
      )}
    </div>
  );
}
