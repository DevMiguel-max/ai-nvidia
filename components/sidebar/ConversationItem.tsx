"use client";
import { useState } from "react";
import { MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import type { Conversation } from "@/types/chat";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function ConversationItem({ conversation, isActive, onSelect, onRename, onDelete }: ConversationItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function commitRename() {
    onRename(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 border-l-2 border-transparent px-2 py-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full rounded-md border border-accent/60 bg-canvas px-2 py-1 text-sm text-foreground outline-none"
        />
        <button onClick={commitRename} className="text-muted hover:text-foreground" aria-label="Save name">
          <Check size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="text-muted hover:text-foreground" aria-label="Cancel">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 border-l-2 py-2 pl-[calc(0.5rem-2px)] pr-2 text-sm transition-colors ${
        isActive
          ? "border-accent bg-surface-hover text-foreground"
          : "border-transparent text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      <button onClick={onSelect} className="flex flex-1 items-center gap-2 overflow-hidden text-left">
        <MessageSquare size={15} className="shrink-0" />
        <span className="truncate">{conversation.title}</span>
      </button>

      {confirmingDelete ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => {
              onDelete();
              setConfirmingDelete(false);
            }}
            className="text-danger hover:opacity-80"
            aria-label="Confirm delete"
          >
            <Check size={14} />
          </button>
          <button onClick={() => setConfirmingDelete(false)} className="text-muted hover:text-foreground" aria-label="Cancel delete">
            <X size={14} />
          </button>
        </div>
      ) : (
        // Visible by default (mobile has no hover state) — only becomes
        // hover-revealed from md: up, where hover is reliable.
        <div className="flex shrink-0 items-center gap-1 md:hidden md:group-hover:flex">
          <button
            onClick={() => {
              setDraft(conversation.title);
              setEditing(true);
            }}
            className="text-muted hover:text-foreground"
            aria-label="Rename conversation"
          >
            <Pencil size={14} />
          </button>
          <button onClick={() => setConfirmingDelete(true)} className="text-muted hover:text-danger" aria-label="Delete conversation">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
