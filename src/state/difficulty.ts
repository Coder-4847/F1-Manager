import type { Difficulty } from "../sim/difficulty";

const DIFFICULTY_KEY = "f1-manager-difficulty-v1";

export function saveDifficulty(difficulty: Difficulty): void {
  try {
    localStorage.setItem(DIFFICULTY_KEY, difficulty);
  } catch {
    // Storage can be unavailable (private browsing, quota) — saving is best-effort.
  }
}

/** Reads the stored difficulty, defaulting to "normal" if none was ever chosen. */
export function loadDifficulty(): Difficulty {
  try {
    const raw = localStorage.getItem(DIFFICULTY_KEY);
    if (raw === "easy" || raw === "normal" || raw === "hard") return raw;
    return "normal";
  } catch {
    return "normal";
  }
}
