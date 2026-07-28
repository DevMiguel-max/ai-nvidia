const MAX_TITLE_LENGTH = 42;

export function generateTitle(firstUserMessage: string): string {
  const firstLine = firstUserMessage.split("\n")[0]?.trim() ?? "";
  const cleaned = firstLine.replace(/[#*`_>~]/g, "").trim();

  if (cleaned.length === 0) return "New conversation";
  if (cleaned.length <= MAX_TITLE_LENGTH) return cleaned;
  return `${cleaned.slice(0, MAX_TITLE_LENGTH).trim()}…`;
}
