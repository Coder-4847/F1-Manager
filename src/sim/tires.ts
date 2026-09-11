import type { TireCompound, TireCompoundDef } from "./types";

// Degradation curves are deliberately simple for Phase 1: lap time penalty grows
// with tire age via a linear + quadratic term. Tuned for "feels reasonable", not
// real telemetry.

export const tireCompounds: Record<TireCompound, TireCompoundDef> = {
  soft: {
    compound: "soft",
    paceDeltaSeconds: -0.6,
    degradationPerLap: 0.09,
    degradationGrowth: 0.004,
  },
  medium: {
    compound: "medium",
    paceDeltaSeconds: 0,
    degradationPerLap: 0.06,
    degradationGrowth: 0.002,
  },
  hard: {
    compound: "hard",
    paceDeltaSeconds: 0.5,
    degradationPerLap: 0.035,
    degradationGrowth: 0.001,
  },
  // Wet-weather compounds: paceDeltaSeconds here is their inherent delta *in the right
  // conditions* — how much slower conditions are in general comes from
  // weatherBaseLapPenaltySeconds(), and running them in the wrong conditions comes from
  // tireWeatherPenaltySeconds() (see weather.ts). Both are on top of this base number.
  intermediate: {
    compound: "intermediate",
    paceDeltaSeconds: 0.2,
    degradationPerLap: 0.05,
    degradationGrowth: 0.0015,
  },
  wet: {
    compound: "wet",
    paceDeltaSeconds: 0.8,
    degradationPerLap: 0.04,
    degradationGrowth: 0.001,
  },
};

/**
 * Reference lap count at which a compound is considered "fully worn" for display
 * purposes only — does not affect lap time math, just how the UI wear bar fills.
 */
const DISPLAY_WEAR_REFERENCE_LAPS: Record<TireCompound, number> = {
  soft: 20,
  medium: 28,
  hard: 38,
  intermediate: 25,
  wet: 30,
};

/** 0-100 wear percentage for UI display, based on tire age vs. a reference stint length. */
export function tireWearPercent(compound: TireCompound, tireAge: number): number {
  const reference = DISPLAY_WEAR_REFERENCE_LAPS[compound];
  return Math.min(100, Math.round((tireAge / reference) * 100));
}

/**
 * Lap time penalty (seconds) from tire wear at a given tire age (laps on this set).
 * `wearFactor` scales for track severity (0-1+), `managementFactor` scales down
 * wear for well-managed tires (derived from driver.tireManagement, 0-1 where
 * 1 = no reduction, lower = less wear).
 */
export function tireWearPenalty(
  compound: TireCompound,
  tireAge: number,
  trackWearFactor: number,
  managementFactor: number
): number {
  const def = tireCompounds[compound];
  const linear = def.degradationPerLap * tireAge;
  const quadratic = def.degradationGrowth * tireAge * tireAge;
  return (linear + quadratic) * trackWearFactor * managementFactor;
}
