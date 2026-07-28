"use client";
import { useRouter } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import { ConversationItem } from "./ConversationItem";
import type { Conversation } from "@/types/chat";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function Sidebar({ conversations, activeId, onSelect, onCreate, onRename, onDelete }: SidebarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-dvh w-72 shrink-0 flex-col border-r border-border bg-surface/60 p-3">
      <button
        onClick={onCreate}
        className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
      >
        <Plus size={16} />
        New Chat
      </button>

      <div className="flex-1 space-y-0.5 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted">No conversations yet.</p>
        )}
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeId}
            onSelect={() => onSelect(conversation.id)}
            onRename={(title) => onRename(conversation.id, title)}
            onDelete={() => onDelete(conversation.id)}
          />
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-danger"
      >
        <LogOut size={16} />
        Log out
      </button>
    </aside>
  );
}
