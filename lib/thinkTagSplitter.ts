/**
 * NVIDIA's API separates reasoning into `delta.reasoning_content` (confirmed
 * against their own docs), so this class is not on the primary path — the
 * route only reaches for it if a stream never emits `reasoning_content` and
 * `content` starts with a literal `<think>` tag instead. Cheap insurance
 * against a future serving change, not a guess we depend on.
 *
 * Only handles a single leading think-block (reasoning happens once, up
 * front, before the real answer) — that's the actual shape these chat
 * templates produce, so a full multi-block state machine would be
 * complexity with no real scenario behind it.
 */
export class ThinkTagSplitter {
  private buffer = "";
  private mode: "detecting" | "reasoning" | "content" = "detecting";
  private static readonly OPEN = "<think>";
  private static readonly CLOSE = "</think>";

  push(text: string): { reasoning?: string; content?: string } {
    if (this.mode === "content") return { content: text };

    this.buffer += text;

    if (this.mode === "detecting") {
      if (this.buffer.length < ThinkTagSplitter.OPEN.length) {
        return {};
      }
      if (this.buffer.startsWith(ThinkTagSplitter.OPEN)) {
        this.mode = "reasoning";
        this.buffer = this.buffer.slice(ThinkTagSplitter.OPEN.length);
      } else {
        const held = this.buffer;
        this.mode = "content";
        this.buffer = "";
        return { content: held };
      }
    }

    if (this.mode === "reasoning") {
      const closeIdx = this.buffer.indexOf(ThinkTagSplitter.CLOSE);
      if (closeIdx === -1) {
        // Hold back a tail as long as the close tag, in case it's split across chunks.
        const safeLength = Math.max(0, this.buffer.length - ThinkTagSplitter.CLOSE.length);
        const emit = this.buffer.slice(0, safeLength);
        this.buffer = this.buffer.slice(safeLength);
        return emit ? { reasoning: emit } : {};
      }
      const reasoning = this.buffer.slice(0, closeIdx);
      const rest = this.buffer.slice(closeIdx + ThinkTagSplitter.CLOSE.length);
      this.mode = "content";
      this.buffer = "";
      return {
        reasoning: reasoning || undefined,
        content: rest || undefined,
      };
    }

    return {};
  }
}
