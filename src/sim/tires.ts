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
};

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
