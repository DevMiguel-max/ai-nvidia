"use client";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { useConversations } from "@/hooks/useConversations";
import { useChat } from "@/hooks/useChat";

export function ChatWindow() {
  const {
    conversations,
    activeConversation,
    activeId,
    hydrated,
    setActiveId,
    createConversation,
    deleteConversation,
    renameConversation,
    updateMessages,
  } = useConversations();

  const { sendMessage, regenerate, stop, isStreaming } = useChat({ updateMessages });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // First-run convenience: land straight in a fresh conversation instead of
  // an empty sidebar with nothing selected.
  useEffect(() => {
    if (hydrated && conversations.length === 0) {
      createConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const currentId = activeConversation?.id ?? null;
  const messages = activeConversation?.messages ?? [];
  const streaming = currentId ? isStreaming(currentId) : false;

  function handleSend(text: string) {
    if (!currentId) return;
    sendMessage(currentId, text, messages);
  }

  function handleRegenerate() {
    if (!currentId) return;
    regenerate(currentId, messages);
  }

  function handleNewChat() {
    createConversation();
    setSidebarOpen(false);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  return (
    <div className="flex h-dvh bg-canvas">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 -translate-x-full transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : ""
        }`}
      >
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelect}
          onCreate={handleNewChat}
          onRename={renameConversation}
          onDelete={deleteConversation}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
          <button onClick={() => setSidebarOpen((v) => !v)} className="text-muted hover:text-foreground" aria-label="Toggle sidebar">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="truncate text-sm font-medium text-foreground">
            {activeConversation?.title ?? "NVIDIA Chat"}
          </span>
        </header>

        <MessageList messages={messages} onRegenerate={handleRegenerate} />
        <ChatInput onSend={handleSend} onStop={() => currentId && stop(currentId)} isStreaming={streaming} />
      </div>
    </div>
  );
}
