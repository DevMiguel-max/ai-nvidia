import { MAX_MESSAGE_LENGTH } from "@/lib/constants";

export function sanitizeUserInput(raw: string): string {
  return raw.trim().slice(0, MAX_MESSAGE_LENGTH);
}
