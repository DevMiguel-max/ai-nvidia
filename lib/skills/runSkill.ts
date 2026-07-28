import { execFile } from "node:child_process";
import path from "node:path";
import type { LoadedSkill } from "./types";

const SKILLS_ROOT = path.join(process.cwd(), "skills");
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_BUFFER_BYTES = 1024 * 1024; // 1MB — these scripts print a few KB at most

function buildArgs(template: string[], query: string): string[] {
  return template.map((arg) => (arg === "{query}" ? query : arg));
}

function runOnce(interpreter: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      interpreter,
      args,
      { timeout: timeoutMs, maxBuffer: MAX_BUFFER_BYTES },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr.trim()) {
          console.warn(`[skills] stderr from "${interpreter} ${args[0]}":`, stderr.slice(0, 500));
        }
        resolve(stdout);
      }
    );
  });
}

/**
 * Runs a skill's configured script (if any) with the given query and
 * returns its trimmed stdout — or null if the skill has no `run` config,
 * no configured interpreter is available, or execution fails/times out.
 *
 * Never throws: a missing Python install, a script bug, or a slow query
 * degrades to "no dynamic recommendation this time" rather than failing
 * the whole chat request. The skill's static SKILL.md content still gets
 * injected either way.
 */
export async function runSkillScript(skill: LoadedSkill, query: string): Promise<string | null> {
  if (!skill.run) return null;

  const scriptPath = path.join(SKILLS_ROOT, skill.id, skill.run.script);
  const args = [scriptPath, ...buildArgs(skill.run.args, query)];
  const timeoutMs = skill.run.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const interpreters = [skill.run.interpreter, skill.run.fallbackInterpreter].filter(
    (value): value is string => Boolean(value)
  );

  for (const interpreter of interpreters) {
    try {
      const stdout = await runOnce(interpreter, args, timeoutMs);
      const trimmed = stdout.trim();
      if (trimmed) return trimmed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[skills:${skill.id}] "${interpreter}" failed, trying next option:`, message);
    }
  }

  console.warn(`[skills:${skill.id}] no working interpreter for this request — using static SKILL.md only.`);
  return null;
}
