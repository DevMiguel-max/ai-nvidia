"use client";
import { memo, useState } from "react";
import { RotateCcw, Copy, Check } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ThinkingBlock } from "./ThinkingBlock";
import { formatTimestamp } from "@/utils/formatDate";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isLast: boolean;
  onRegenerate?: () => void;
}

function MessageBubbleBase({ message, isLast, onRegenerate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isEmptyStreaming = isStreaming && !message.content && !message.reasoning;

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-3">
        <div className="flex max-w-[75%] flex-col items-end gap-1.5">
          <div className="rounded-2xl bg-surface-hover px-4 py-2.5 text-sm leading-relaxed text-foreground">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <span className="px-1 font-mono text-[11px] text-muted">{formatTimestamp(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 py-5">
      <span className="mt-0.5 shrink-0 select-none font-mono text-sm text-accent">›</span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        {message.reasoning && (
          <ThinkingBlock text={message.reasoning} isStreaming={isStreaming && !message.content} />
        )}

        <div
          className={`w-full text-sm leading-relaxed text-foreground ${
            message.status === "error" ? "rounded-xl border border-danger/40 bg-danger/5 px-3 py-2" : ""
          }`}
        >
          <MarkdownRenderer content={message.content} isStreaming={isStreaming} />
          {isEmptyStreaming && (
            <span className="inline-flex gap-1 py-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 px-0.5 font-mono text-[11px] text-muted">
          <span>{formatTimestamp(message.createdAt)}</span>
          {!isStreaming && message.content && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1 transition-colors hover:text-foreground" aria-label="Copy response">
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              {isLast && onRegenerate && (
                <button onClick={onRegenerate} className="flex items-center gap-1 transition-colors hover:text-foreground" aria-label="Regenerate response">
                  <RotateCcw size={12} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.reasoning === next.message.reasoning &&
    prev.message.status === next.message.status &&
    prev.isLast === next.isLast
  );
});
