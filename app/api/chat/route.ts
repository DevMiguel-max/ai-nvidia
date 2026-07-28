import { NextRequest } from "next/server";
import { getNvidiaClient } from "@/lib/nvidiaClient";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { buildSkillContext } from "@/lib/skills";
import { ThinkTagSplitter } from "@/lib/thinkTagSplitter";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";
import {
  NVIDIA_MODEL,
  MAX_TOKENS,
  REASONING_BUDGET,
  TEMPERATURE,
  TOP_P,
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES_PER_REQUEST,
  NVIDIA_REQUEST_TIMEOUT_MS,
} from "@/lib/constants";
import type { ApiChatRequestMessage } from "@/types/chat";

export const runtime = "nodejs";
// Reasoning + generation can legitimately run long (up to 16k reasoning +
// 16k output tokens). Raise this if responses get cut off, within whatever
// ceiling your Vercel plan allows for function duration.
export const maxDuration = 300;

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function encodeEvent(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

function lastUserMessageContent(messages: ApiChatRequestMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === "user") return message.content;
  }
  return "";
}

function validateMessages(value: unknown): { valid: true; messages: ApiChatRequestMessage[] } | { valid: false; reason: string } {
  if (!Array.isArray(value)) return { valid: false, reason: "messages must be an array" };
  if (value.length === 0) return { valid: false, reason: "messages array is empty" };
  if (value.length > MAX_MESSAGES_PER_REQUEST) {
    return { valid: false, reason: `too many messages (${value.length} > ${MAX_MESSAGES_PER_REQUEST})` };
  }

  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== "object" || item === null) {
      return { valid: false, reason: `message[${i}] is not an object` };
    }
    const role = (item as Record<string, unknown>).role;
    const content = (item as Record<string, unknown>).content;
    if (role !== "user" && role !== "assistant") {
      return { valid: false, reason: `message[${i}] has invalid role: ${JSON.stringify(role)}` };
    }
    if (typeof content !== "string") {
      return { valid: false, reason: `message[${i}] content is not a string (got ${typeof content})` };
    }
    if (content.length === 0) {
      return { valid: false, reason: `message[${i}] content is empty` };
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return { valid: false, reason: `message[${i}] content too long (${content.length} > ${MAX_MESSAGE_LENGTH})` };
    }
  }

  return { valid: true, messages: value as ApiChatRequestMessage[] };
}

export async function POST(request: NextRequest) {
  const clientKey = getClientKey(request);
  const { allowed } = checkRateLimit(clientKey);
  if (!allowed) {
    return jsonError("Too many requests. Please slow down.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const rawMessages = (body as { messages?: unknown } | null)?.messages;
  const validation = validateMessages(rawMessages);
  if (!validation.valid) {
    console.error("Invalid /api/chat payload:", validation.reason);
    return jsonError(`Invalid message format: ${validation.reason}`, 400);
  }
  const messages = validation.messages;

  let client: ReturnType<typeof getNvidiaClient>;
  try {
    client = getNvidiaClient();
  } catch (error) {
    console.error("NVIDIA client init error:", error);
    return jsonError("Service temporarily unavailable.", 503);
  }

  // Native Skills system: if the latest user message matches a skill's
  // triggers (e.g. UI/UX, Next.js), its SKILL.md — and, for skills that
  // declare one, a per-request dynamic recommendation from its own
  // script — gets appended to the system prompt below. No-op (and cheap)
  // when nothing matches. See lib/skills/ and skills/README.md.
  let skillContext: string | null = null;
  try {
    skillContext = await buildSkillContext(lastUserMessageContent(messages));
  } catch (error) {
    console.error("Skill detection error (continuing without it):", error);
  }
  const systemPrompt = skillContext ? `${SYSTEM_PROMPT}\n\n---\n\n${skillContext}` : SYSTEM_PROMPT;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (event: Record<string, unknown>) => {
        if (!closed) controller.enqueue(encodeEvent(event));
      };

      // Only used if the API ever stops sending an explicit reasoning_content
      // field and inlines <think> tags in `content` instead. See lib/thinkTagSplitter.ts.
      const splitter = new ThinkTagSplitter();
      let sawExplicitReasoningField = false;

      try {
        // NVIDIA-specific fields (chat_template_kwargs, reasoning_budget) aren't
        // modeled by the official SDK's types. They map 1:1 to Python's
        // `extra_body`, which merges into the top-level JSON body rather than
        // nesting under an "extra_body" key — so we build the exact wire shape
        // by hand and cast once at the SDK boundary.
        const requestBody = {
          model: NVIDIA_MODEL,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: TEMPERATURE,
          top_p: TOP_P,
          max_tokens: MAX_TOKENS,
          stream: true as const,
          chat_template_kwargs: { enable_thinking: true },
          reasoning_budget: REASONING_BUDGET,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const completion = await client.chat.completions.create(requestBody as any);

        // Watchdog: NVIDIA's NIM endpoint for this model has a known failure
        // mode where the reasoning trace exhausts its token budget without
        // ever producing a content delta, and the stream is left open with
        // no further chunks and no closing event (see lib/nvidiaClient.ts).
        // The SDK's own `timeout` option covers the initial request, but a
        // plain `for await` gives it no way to bail out of a `.next()` call
        // that's already pending — a flag checked only between iterations
        // would never be reached in that case. So instead we race each
        // `.next()` against an idle timer, reset on every chunk received.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const iterator = (completion as any)[Symbol.asyncIterator]();
        let timedOut = false;

        function nextWithTimeout(): Promise<{ done?: boolean; value?: unknown; __timedOut?: true }> {
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              resolve({ __timedOut: true });
            }, NVIDIA_REQUEST_TIMEOUT_MS);
            iterator.next().then(
              (result: { done?: boolean; value?: unknown }) => {
                clearTimeout(timer);
                resolve(result);
              },
              (err: unknown) => {
                clearTimeout(timer);
                reject(err);
              }
            );
          });
        }

        while (true) {
          const result = await nextWithTimeout();
          if (result.__timedOut) {
            timedOut = true;
            break;
          }
          if (result.done) break;

          const chunk = result.value;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const delta = (chunk as any)?.choices?.[0]?.delta;
          if (!delta) continue;

          const reasoningPiece: string | undefined = delta.reasoning_content;
          if (typeof reasoningPiece === "string" && reasoningPiece.length > 0) {
            sawExplicitReasoningField = true;
            safeEnqueue({ type: "reasoning", delta: reasoningPiece });
          }

          if (typeof delta.content === "string" && delta.content.length > 0) {
            if (sawExplicitReasoningField) {
              safeEnqueue({ type: "content", delta: delta.content });
            } else {
              const { reasoning, content } = splitter.push(delta.content);
              if (reasoning) safeEnqueue({ type: "reasoning", delta: reasoning });
              if (content) safeEnqueue({ type: "content", delta: content });
            }
          }
        }

        if (timedOut) {
          console.error("NVIDIA streaming error: idle timeout, no chunk received in time");
          safeEnqueue({
            type: "error",
            message:
              "The model stopped responding mid-stream (a known issue with this model's reasoning mode). Please try again \u2014 a shorter prompt or fewer turns may help.",
          });
        } else {
          safeEnqueue({ type: "done" });
        }
      } catch (error) {
        console.error("NVIDIA streaming error:", error);
        const isTimeout =
          error instanceof Error &&
          (error.name === "APIConnectionTimeoutError" || /timeout/i.test(error.message));
        safeEnqueue({
          type: "error",
          message: isTimeout
            ? "The model took too long to respond (a known issue with this model's reasoning mode). Please try again."
            : "The assistant is unavailable right now. Please try again.",
        });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
