import type { Driver, DrivingMode, PitStopPlan, TireCompound, Track } from "./types";

export interface InitialStrategy {
  startingCompound: TireCompound;
  pitPlan: PitStopPlan[];
  drivingMode: DrivingMode;
}

/**
 * Phase 1 AI: fixed-but-varied heuristic strategy per driver, decided once
 * before the race starts (no in-race reactions yet — that's Phase 3).
 *
 * More aggressive drivers lean toward softer tires and more stops; the rest
 * take a steadier 1-stop approach. A little randomness keeps the grid varied.
 */
export function generateAIStrategy(driver: Driver, track: Track, random: () => number = Math.random): InitialStrategy {
  const aggressive = driver.stats.aggression >= 65;
  const twoStop = aggressive ? random() < 0.65 : random() < 0.25;

  const startingCompound: TireCompound = aggressive ? "soft" : random() < 0.5 ? "medium" : "soft";

  const drivingMode: DrivingMode = aggressive ? "push" : random() < 0.3 ? "conserve" : "balanced";

  const pitPlan: PitStopPlan[] = [];
  if (twoStop) {
    const firstWindow = Math.round(track.totalLaps * (0.3 + random() * 0.08));
    const secondWindow = Math.round(track.totalLaps * (0.65 + random() * 0.08));
    pitPlan.push({ lap: firstWindow, compound: "medium" });
    pitPlan.push({ lap: secondWindow, compound: random() < 0.5 ? "medium" : "hard" });
  } else {
    const window = Math.round(track.totalLaps * (0.45 + random() * 0.1));
    pitPlan.push({ lap: window, compound: "hard" });
  }

  return { startingCompound, pitPlan, drivingMode };
}
