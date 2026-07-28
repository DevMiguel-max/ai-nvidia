"use client";
import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { generateId } from "@/utils/generateId";
import { generateTitle } from "@/utils/generateTitle";
import { STORAGE_KEY_CONVERSATIONS, STORAGE_KEY_ACTIVE_ID } from "@/lib/constants";
import type { Conversation, ChatMessage } from "@/types/chat";

export function useConversations() {
  const [conversations, setConversations, hydrated] = useLocalStorage<Conversation[]>(
    STORAGE_KEY_CONVERSATIONS,
    []
  );
  const [activeId, setActiveId] = useLocalStorage<string | null>(STORAGE_KEY_ACTIVE_ID, null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const createConversation = useCallback((): Conversation => {
    const now = Date.now();
    const conversation: Conversation = {
      id: generateId(),
      title: "New conversation",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setConversations((prev) => [conversation, ...prev]);
    setActiveId(conversation.id);
    return conversation;
  }, [setConversations, setActiveId]);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveId((current) => (current === id ? null : current));
    },
    [setConversations, setActiveId]
  );

  const renameConversation = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c))
      );
    },
    [setConversations]
  );

  const updateMessages = useCallback(
    (id: string, updater: (messages: ChatMessage[]) => ChatMessage[]) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const messages = updater(c.messages);
          const firstMessage = messages[0];
          const shouldAutoTitle =
            c.title === "New conversation" && firstMessage !== undefined && firstMessage.role === "user";
          return {
            ...c,
            messages,
            title: shouldAutoTitle && firstMessage ? generateTitle(firstMessage.content) : c.title,
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setConversations]
  );

  return {
    conversations,
    activeConversation,
    activeId,
    hydrated,
    setActiveId,
    createConversation,
    deleteConversation,
    renameConversation,
    updateMessages,
  };
}
