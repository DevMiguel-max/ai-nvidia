import type { LoadedSkill, SkillMatch } from "./types";

/** Lowercases and strips accents so "é" / "e" and "UI" / "ui" match the same. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True if `trigger` appears in `normalizedText` as a whole word/phrase —
 * not merely as a substring. Without this, a short trigger like "ui" would
 * match inside unrelated words (e.g. Portuguese "construir").
 */
function containsTrigger(normalizedText: string, trigger: string): boolean {
  const normalizedTrigger = normalize(trigger);
  if (!normalizedTrigger) return false;
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTrigger)}([^a-z0-9]|$)`, "i");
  return pattern.test(normalizedText);
}

/**
 * Returns every skill with at least one matching trigger, ranked by hit
 * count (most-matched first) and then by declared priority.
 */
export function matchSkills(skills: LoadedSkill[], userMessage: string): SkillMatch[] {
  const normalizedText = normalize(userMessage);
  if (!normalizedText.trim()) return [];

  const matches: SkillMatch[] = [];

  for (const skill of skills) {
    const hitCount = skill.triggers.reduce(
      (count, trigger) => count + (containsTrigger(normalizedText, trigger) ? 1 : 0),
      0
    );
    if (hitCount > 0) matches.push({ ...skill, hitCount });
  }

  return matches.sort((a, b) => {
    if (b.hitCount !== a.hitCount) return b.hitCount - a.hitCount;
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
}
