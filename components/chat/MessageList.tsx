"use client";
import { MessageBubble } from "./MessageBubble";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import type { ChatMessage } from "@/types/chat";

interface MessageListProps {
  messages: ChatMessage[];
  onRegenerate: () => void;
}

export function MessageList({ messages, onRegenerate }: MessageListProps) {
  const lastMessage = messages[messages.length - 1];
  const scrollDependency = `${messages.length}:${lastMessage?.content.length ?? 0}:${lastMessage?.reasoning?.length ?? 0}`;
  const containerRef = useAutoScroll(scrollDependency);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <div>
          <p className="font-mono text-lg text-foreground">How can I help?</p>
          <p className="mt-1 text-sm text-muted">Ask anything to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={index === messages.length - 1 && message.role === "assistant"}
            onRegenerate={index === messages.length - 1 ? onRegenerate : undefined}
          />
        ))}
      </div>
    </div>
  );
}
