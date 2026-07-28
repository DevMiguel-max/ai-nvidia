"use client";
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";
import { sanitizeUserInput } from "@/utils/sanitize";

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resizeTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    resizeTextarea(e.target);
  }

  function handleSend() {
    const clean = sanitizeUserInput(value);
    if (!clean || isStreaming) return;
    onSend(clean);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-border bg-canvas px-4 py-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-surface p-2 transition-colors focus-within:border-accent/60">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Send a message…"
          className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-danger transition-colors hover:border-danger/50"
            aria-label="Stop generating"
          >
            <Square size={15} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <ArrowUp size={16} />
          </button>
        )}
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center font-mono text-[11px] text-muted">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}
