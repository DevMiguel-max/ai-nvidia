export type MessageRole = "user" | "assistant";
export type MessageStatus = "streaming" | "complete" | "error" | "stopped";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Reasoning / "thinking" trace for assistant messages, when present. */
  reasoning?: string;
  status: MessageStatus;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/** Shape sent to POST /api/chat. Only role + content ever leave the browser. */
export interface ApiChatRequestMessage {
  role: MessageRole;
  content: string;
}

export type ChatStreamEvent =
  | { type: "reasoning"; delta: string }
  | { type: "content"; delta: string }
  | { type: "done" }
  | { type: "error"; message: string };
