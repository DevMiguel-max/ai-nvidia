import fs from "node:fs";
import path from "node:path";
import type { LoadedSkill, SkillManifest } from "./types";

/**
 * Root folder for all skills. Each subfolder is one skill:
 *
 *   skills/
 *   ├── ui-ux-pro-max/
 *   │   ├── skill.json    <- manifest (id, name, triggers, optional `run`)
 *   │   ├── SKILL.md       <- always-on content injected into the system prompt
 *   │   └── vendor/         <- (optional) whatever `run.script` needs — CSV data,
 *   │                          Python scripts, etc. Opaque to the app itself.
 *   ├── nextjs/
 *   │   ├── skill.json
 *   │   └── SKILL.md
 *   └── ...
 *
 * To add a new skill: copy a folder, edit skill.json's triggers, write
 * SKILL.md. Nothing else in the app needs to change — see skills/README.md.
 */
const SKILLS_ROOT = path.join(process.cwd(), "skills");

// Cached across requests within the same warm serverless instance —
// mirrors the pattern already used for the NVIDIA client in nvidiaClient.ts.
let cachedSkills: LoadedSkill[] | null = null;

function readManifest(skillDir: string, id: string): SkillManifest | null {
  const manifestPath = path.join(skillDir, "skill.json");
  if (!fs.existsSync(manifestPath)) {
    console.warn(`[skills] "${id}" has no skill.json — skipping.`);
    return null;
  }

  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SkillManifest>;

    if (!Array.isArray(parsed.triggers) || parsed.triggers.length === 0) {
      console.warn(`[skills] "${id}" has no triggers — skipping.`);
      return null;
    }

    return {
      id,
      name: parsed.name ?? id,
      description: parsed.description ?? "",
      triggers: parsed.triggers,
      priority: parsed.priority ?? 0,
      run: parsed.run,
    };
  } catch (error) {
    console.error(`[skills] Failed to parse skill.json for "${id}":`, error);
    return null;
  }
}

function loadSkill(id: string): LoadedSkill | null {
  const skillDir = path.join(SKILLS_ROOT, id);
  const manifest = readManifest(skillDir, id);
  if (!manifest) return null;

  const skillMdPath = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    console.warn(`[skills] "${id}" has no SKILL.md — skipping.`);
    return null;
  }

  const content = fs.readFileSync(skillMdPath, "utf-8").trim();
  if (!content) {
    console.warn(`[skills] "${id}"'s SKILL.md is empty — skipping.`);
    return null;
  }

  return { ...manifest, content };
}

/** Loads (and caches) every valid skill under /skills. Never throws — a
 *  broken skill folder is logged and skipped, not fatal to the request. */
export function loadAllSkills(): LoadedSkill[] {
  if (cachedSkills) return cachedSkills;

  if (!fs.existsSync(SKILLS_ROOT)) {
    cachedSkills = [];
    return cachedSkills;
  }

  const entries = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true });
  const skills: LoadedSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skill = loadSkill(entry.name);
    if (skill) skills.push(skill);
  }

  cachedSkills = skills;
  return skills;
}

/** Dev-only escape hatch: call this if you edit skill.json/SKILL.md and
 *  want changes picked up without restarting the dev server. */
export function clearSkillsCache(): void {
  cachedSkills = null;
}
