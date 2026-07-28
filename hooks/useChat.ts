"use client";
import { useCallback, useRef, useState } from "react";
import { generateId } from "@/utils/generateId";
import { CLIENT_STREAM_IDLE_TIMEOUT_MS } from "@/lib/constants";
import type { ChatMessage, ChatStreamEvent } from "@/types/chat";

type UpdateMessages = (id: string, updater: (messages: ChatMessage[]) => ChatMessage[]) => void;

export function useChat({ updateMessages }: { updateMessages: UpdateMessages }) {
  const [streamingIds, setStreamingIds] = useState<Set<string>>(new Set());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const markStreaming = useCallback((id: string, streaming: boolean) => {
    setStreamingIds((prev) => {
      const next = new Set(prev);
      if (streaming) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const streamAssistantReply = useCallback(
    async (conversationId: string, history: ChatMessage[]) => {
      const assistantId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        reasoning: "",
        status: "streaming",
        createdAt: Date.now(),
      };
      updateMessages(conversationId, (prev) => [...prev, assistantMessage]);

      const controller = new AbortController();
      controllersRef.current.set(conversationId, controller);
      markStreaming(conversationId, true);

      try {
        // Guard against a corrupted history reaching the API silently as a
        // 400. If any message lost its role/content (e.g. from a stray
        // re-render bug), fail loud with a clear reason instead of letting
        // the server reject it and the user see a blank "something went
        // wrong" with no clue why.
        const sanitizedHistory = history.filter(
          (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length > 0
        );
        if (sanitizedHistory.length === 0) {
          throw new Error("No valid messages to send \u2014 the conversation state looks corrupted. Try reloading the page.");
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: sanitizedHistory.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data.error ? `${data.error} (HTTP ${response.status})` : `Request failed (HTTP ${response.status}).`
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let sawDoneEvent = false;
        let sawErrorEvent = false;

        // Watchdog: even with the server-side timeout in app/api/chat/route.ts,
        // this is a second, independent safety net. If a chunk never arrives
        // (a misbehaving proxy, a half-open connection, or any failure mode
        // the server-side guard doesn't catch), `reader.read()` awaits
        // forever with no rejection and no resolution — there is nothing
        // else to break the loop. Without this, `isStreaming` for this
        // conversation stays true forever, the send button stays locked into
        // "stop", and the user can't send another message without a page
        // reload. This is the exact symptom reported for this model/endpoint
        // (see lib/nvidiaClient.ts for the underlying NVIDIA-side cause).
        const readChunkWithTimeout = (): Promise<
          ReadableStreamReadResult<Uint8Array> | { __timedOut: true }
        > =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              resolve({ __timedOut: true });
            }, CLIENT_STREAM_IDLE_TIMEOUT_MS);
            reader.read().then(
              (result) => {
                clearTimeout(timer);
                resolve(result);
              },
              (err) => {
                clearTimeout(timer);
                reject(err);
              }
            );
          });

        while (true) {
          const result = await readChunkWithTimeout();
          if ("__timedOut" in result) {
            reader.cancel().catch(() => {});
            updateMessages(conversationId, (prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      status: "error",
                      content:
                        m.content ||
                        "The connection went silent (a known issue with this model's reasoning mode). Please try again.",
                    }
                  : m
              )
            );
            sawErrorEvent = true;
            break;
          }

          const { done, value } = result;
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            let event: ChatStreamEvent;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            if (event.type === "reasoning") {
              updateMessages(conversationId, (prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, reasoning: (m.reasoning ?? "") + event.delta } : m
                )
              );
            } else if (event.type === "content") {
              updateMessages(conversationId, (prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.delta } : m))
              );
            } else if (event.type === "error") {
              sawErrorEvent = true;
              updateMessages(conversationId, (prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, status: "error", content: m.content || event.message } : m
                )
              );
            } else if (event.type === "done") {
              sawDoneEvent = true;
            }
          }

          if (sawDoneEvent || sawErrorEvent) break;
        }

        if (!sawErrorEvent) {
          updateMessages(conversationId, (prev) =>
            prev.map((m) =>
              m.id === assistantId && m.status === "streaming" ? { ...m, status: "complete" } : m
            )
          );
        }
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
        updateMessages(conversationId, (prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  status: aborted ? "stopped" : "error",
                  content: m.content || (aborted ? "" : message),
                }
              : m
          )
        );
      } finally {
        markStreaming(conversationId, false);
        controllersRef.current.delete(conversationId);
      }
    },
    [updateMessages, markStreaming]
  );

  const sendMessage = useCallback(
    (conversationId: string, text: string, currentMessages: ChatMessage[]) => {
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text,
        status: "complete",
        createdAt: Date.now(),
      };
      const nextHistory = [...currentMessages, userMessage];
      updateMessages(conversationId, () => nextHistory);
      void streamAssistantReply(conversationId, nextHistory);
    },
    [updateMessages, streamAssistantReply]
  );

  const regenerate = useCallback(
    (conversationId: string, currentMessages: ChatMessage[]) => {
      const reversedIndex = [...currentMessages].reverse().findIndex((m) => m.role === "user");
      if (reversedIndex === -1) return;
      const cutoff = currentMessages.length - reversedIndex;
      const history = currentMessages.slice(0, cutoff);
      updateMessages(conversationId, () => history);
      void streamAssistantReply(conversationId, history);
    },
    [updateMessages, streamAssistantReply]
  );

  const stop = useCallback((conversationId: string) => {
    controllersRef.current.get(conversationId)?.abort();
  }, []);

  const isStreaming = useCallback((conversationId: string) => streamingIds.has(conversationId), [streamingIds]);

  return { sendMessage, regenerate, stop, isStreaming };
}
