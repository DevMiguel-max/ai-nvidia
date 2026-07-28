import OpenAI from "openai";
import { NVIDIA_BASE_URL, NVIDIA_REQUEST_TIMEOUT_MS } from "./constants";

let cachedClient: OpenAI | null = null;

/**
 * Lazily constructs the NVIDIA-configured OpenAI client. Never import this
 * from client components — it reads a server-only secret.
 *
 * IMPORTANT: `timeout` is set explicitly. NVIDIA's NIM endpoint for
 * reasoning models (confirmed for nemotron-3-ultra-550b-a55b, see
 * https://github.com/anomalyco/opencode/issues/34026 and NVIDIA's own docs
 * on this model) can occasionally enter a state where the reasoning trace
 * exhausts its token budget without ever producing a `content` delta, and
 * the connection is left open with no further data and no closing event.
 * Without a client-side timeout, both `client.chat.completions.create` and
 * any `for await` loop consuming it hang indefinitely — this is NOT
 * something retries or code changes on our side can fix; it's the
 * documented failure mode of the model/backend itself. The timeout here is
 * the only thing that turns "hangs forever" into "fails after N seconds",
 * which the route below turns into a visible error instead of a frozen UI.
 */
export function getNvidiaClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  cachedClient = new OpenAI({
    apiKey,
    baseURL: NVIDIA_BASE_URL,
    timeout: NVIDIA_REQUEST_TIMEOUT_MS,
    maxRetries: 0, // retries on a streaming call would duplicate partial output; the route handles the failure explicitly instead
  });
  return cachedClient;
}
