export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

/** Multiplies AI cars' effective pace — below 1 slows them down, above 1 speeds them up.
 *  The player's own car is never affected. Baked into RaceState at setupRace time so a
 *  race's difficulty stays fixed once it starts, even if the setting changes mid-season. */
export const AI_SPEED_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.8,
  normal: 1,
  hard: 1.2,
};
