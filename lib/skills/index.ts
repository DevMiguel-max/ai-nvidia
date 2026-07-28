import { loadAllSkills } from "./registry";
import { matchSkills } from "./detect";
import { runSkillScript } from "./runSkill";
import type { SkillMatch } from "./types";

// Cap how many skills can stack onto one request, and how much of the raw
// message gets forwarded as a search query — keeps token/latency cost
// bounded even if a message somehow matches many skills at once.
const MAX_ACTIVE_SKILLS = 2;
const MAX_QUERY_LENGTH = 300;

function buildQuery(userMessage: string): string {
  return userMessage.trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * Detects which skills apply to the user's latest message, runs any
 * executable ones for a per-request dynamic recommendation, and returns a
 * single block of text ready to append to the system prompt sent to
 * NVIDIA — or null if nothing matched.
 */
export async function buildSkillContext(userMessage: string): Promise<string | null> {
  const skills = loadAllSkills();
  if (skills.length === 0) return null;

  const matches: SkillMatch[] = matchSkills(skills, userMessage).slice(0, MAX_ACTIVE_SKILLS);
  if (matches.length === 0) return null;

  const query = buildQuery(userMessage);

  const sections = await Promise.all(
    matches.map(async (skill) => {
      const dynamic = await runSkillScript(skill, query);
      const parts = [skill.content];
      if (dynamic) {
        parts.push(`### Dynamic recommendation for this request\n\n${dynamic}`);
      }
      return parts.join("\n\n");
    })
  );

  return sections.join("\n\n---\n\n");
}
