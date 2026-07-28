// NVIDIA Integrate API
export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

export const TEMPERATURE = 1;
export const TOP_P = 0.95;
export const MAX_TOKENS = 16384;
// Lower than the 16384 max. NVIDIA's own docs for this model note that an
// excessively long reasoning trace can exhaust the full budget and return
// an empty response (see get-started-nemotron-3-ultra.html). A smaller
// budget reduces the odds of the model spiraling in "thinking" without ever
// reaching content, at the cost of shorter reasoning traces. Raise this again
// if you find it's cutting off reasoning you actually need.
export const REASONING_BUDGET = 8192;

// How long to wait for the NVIDIA API before giving up and surfacing an
// error. Production logs showed a genuine 200 response taking close to 5
// minutes (this model's reasoning mode can be very slow, not just
// occasionally stuck) — so this needs to tolerate real latency, not just
// guard against a truly dead connection. Only fires on genuine inactivity
// (reset on every chunk received), not on total response time.
export const NVIDIA_REQUEST_TIMEOUT_MS = 280_000;

// How long the *browser* will wait without receiving a single new SSE event
// before treating the connection as dead. Kept slightly above the server
// value so the server-side error (with a specific message) reaches the
// user first in the common case.
export const CLIENT_STREAM_IDLE_TIMEOUT_MS = 290_000;

// Session / auth
export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Rate limiting (in-memory, per warm serverless instance — see lib/rateLimit.ts)
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

// Request validation
export const MAX_MESSAGE_LENGTH = 250_000; // characters per message
export const MAX_MESSAGES_PER_REQUEST = 200;

// Client-side storage keys (localStorage)
export const STORAGE_KEY_CONVERSATIONS = "nvidia-chat:conversations";
export const STORAGE_KEY_ACTIVE_ID = "nvidia-chat:active-id";
