/**
 * A Skill = one folder under /skills with a skill.json manifest and a
 * SKILL.md file. The manifest declares *when* the skill should fire
 * (triggers). SKILL.md is always injected into the system prompt when the
 * skill matches — for a purely static skill that's the whole story.
 *
 * A skill can optionally also declare `run`: a script to execute with the
 * user's message as a query, whose stdout is appended *after* SKILL.md as
 * a per-request "dynamic recommendation". This is how ui-ux-pro-max plugs
 * its Python/CSV search engine in without the app needing to know
 * anything about design data — it just runs the script and forwards the
 * text. If the script fails, is missing, or times out, the request still
 * proceeds with SKILL.md alone (see lib/skills/runSkill.ts).
 */
export interface SkillRunConfig {
  /** Primary interpreter/binary to invoke, e.g. "python3". */
  interpreter: string;
  /** Tried if `interpreter` isn't found — e.g. "python" on Windows. */
  fallbackInterpreter?: string;
  /** Path to the script, relative to the skill's own folder. */
  script: string;
  /**
   * Argument template passed to the script. The literal token "{query}"
   * is replaced with the derived search query at call time.
   */
  args: string[];
  /** Kill the process if it hasn't finished after this long. Default 8000. */
  timeoutMs?: number;
}

export interface SkillManifest {
  /** Folder name — must match the directory under /skills. */
  id: string;
  /** Human-readable name, shown only in logs/debugging. */
  name: string;
  /** Short description — not sent to the model, just for maintainers. */
  description: string;
  /**
   * Words/phrases that trigger this skill. Matched case-insensitively,
   * accent-insensitively, on word boundaries, against the user's latest
   * message. Multi-word triggers (e.g. "design system") are matched as a
   * contiguous phrase.
   */
  triggers: string[];
  /**
   * Higher priority wins when the active-skill budget forces a choice
   * between multiple matched skills. Default 0.
   */
  priority?: number;
  /** Present => this skill also runs a script for a dynamic recommendation. */
  run?: SkillRunConfig;
}

export interface LoadedSkill extends SkillManifest {
  /** Raw content of SKILL.md — always injected verbatim when this skill fires. */
  content: string;
}

export interface SkillMatch extends LoadedSkill {
  /** How many distinct triggers matched — used for ranking/logging. */
  hitCount: number;
}
